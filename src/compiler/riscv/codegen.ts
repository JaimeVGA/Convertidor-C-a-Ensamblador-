import { ExprNode, ProgramNode, StmtNode } from '../ast';
import { CompileError, createError } from '../errors';
import { fitsInImm12, VariableSymbol } from '../semantic';
import { AsmInstruction } from './encoder';
import { SupportedMnemonic } from './isa';

const TEMP_REGS = [5, 6, 7, 28, 29, 30, 31]; // 7 temporary registers

export interface CodegenResult {
  instructions: AsmInstruction[];
  errores: CompileError[];
}

export function generateRiscvCode(
  program: ProgramNode,
  variables: VariableSymbol[],
  symbolMap: Map<string, VariableSymbol>
): CodegenResult {
  const instructions: AsmInstruction[] = [];
  const errores: CompileError[] = [];
  let pendingLabels: string[] = [];
  let labelCounter = 0;

  // Pool of available temporary registers
  const usedTemps = new Set<number>();

  const allocTemp = (linea: number, columna: number): number => {
    for (const r of TEMP_REGS) {
      if (!usedTemps.has(r)) {
        usedTemps.add(r);
        return r;
      }
    }
    errores.push(
      createError(
        linea,
        columna,
        'La expresión es demasiado compleja y agotó los 7 registros temporales disponibles (x5..x7, x28..x31). Simplifícala usando una variable intermedia.'
      )
    );
    return 31;
  };

  const freeTemp = (reg: number) => {
    if (TEMP_REGS.includes(reg)) {
      usedTemps.delete(reg);
    }
  };

  const isTemp = (reg: number): boolean => TEMP_REGS.includes(reg);

  const emitLabel = (label: string) => {
    pendingLabels.push(label);
  };

  const emit = (instr: AsmInstruction) => {
    if (pendingLabels.length > 0) {
      instr.labels = [...(instr.labels ?? []), ...pendingLabels];
      pendingLabels = [];
    }
    instructions.push(instr);
  };

  /**
   * Evaluate `expr` and return the register holding its value.
   * If `targetReg` is provided, try to write directly into `targetReg` when safe.
   * If the returned register is a temporary (not a variable or x0), the caller is responsible for freeing it.
   */
  const evalExpr = (expr: ExprNode, targetReg?: number): number => {
    switch (expr.kind) {
      case 'NumberLiteral': {
        if (expr.value === 0 && targetReg === undefined) {
          return 0; // x0 directly!
        }
        const dest = targetReg ?? allocTemp(expr.linea, expr.columna);
        emit({
          mnemonic: 'ADDI',
          rd: dest,
          rs1: 0,
          imm: expr.value,
          cLine: expr.linea,
        });
        return dest;
      }

      case 'Identifier': {
        const sym = symbolMap.get(expr.name);
        if (!sym) return 0;
        if (targetReg !== undefined && targetReg !== sym.reg) {
          emit({
            mnemonic: 'ADDI',
            rd: targetReg,
            rs1: sym.reg,
            imm: 0,
            cLine: expr.linea,
          });
          return targetReg;
        }
        return sym.reg;
      }

      case 'UnaryExpr': {
        const opReg = evalExpr(expr.operand);
        const dest =
          targetReg ?? (isTemp(opReg) ? opReg : allocTemp(expr.linea, expr.columna));
        if (expr.op === '-') {
          emit({
            mnemonic: 'SUB',
            rd: dest,
            rs1: 0,
            rs2: opReg,
            cLine: expr.linea,
          });
        } else {
          // '~' bitwise NOT -> XORI dest, opReg, -1
          emit({
            mnemonic: 'XORI',
            rd: dest,
            rs1: opReg,
            imm: -1,
            cLine: expr.linea,
          });
        }
        if (opReg !== dest) freeTemp(opReg);
        return dest;
      }

      case 'BinaryExpr': {
        const { op, left, right } = expr;
        const isUnsigned =
          left.inferredType === 'unsigned' || right.inferredType === 'unsigned';

        // Check if right operand is a constant immediate we can fold into an I-type instruction
        if (right.kind === 'NumberLiteral') {
          const imm = right.value;

          // Addition with immediate: ADDI
          if (op === '+' && fitsInImm12(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            emit({ mnemonic: 'ADDI', rd: dest, rs1: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          // Subtraction with immediate: ADDI with -imm (if -imm fits in 12 bits, i.e., imm != -2048)
          if (op === '-' && fitsInImm12(-imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            emit({ mnemonic: 'ADDI', rd: dest, rs1: lReg, imm: -imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          // Bitwise ANDI, ORI, XORI
          if ((op === '&' || op === '|' || op === '^') && fitsInImm12(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: SupportedMnemonic =
              op === '&' ? 'ANDI' : op === '|' ? 'ORI' : 'XORI';
            emit({ mnemonic, rd: dest, rs1: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          // Shifts with constant shamt (0..31)
          if ((op === '<<' || op === '>>') && imm >= 0 && imm <= 31) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: SupportedMnemonic =
              op === '<<'
                ? 'SLLI'
                : left.inferredType === 'unsigned'
                ? 'SRLI'
                : 'SRAI';
            emit({ mnemonic, rd: dest, rs1: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          // Less-than immediate: SLTI / SLTIU
          if (op === '<' && fitsInImm12(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: SupportedMnemonic = isUnsigned ? 'SLTIU' : 'SLTI';
            emit({ mnemonic, rd: dest, rs1: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }
        }

        // General two-register evaluation
        let lReg = evalExpr(left);
        // Protect lReg if right side might overwrite a variable register when targetReg === lReg
        if (targetReg !== undefined && lReg === targetReg && !isTemp(lReg)) {
          const copyTemp = allocTemp(expr.linea, expr.columna);
          emit({ mnemonic: 'ADDI', rd: copyTemp, rs1: lReg, imm: 0, cLine: expr.linea });
          lReg = copyTemp;
        }
        const rReg = evalExpr(right);

        const pickDest = (): number => {
          if (targetReg !== undefined) return targetReg;
          if (isTemp(lReg)) return lReg;
          if (isTemp(rReg)) return rReg;
          return allocTemp(expr.linea, expr.columna);
        };

        const dest = pickDest();

        switch (op) {
          case '+':
          case '-':
          case '&':
          case '|':
          case '^':
          case '<<':
          case '>>': {
            const map: Record<string, SupportedMnemonic> = {
              '+': 'ADD',
              '-': 'SUB',
              '&': 'AND',
              '|': 'OR',
              '^': 'XOR',
              '<<': 'SLL',
              '>>': left.inferredType === 'unsigned' ? 'SRL' : 'SRA',
            };
            emit({
              mnemonic: map[op],
              rd: dest,
              rs1: lReg,
              rs2: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs1: lReg,
              rs2: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '>': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs1: rReg,
              rs2: lReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<=': {
            // a <= b  <=>  !(b < a)
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs1: rReg,
              rs2: lReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'XORI',
              rd: dest,
              rs1: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '>=': {
            // a >= b  <=>  !(a < b)
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs1: lReg,
              rs2: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'XORI',
              rd: dest,
              rs1: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '==': {
            // XOR dest, a, b ; SLTIU dest, dest, 1
            emit({
              mnemonic: 'XOR',
              rd: dest,
              rs1: lReg,
              rs2: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'SLTIU',
              rd: dest,
              rs1: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '!=': {
            // XOR dest, a, b ; SLTU dest, x0, dest
            emit({
              mnemonic: 'XOR',
              rd: dest,
              rs1: lReg,
              rs2: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'SLTU',
              rd: dest,
              rs1: 0,
              rs2: dest,
              cLine: expr.linea,
            });
            break;
          }
        }

        if (lReg !== dest) freeTemp(lReg);
        if (rReg !== dest) freeTemp(rReg);
        return dest;
      }
    }
  };

  /**
   * Emit an inverse conditional branch: jumps to `falseLabel` when `cond` evaluates to false.
   */
  const emitInverseBranch = (cond: ExprNode, falseLabel: string) => {
    if (
      cond.kind === 'BinaryExpr' &&
      ['==', '!=', '<', '<=', '>', '>='].includes(cond.op)
    ) {
      const { op, left, right } = cond;
      const isUnsigned =
        left.inferredType === 'unsigned' || right.inferredType === 'unsigned';

      const lReg = evalExpr(left);
      const rReg = evalExpr(right);

      switch (op) {
        case '==':
          emit({ mnemonic: 'BNE', rs1: lReg, rs2: rReg, targetLabel: falseLabel, cLine: cond.linea });
          break;
        case '!=':
          emit({ mnemonic: 'BEQ', rs1: lReg, rs2: rReg, targetLabel: falseLabel, cLine: cond.linea });
          break;
        case '<':
          emit({
            mnemonic: isUnsigned ? 'BGEU' : 'BGE',
            rs1: lReg,
            rs2: rReg,
            targetLabel: falseLabel,
            cLine: cond.linea,
          });
          break;
        case '>=':
          emit({
            mnemonic: isUnsigned ? 'BLTU' : 'BLT',
            rs1: lReg,
            rs2: rReg,
            targetLabel: falseLabel,
            cLine: cond.linea,
          });
          break;
        case '>':
          // a > b is false when a <= b, i.e., b >= a
          emit({
            mnemonic: isUnsigned ? 'BGEU' : 'BGE',
            rs1: rReg,
            rs2: lReg,
            targetLabel: falseLabel,
            cLine: cond.linea,
          });
          break;
        case '<=':
          // a <= b is false when a > b, i.e., b < a
          emit({
            mnemonic: isUnsigned ? 'BLTU' : 'BLT',
            rs1: rReg,
            rs2: lReg,
            targetLabel: falseLabel,
            cLine: cond.linea,
          });
          break;
      }

      freeTemp(lReg);
      freeTemp(rReg);
      return;
    }

    // Non-comparison condition: jump when expr == 0
    const reg = evalExpr(cond);
    emit({
      mnemonic: 'BEQ',
      rs1: reg,
      rs2: 0,
      targetLabel: falseLabel,
      cLine: cond.linea,
    });
    freeTemp(reg);
  };

  const genStmt = (stmt: StmtNode) => {
    switch (stmt.kind) {
      case 'VarDecl': {
        const sym = symbolMap.get(stmt.name)!;
        if (stmt.init === undefined) {
          emit({
            mnemonic: 'LW',
            rd: sym.reg,
            rs1: 0,
            imm: sym.ramAddr,
            cLine: stmt.linea,
            comment: `Carga entrada '${sym.name}' desde RAM[${sym.ramAddr}]`,
          });
        } else {
          const resReg = evalExpr(stmt.init, sym.reg);
          if (resReg !== sym.reg) {
            emit({
              mnemonic: 'ADDI',
              rd: sym.reg,
              rs1: resReg,
              imm: 0,
              cLine: stmt.linea,
            });
            freeTemp(resReg);
          }
        }
        break;
      }

      case 'Assign': {
        const sym = symbolMap.get(stmt.name)!;
        const resReg = evalExpr(stmt.value, sym.reg);
        if (resReg !== sym.reg) {
          emit({
            mnemonic: 'ADDI',
            rd: sym.reg,
            rs1: resReg,
            imm: 0,
            cLine: stmt.linea,
          });
          freeTemp(resReg);
        }
        break;
      }

      case 'If': {
        const id = labelCounter++;
        if (stmt.elseBranch && stmt.elseBranch.length > 0) {
          const sinoLabel = `sino_${id}`;
          const finsiLabel = `finsi_${id}`;
          emitInverseBranch(stmt.condition, sinoLabel);
          for (const s of stmt.thenBranch) genStmt(s);
          emit({
            mnemonic: 'BEQ',
            rs1: 0,
            rs2: 0,
            targetLabel: finsiLabel,
            cLine: stmt.linea,
            comment: `Salto incondicional a ${finsiLabel}`,
          });
          emitLabel(sinoLabel);
          for (const s of stmt.elseBranch) genStmt(s);
          emitLabel(finsiLabel);
        } else {
          const finsiLabel = `finsi_${id}`;
          emitInverseBranch(stmt.condition, finsiLabel);
          for (const s of stmt.thenBranch) genStmt(s);
          emitLabel(finsiLabel);
        }
        break;
      }

      case 'While': {
        const id = labelCounter++;
        const startLabel = `mientras_${id}`;
        const endLabel = `finmientras_${id}`;
        emitLabel(startLabel);
        emitInverseBranch(stmt.condition, endLabel);
        for (const s of stmt.body) genStmt(s);
        emit({
          mnemonic: 'BEQ',
          rs1: 0,
          rs2: 0,
          targetLabel: startLabel,
          cLine: stmt.linea,
          comment: `Regresa al inicio de ${startLabel}`,
        });
        emitLabel(endLabel);
        break;
      }
    }
  };

  for (const stmt of program.body) {
    genStmt(stmt);
  }

  // Epilogue: store all declared variables back to their Data Memory addresses
  for (const sym of variables) {
    emit({
      mnemonic: 'SW',
      rs1: 0,
      rs2: sym.reg,
      imm: sym.ramAddr,
      comment: `Guarda resultado '${sym.name}' (x${sym.reg}) en RAM[${sym.ramAddr}]`,
    });
  }

  // Final halt loop: fin: BEQ x0, x0, fin
  emitLabel('fin');
  emit({
    mnemonic: 'BEQ',
    rs1: 0,
    rs2: 0,
    targetLabel: 'fin',
    comment: 'Ciclo de fin (detiene el procesador)',
  });

  return { instructions, errores };
}

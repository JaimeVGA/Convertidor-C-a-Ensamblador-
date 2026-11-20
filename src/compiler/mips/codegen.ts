import { ExprNode, ProgramNode, StmtNode } from '../ast';
import { CompileError, createError } from '../errors';
import { VariableSymbol } from '../semantic';
import type { MipsArithmeticMode } from '../types';
import { MipsInstruction } from './encoder';
import { MIPS_TEMP_REGS, MipsMnemonic } from './isa';

export interface MipsCodegenResult {
  instructions: MipsInstruction[];
  errores: CompileError[];
}

function fitsInSigned16(val: number): boolean {
  return val >= -32768 && val <= 32767;
}

function fitsInUnsigned16(val: number): boolean {
  return val >= 0 && val <= 65535;
}

export function generateMipsCode(
  program: ProgramNode,
  variables: VariableSymbol[],
  symbolMap: Map<string, VariableSymbol>,
  arithmeticMode: MipsArithmeticMode = 'signed'
): MipsCodegenResult {
  const instructions: MipsInstruction[] = [];
  const errores: CompileError[] = [];
  let pendingLabels: string[] = [];
  let labelCounter = 0;

  const ADD_OP: MipsMnemonic = arithmeticMode === 'unsigned' ? 'ADDU' : 'ADD';
  const SUB_OP: MipsMnemonic = arithmeticMode === 'unsigned' ? 'SUBU' : 'SUB';
  const ADDI_OP: MipsMnemonic = arithmeticMode === 'unsigned' ? 'ADDIU' : 'ADDI';

  const usedTemps = new Set<number>();

  const allocTemp = (linea: number, columna: number): number => {
    for (const r of MIPS_TEMP_REGS) {
      if (!usedTemps.has(r)) {
        usedTemps.add(r);
        return r;
      }
    }
    errores.push(
      createError(
        linea,
        columna,
        'La expresión es demasiado compleja y agotó los 10 registros temporales disponibles ($t0..$t9). Simplifícala usando una variable intermedia.'
      )
    );
    return 25;
  };

  const freeTemp = (reg: number) => {
    if (MIPS_TEMP_REGS.includes(reg)) {
      usedTemps.delete(reg);
    }
  };

  const isTemp = (reg: number): boolean => MIPS_TEMP_REGS.includes(reg);

  const emitLabel = (label: string) => {
    pendingLabels.push(label);
  };

  const emit = (instr: MipsInstruction) => {
    if (pendingLabels.length > 0) {
      instr.labels = [...(instr.labels ?? []), ...pendingLabels];
      pendingLabels = [];
    }
    instructions.push(instr);
  };

  const evalExpr = (expr: ExprNode, targetReg?: number): number => {
    switch (expr.kind) {
      case 'NumberLiteral': {
        if (expr.value === 0 && targetReg === undefined) {
          return 0; // $zero
        }
        const dest = targetReg ?? allocTemp(expr.linea, expr.columna);
        emit({
          mnemonic: ADDI_OP,
          rt: dest,
          rs: 0,
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
            mnemonic: ADDI_OP,
            rt: targetReg,
            rs: sym.reg,
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
            mnemonic: SUB_OP,
            rd: dest,
            rs: 0,
            rt: opReg,
            cLine: expr.linea,
          });
        } else {
          // '~x' -> NOR dest, opReg, $zero
          emit({
            mnemonic: 'NOR',
            rd: dest,
            rs: opReg,
            rt: 0,
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

        if (right.kind === 'NumberLiteral') {
          const imm = right.value;

          if (op === '+' && fitsInSigned16(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            emit({ mnemonic: ADDI_OP, rt: dest, rs: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          if (op === '-' && fitsInSigned16(-imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            emit({ mnemonic: ADDI_OP, rt: dest, rs: lReg, imm: -imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          // IMPORTANT: ANDI/ORI/XORI in MIPS32 are zero-extended (0..65535).
          // Only use I-type when imm >= 0; negative masks fall through to ADDI+R-type.
          if ((op === '&' || op === '|' || op === '^') && fitsInUnsigned16(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: MipsMnemonic =
              op === '&' ? 'ANDI' : op === '|' ? 'ORI' : 'XORI';
            emit({ mnemonic, rt: dest, rs: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          if ((op === '<<' || op === '>>') && imm >= 0 && imm <= 31) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: MipsMnemonic =
              op === '<<'
                ? 'SLL'
                : left.inferredType === 'unsigned'
                ? 'SRL'
                : 'SRA';
            emit({
              mnemonic,
              rd: dest,
              rs: 0,
              rt: lReg,
              shamt: imm,
              cLine: expr.linea,
            });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          if (op === '<' && fitsInSigned16(imm)) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            emit({
              mnemonic: isUnsigned ? 'SLTIU' : 'SLTI',
              rt: dest,
              rs: lReg,
              imm,
              cLine: expr.linea,
            });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }
        }

        // General two-register evaluation
        let lReg = evalExpr(left);
        if (targetReg !== undefined && lReg === targetReg && !isTemp(lReg)) {
          const copyTemp = allocTemp(expr.linea, expr.columna);
          emit({ mnemonic: ADDI_OP, rt: copyTemp, rs: lReg, imm: 0, cLine: expr.linea });
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
          case '^': {
            const map: Record<string, MipsMnemonic> = {
              '+': ADD_OP,
              '-': SUB_OP,
              '&': 'AND',
              '|': 'OR',
              '^': 'XOR',
            };
            emit({
              mnemonic: map[op],
              rd: dest,
              rs: lReg,
              rt: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<<':
          case '>>': {
            // Note MIPS operand order: rd = rt op rs
            const shiftOp: MipsMnemonic =
              op === '<<'
                ? 'SLLV'
                : left.inferredType === 'unsigned'
                ? 'SRLV'
                : 'SRAV';
            emit({
              mnemonic: shiftOp,
              rd: dest,
              rt: lReg,
              rs: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs: lReg,
              rt: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '>': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs: rReg,
              rt: lReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<=': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs: rReg,
              rt: lReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'XORI',
              rt: dest,
              rs: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '>=': {
            emit({
              mnemonic: isUnsigned ? 'SLTU' : 'SLT',
              rd: dest,
              rs: lReg,
              rt: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'XORI',
              rt: dest,
              rs: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '==': {
            emit({
              mnemonic: 'XOR',
              rd: dest,
              rs: lReg,
              rt: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'SLTIU',
              rt: dest,
              rs: dest,
              imm: 1,
              cLine: expr.linea,
            });
            break;
          }

          case '!=': {
            emit({
              mnemonic: 'XOR',
              rd: dest,
              rs: lReg,
              rt: rReg,
              cLine: expr.linea,
            });
            emit({
              mnemonic: 'SLTU',
              rd: dest,
              rs: 0,
              rt: dest,
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

      if (op === '==') {
        emit({ mnemonic: 'BNE', rs: lReg, rt: rReg, targetLabel: falseLabel, cLine: cond.linea });
      } else if (op === '!=') {
        emit({ mnemonic: 'BEQ', rs: lReg, rt: rReg, targetLabel: falseLabel, cLine: cond.linea });
      } else {
        const cmpTmp = allocTemp(cond.linea, cond.columna);
        const sltOp: MipsMnemonic = isUnsigned ? 'SLTU' : 'SLT';
        switch (op) {
          case '<':
            // a < b false => (a < b) == 0
            emit({ mnemonic: sltOp, rd: cmpTmp, rs: lReg, rt: rReg, cLine: cond.linea });
            emit({ mnemonic: 'BEQ', rs: cmpTmp, rt: 0, targetLabel: falseLabel, cLine: cond.linea });
            break;
          case '>=':
            // a >= b false => (a < b) != 0
            emit({ mnemonic: sltOp, rd: cmpTmp, rs: lReg, rt: rReg, cLine: cond.linea });
            emit({ mnemonic: 'BNE', rs: cmpTmp, rt: 0, targetLabel: falseLabel, cLine: cond.linea });
            break;
          case '>':
            // a > b false => (b < a) == 0
            emit({ mnemonic: sltOp, rd: cmpTmp, rs: rReg, rt: lReg, cLine: cond.linea });
            emit({ mnemonic: 'BEQ', rs: cmpTmp, rt: 0, targetLabel: falseLabel, cLine: cond.linea });
            break;
          case '<=':
            // a <= b false => (b < a) != 0
            emit({ mnemonic: sltOp, rd: cmpTmp, rs: rReg, rt: lReg, cLine: cond.linea });
            emit({ mnemonic: 'BNE', rs: cmpTmp, rt: 0, targetLabel: falseLabel, cLine: cond.linea });
            break;
        }
        freeTemp(cmpTmp);
      }

      freeTemp(lReg);
      freeTemp(rReg);
      return;
    }

    const reg = evalExpr(cond);
    emit({
      mnemonic: 'BEQ',
      rs: reg,
      rt: 0,
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
            rt: sym.reg,
            rs: 0,
            imm: sym.ramAddr,
            cLine: stmt.linea,
            comment: `Carga entrada '${sym.name}' desde RAM[${sym.ramAddr}]`,
          });
        } else {
          const resReg = evalExpr(stmt.init, sym.reg);
          if (resReg !== sym.reg) {
            emit({
              mnemonic: ADDI_OP,
              rt: sym.reg,
              rs: resReg,
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
            mnemonic: ADDI_OP,
            rt: sym.reg,
            rs: resReg,
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
            rs: 0,
            rt: 0,
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
          rs: 0,
          rt: 0,
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

  for (const sym of variables) {
    emit({
      mnemonic: 'SW',
      rs: 0,
      rt: sym.reg,
      imm: sym.ramAddr,
      comment: `Guarda resultado '${sym.name}' (${sym.regName}) en RAM[${sym.ramAddr}]`,
    });
  }

  emitLabel('fin');
  emit({
    mnemonic: 'BEQ',
    rs: 0,
    rt: 0,
    targetLabel: 'fin',
    comment: 'Ciclo de fin (detiene el procesador)',
  });

  return { instructions, errores };
}

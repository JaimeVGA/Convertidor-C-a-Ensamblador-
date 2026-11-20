import { ExprNode, ProgramNode, StmtNode } from '../ast';
import { CompileError, createError } from '../errors';
import { VariableSymbol } from '../semantic';
import { ArmInstruction } from './encoder';
import { encodeArmImm } from './imm';
import { ARM_BASE_REG, ARM_TEMP_REGS, ArmMnemonic } from './isa';

export interface ArmCodegenResult {
  instructions: ArmInstruction[];
  errores: CompileError[];
}

export function generateArmCode(
  program: ProgramNode,
  variables: VariableSymbol[],
  symbolMap: Map<string, VariableSymbol>
): ArmCodegenResult {
  const instructions: ArmInstruction[] = [];
  const errores: CompileError[] = [];
  let pendingLabels: string[] = [];
  let labelCounter = 0;

  const usedTemps = new Set<number>();

  const allocTemp = (linea: number, columna: number): number => {
    for (const r of ARM_TEMP_REGS) {
      if (!usedTemps.has(r)) {
        usedTemps.add(r);
        return r;
      }
    }
    errores.push(
      createError(
        linea,
        columna,
        'La expresión es demasiado compleja y agotó los 4 registros temporales disponibles (R8..R11). Simplifícala usando una variable intermedia.'
      )
    );
    return 11;
  };

  const freeTemp = (reg: number) => {
    if (ARM_TEMP_REGS.includes(reg)) {
      usedTemps.delete(reg);
    }
  };

  const isTemp = (reg: number): boolean => ARM_TEMP_REGS.includes(reg);

  const emitLabel = (label: string) => {
    pendingLabels.push(label);
  };

  const emit = (instr: ArmInstruction) => {
    if (pendingLabels.length > 0) {
      instr.labels = [...(instr.labels ?? []), ...pendingLabels];
      pendingLabels = [];
    }
    instructions.push(instr);
  };

  const emitLoadLiteral = (dest: number, val: number, linea: number) => {
    if (encodeArmImm(val) !== null) {
      emit({ mnemonic: 'MOVI', rd: dest, imm: val, cLine: linea });
      return;
    }
    if (encodeArmImm(~val) !== null) {
      emit({ mnemonic: 'MVNI', rd: dest, imm: ~val, cLine: linea });
      return;
    }
    errores.push(
      createError(
        linea,
        1,
        `El número ${val} es demasiado grande o no puede codificarse en un inmediato rotado de 8 bits de ARM32.`
      )
    );
  };

  // Initialize R12 = 0 as RAM base address when any variables exist
  if (variables.length > 0) {
    emit({
      mnemonic: 'MOVI',
      rd: ARM_BASE_REG,
      imm: 0,
      comment: 'Inicializa R12 = 0 (base de Memoria de datos)',
    });
  }

  const evalExpr = (expr: ExprNode, targetReg?: number): number => {
    switch (expr.kind) {
      case 'NumberLiteral': {
        const dest = targetReg ?? allocTemp(expr.linea, expr.columna);
        emitLoadLiteral(dest, expr.value, expr.linea);
        return dest;
      }

      case 'Identifier': {
        const sym = symbolMap.get(expr.name);
        if (!sym) return 0;
        if (targetReg !== undefined && targetReg !== sym.reg) {
          emit({
            mnemonic: 'MOV',
            rd: targetReg,
            rm: sym.reg,
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
          // -x -> RSB dest, opReg, #0
          emit({
            mnemonic: 'RSBI',
            rd: dest,
            rn: opReg,
            imm: 0,
            cLine: expr.linea,
          });
        } else {
          // ~x -> MVN dest, opReg
          emit({
            mnemonic: 'MVN',
            rd: dest,
            rm: opReg,
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

          if (op === '+') {
            if (encodeArmImm(imm) !== null) {
              const lReg = evalExpr(left);
              const dest =
                targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
              emit({ mnemonic: 'ADDI', rd: dest, rn: lReg, imm, cLine: expr.linea });
              if (lReg !== dest) freeTemp(lReg);
              return dest;
            }
            if (encodeArmImm(-imm) !== null) {
              const lReg = evalExpr(left);
              const dest =
                targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
              emit({ mnemonic: 'SUBI', rd: dest, rn: lReg, imm: -imm, cLine: expr.linea });
              if (lReg !== dest) freeTemp(lReg);
              return dest;
            }
          }

          if (op === '-') {
            if (encodeArmImm(imm) !== null) {
              const lReg = evalExpr(left);
              const dest =
                targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
              emit({ mnemonic: 'SUBI', rd: dest, rn: lReg, imm, cLine: expr.linea });
              if (lReg !== dest) freeTemp(lReg);
              return dest;
            }
            if (encodeArmImm(-imm) !== null) {
              const lReg = evalExpr(left);
              const dest =
                targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
              emit({ mnemonic: 'ADDI', rd: dest, rn: lReg, imm: -imm, cLine: expr.linea });
              if (lReg !== dest) freeTemp(lReg);
              return dest;
            }
          }

          if ((op === '&' || op === '|' || op === '^') && encodeArmImm(imm) !== null) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            const mnemonic: ArmMnemonic =
              op === '&' ? 'ANDI' : op === '|' ? 'ORRI' : 'EORI';
            emit({ mnemonic, rd: dest, rn: lReg, imm, cLine: expr.linea });
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }

          if ((op === '<<' || op === '>>') && imm >= 0 && imm <= 31) {
            const lReg = evalExpr(left);
            const dest =
              targetReg ?? (isTemp(lReg) ? lReg : allocTemp(expr.linea, expr.columna));
            if (imm === 0) {
              if (dest !== lReg) {
                emit({ mnemonic: 'MOV', rd: dest, rm: lReg, cLine: expr.linea });
              }
            } else {
              const mnemonic: ArmMnemonic =
                op === '<<'
                  ? 'LSLI'
                  : left.inferredType === 'unsigned'
                  ? 'LSRI'
                  : 'ASRI';
              emit({ mnemonic, rd: dest, rm: lReg, imm, cLine: expr.linea });
            }
            if (lReg !== dest) freeTemp(lReg);
            return dest;
          }
        }

        // General two-register evaluation
        let lReg = evalExpr(left);
        if (targetReg !== undefined && lReg === targetReg && !isTemp(lReg)) {
          const copyTemp = allocTemp(expr.linea, expr.columna);
          emit({ mnemonic: 'MOV', rd: copyTemp, rm: lReg, cLine: expr.linea });
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
            const map: Record<string, ArmMnemonic> = {
              '+': 'ADD',
              '-': 'SUB',
              '&': 'AND',
              '|': 'ORR',
              '^': 'EOR',
            };
            emit({
              mnemonic: map[op],
              rd: dest,
              rn: lReg,
              rm: rReg,
              cLine: expr.linea,
            });
            break;
          }

          case '<<':
          case '>>': {
            // Mask shift amount with 31 to match C/RISC-V/MIPS semantics
            const maskReg = isTemp(rReg) ? rReg : allocTemp(expr.linea, expr.columna);
            emit({ mnemonic: 'ANDI', rd: maskReg, rn: rReg, imm: 31, cLine: expr.linea });
            const shiftOp: ArmMnemonic =
              op === '<<'
                ? 'LSL'
                : left.inferredType === 'unsigned'
                ? 'LSR'
                : 'ASR';
            emit({
              mnemonic: shiftOp,
              rd: dest,
              rm: lReg,
              rs: maskReg,
              cLine: expr.linea,
            });
            if (maskReg !== rReg && maskReg !== dest) freeTemp(maskReg);
            break;
          }

          case '==':
          case '!=':
          case '<':
          case '<=':
          case '>':
          case '>=': {
            // Protect lReg/rReg if dest overwrites one of them before CMP completes:
            // CMP runs BEFORE MOV dest, #0 so lReg and rReg are still intact!
            emit({ mnemonic: 'CMP', rn: lReg, rm: rReg, cLine: expr.linea });
            emit({ mnemonic: 'MOVI', rd: dest, imm: 0, cLine: expr.linea });
            const skipLabel = `cmp_fin_${labelCounter++}`;
            const invBranch = getInverseBranchMnemonic(op, isUnsigned);
            emit({ mnemonic: invBranch, targetLabel: skipLabel, cLine: expr.linea });
            emit({ mnemonic: 'MOVI', rd: dest, imm: 1, cLine: expr.linea });
            emitLabel(skipLabel);
            break;
          }
        }

        if (lReg !== dest) freeTemp(lReg);
        if (rReg !== dest) freeTemp(rReg);
        return dest;
      }
    }
  };

  const getInverseBranchMnemonic = (
    op: '==' | '!=' | '<' | '<=' | '>' | '>=',
    isUnsigned: boolean
  ): ArmMnemonic => {
    switch (op) {
      case '==':
        return 'BNE';
      case '!=':
        return 'BEQ';
      case '<':
        return isUnsigned ? 'BHS' : 'BGE';
      case '>=':
        return isUnsigned ? 'BLO' : 'BLT';
      case '>':
        return isUnsigned ? 'BLS' : 'BLE';
      case '<=':
        return isUnsigned ? 'BHI' : 'BGT';
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

      if (right.kind === 'NumberLiteral' && encodeArmImm(right.value) !== null) {
        const lReg = evalExpr(left);
        emit({ mnemonic: 'CMPI', rn: lReg, imm: right.value, cLine: cond.linea });
        freeTemp(lReg);
      } else {
        const lReg = evalExpr(left);
        const rReg = evalExpr(right);
        emit({ mnemonic: 'CMP', rn: lReg, rm: rReg, cLine: cond.linea });
        freeTemp(lReg);
        freeTemp(rReg);
      }

      const branchOp = getInverseBranchMnemonic(
        op as '==' | '!=' | '<' | '<=' | '>' | '>=',
        isUnsigned
      );
      emit({ mnemonic: branchOp, targetLabel: falseLabel, cLine: cond.linea });
      return;
    }

    const reg = evalExpr(cond);
    emit({ mnemonic: 'CMPI', rn: reg, imm: 0, cLine: cond.linea });
    emit({ mnemonic: 'BEQ', targetLabel: falseLabel, cLine: cond.linea });
    freeTemp(reg);
  };

  const genStmt = (stmt: StmtNode) => {
    switch (stmt.kind) {
      case 'VarDecl': {
        const sym = symbolMap.get(stmt.name)!;
        if (stmt.init === undefined) {
          emit({
            mnemonic: 'LDR',
            rd: sym.reg,
            rn: ARM_BASE_REG,
            imm: sym.ramAddr,
            cLine: stmt.linea,
            comment: `Carga entrada '${sym.name}' desde RAM[${sym.ramAddr}]`,
          });
        } else {
          const resReg = evalExpr(stmt.init, sym.reg);
          if (resReg !== sym.reg) {
            emit({
              mnemonic: 'MOV',
              rd: sym.reg,
              rm: resReg,
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
            mnemonic: 'MOV',
            rd: sym.reg,
            rm: resReg,
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
            mnemonic: 'B',
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
          mnemonic: 'B',
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
      mnemonic: 'STR',
      rd: sym.reg,
      rn: ARM_BASE_REG,
      imm: sym.ramAddr,
      comment: `Guarda resultado '${sym.name}' (${sym.regName}) en RAM[${sym.ramAddr}]`,
    });
  }

  emitLabel('fin');
  emit({
    mnemonic: 'B',
    targetLabel: 'fin',
    comment: 'Ciclo de fin (detiene el procesador)',
  });

  return { instructions, errores };
}

import type { TargetBackend } from '../types';
import { assembleArm } from './assembler';
import { generateArmCode } from './codegen';
import { canEncodeArmLiteral } from './imm';
import {
  ARM_MNEMONICS,
  ARM_REG_NAMES,
  ARM_TEMP_REGS,
  ARM_VAR_REGS,
  formatArmReg,
  SUPPORTED_ARM_ISA,
} from './isa';
import { runArmSimulation } from './simulator';

export const armBackend: TargetBackend = {
  arch: 'arm',
  meta: {
    id: 'arm',
    name: 'ARM32 (A32)',
    shortName: 'ARM32',
    badge: 'ARM32 A32 Subset',
    regCount: 16,
    maxVariables: ARM_VAR_REGS.length,
    varRegs: ARM_VAR_REGS,
    varRegRangeLabel: 'R0..R7',
    tempRegs: ARM_TEMP_REGS,
    tempRegRangeLabel: 'R8..R11',
    hasZeroReg: false,
    hasCpsrFlags: true,
    formatReg: formatArmReg,
    formatRegBankLabel: (reg: number) => ARM_REG_NAMES[reg] ?? `R${reg}`,
  },
  isaCatalog: ARM_MNEMONICS.map((m) => ({
    mnemonic: SUPPORTED_ARM_ISA[m].mnemonic,
    tipo: SUPPORTED_ARM_ISA[m].tipo,
    descripcion: SUPPORTED_ARM_ISA[m].descripcion,
  })),
  validateConstant: (val: number) => {
    if (!canEncodeArmLiteral(val)) {
      return `El número ${val} es demasiado grande o no puede codificarse en un inmediato rotado de 8 bits de ARM32 (no está soportado sin MOVW/MOVT).`;
    }
    return null;
  },
  compileAst: (program, variables, symbolMap, options) => {
    const cgRes = generateArmCode(program, variables, symbolMap);
    if (cgRes.errores.length > 0) {
      return { listado: [], errores: cgRes.errores };
    }
    const asmRes = assembleArm(cgRes.instructions, options.romDepth);
    return {
      listado: asmRes.listado,
      errores: asmRes.errores,
    };
  },
  simulate: (listado, variables, initialInputs, maxSteps) => {
    return runArmSimulation(listado, variables, initialInputs, maxSteps);
  },
};

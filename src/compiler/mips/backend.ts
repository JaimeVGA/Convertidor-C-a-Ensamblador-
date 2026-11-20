import type { TargetBackend } from '../types';
import { assembleMips } from './assembler';
import { generateMipsCode } from './codegen';
import {
  formatMipsReg,
  MIPS_MNEMONICS,
  MIPS_REG_NAMES,
  MIPS_TEMP_REGS,
  MIPS_VAR_REGS,
  SUPPORTED_MIPS_ISA,
} from './isa';
import { runMipsSimulation } from './simulator';

export const mipsBackend: TargetBackend = {
  arch: 'mips',
  meta: {
    id: 'mips',
    name: 'MIPS32',
    shortName: 'MIPS32',
    badge: 'MIPS32 Subset',
    regCount: 32,
    maxVariables: MIPS_VAR_REGS.length,
    varRegs: MIPS_VAR_REGS,
    varRegRangeLabel: '$s0..$s7, $a0..$a3, $v0..$v1',
    tempRegs: MIPS_TEMP_REGS,
    tempRegRangeLabel: '$t0..$t9',
    hasZeroReg: true,
    hasCpsrFlags: false,
    formatReg: formatMipsReg,
    formatRegBankLabel: (reg: number) => `${MIPS_REG_NAMES[reg] ?? `$${reg}`} ($${reg})`,
  },
  isaCatalog: MIPS_MNEMONICS.map((m) => ({
    mnemonic: SUPPORTED_MIPS_ISA[m].mnemonic,
    tipo: SUPPORTED_MIPS_ISA[m].tipo,
    descripcion: SUPPORTED_MIPS_ISA[m].descripcion,
  })),
  validateConstant: (val: number) => {
    if (val < -32768 || val > 32767) {
      return `La constante ${val} no cabe en un inmediato de 16 bits con signo de MIPS32 (−32768..32767) sin instrucción LUI.`;
    }
    return null;
  },
  compileAst: (program, variables, symbolMap, options) => {
    const cgRes = generateMipsCode(
      program,
      variables,
      symbolMap,
      options.mipsArithmeticMode ?? 'signed'
    );
    if (cgRes.errores.length > 0) {
      return { listado: [], errores: cgRes.errores };
    }
    const asmRes = assembleMips(cgRes.instructions, options.romDepth);
    return {
      listado: asmRes.listado,
      errores: asmRes.errores,
    };
  },
  simulate: (listado, variables, initialInputs, maxSteps) => {
    return runMipsSimulation(listado, variables, initialInputs, maxSteps);
  },
};

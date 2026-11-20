import { fitsInImm12 } from '../semantic';
import type { AssembledLine, TargetBackend } from '../types';
import { assemble } from './assembler';
import { generateRiscvCode } from './codegen';
import { SUPPORTED_ISA, SUPPORTED_MNEMONICS } from './isa';
import { runSimulation } from './simulator';

const VAR_REGS = Array.from({ length: 18 }, (_, i) => 10 + i); // x10..x27
const TEMP_REGS = [5, 6, 7, 28, 29, 30, 31];

export const riscvBackend: TargetBackend = {
  arch: 'riscv',
  meta: {
    id: 'riscv',
    name: 'RISC-V (RV32I)',
    shortName: 'RISC-V',
    badge: 'RV32I Subset',
    regCount: 32,
    maxVariables: VAR_REGS.length,
    varRegs: VAR_REGS,
    varRegRangeLabel: 'x10..x27',
    tempRegs: TEMP_REGS,
    tempRegRangeLabel: 'x5..x7, x28..x31',
    hasZeroReg: true,
    hasCpsrFlags: false,
    formatReg: (reg: number) => `x${reg}`,
    formatRegBankLabel: (reg: number) => `x${reg}`,
  },
  isaCatalog: SUPPORTED_MNEMONICS.map((m) => ({
    mnemonic: SUPPORTED_ISA[m].mnemonic,
    tipo: SUPPORTED_ISA[m].tipo,
    descripcion: SUPPORTED_ISA[m].descripcion,
  })),
  validateConstant: (val: number) => {
    if (!fitsInImm12(val)) {
      return `La constante ${val} no cabe en un inmediato de 12 bits (−2048..2047) y el procesador no tiene instrucción LUI.`;
    }
    return null;
  },
  compileAst: (program, variables, symbolMap, options) => {
    const cgRes = generateRiscvCode(program, variables, symbolMap);
    if (cgRes.errores.length > 0) {
      return { listado: [], errores: cgRes.errores };
    }
    const asmRes = assemble(cgRes.instructions, options.romDepth);
    return {
      listado: asmRes.listado as AssembledLine[],
      errores: asmRes.errores,
    };
  },
  simulate: (listado, variables, initialInputs, maxSteps) => {
    return runSimulation(
      listado as unknown as Parameters<typeof runSimulation>[0],
      variables,
      initialInputs,
      maxSteps
    );
  },
};

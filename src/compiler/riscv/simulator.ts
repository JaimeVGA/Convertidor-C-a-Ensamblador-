import { VariableSymbol } from '../semantic';
import type { AssembledLine as GenericAssembledLine, SimulationStepResult } from '../types';
import { AssembledLine } from './assembler';
import { decodeFields } from './encoder';

export type { SimulationStepResult };

export const MAX_SIMULATION_STEPS = 100_000;

export function runSimulation(
  listado: (AssembledLine | GenericAssembledLine)[],
  variables: VariableSymbol[],
  initialInputs: Record<string, number>,
  maxSteps = MAX_SIMULATION_STEPS
): SimulationStepResult {
  const registers = new Int32Array(32);
  const ram = new Map<number, number>();

  // Initialize RAM for all declared variables (especially input variables)
  for (const v of variables) {
    const initVal = initialInputs[v.name] ?? 0;
    ram.set(v.ramAddr, initVal | 0);
  }

  const wordMap = new Map<number, number>();
  for (const line of listado) {
    wordMap.set(line.pc, line.word);
  }

  let pc = 0;
  let stepsExecuted = 0;
  let halted = false;
  let infiniteLoopDetected = false;
  let error: string | undefined;

  while (stepsExecuted < maxSteps) {
    const word = wordMap.get(pc);
    if (word === undefined) {
      error = `El PC (0x${pc.toString(16)}) salió del rango del programa cargado.`;
      break;
    }

    let decoded;
    try {
      decoded = decodeFields(word);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      break;
    }

    // Detect halt instruction: BEQ x0, x0, 0 (or any branch that jumps to itself with offset 0 when condition holds)
    if (
      decoded.mnemonic === 'BEQ' &&
      decoded.rs1 === 0 &&
      decoded.rs2 === 0 &&
      decoded.imm === 0
    ) {
      stepsExecuted++;
      halted = true;
      break;
    }

    const rd = decoded.rd ?? 0;
    const rs1Val = registers[decoded.rs1 ?? 0] | 0;
    const rs2Val = registers[decoded.rs2 ?? 0] | 0;
    const imm = decoded.imm ?? 0;

    let nextPc = pc + 4;

    switch (decoded.mnemonic) {
      // R-Type
      case 'ADD':
        if (rd !== 0) registers[rd] = (rs1Val + rs2Val) | 0;
        break;
      case 'SUB':
        if (rd !== 0) registers[rd] = (rs1Val - rs2Val) | 0;
        break;
      case 'SLL':
        if (rd !== 0) registers[rd] = rs1Val << (rs2Val & 0x1f);
        break;
      case 'SLT':
        if (rd !== 0) registers[rd] = rs1Val < rs2Val ? 1 : 0;
        break;
      case 'SLTU':
        if (rd !== 0) registers[rd] = (rs1Val >>> 0) < (rs2Val >>> 0) ? 1 : 0;
        break;
      case 'XOR':
        if (rd !== 0) registers[rd] = rs1Val ^ rs2Val;
        break;
      case 'SRL':
        if (rd !== 0) registers[rd] = (rs1Val >>> (rs2Val & 0x1f)) | 0;
        break;
      case 'SRA':
        if (rd !== 0) registers[rd] = rs1Val >> (rs2Val & 0x1f);
        break;
      case 'OR':
        if (rd !== 0) registers[rd] = rs1Val | rs2Val;
        break;
      case 'AND':
        if (rd !== 0) registers[rd] = rs1Val & rs2Val;
        break;

      // I-Type
      case 'ADDI':
        if (rd !== 0) registers[rd] = (rs1Val + imm) | 0;
        break;
      case 'SLLI':
        if (rd !== 0) registers[rd] = rs1Val << (imm & 0x1f);
        break;
      case 'SLTI':
        if (rd !== 0) registers[rd] = rs1Val < imm ? 1 : 0;
        break;
      case 'SLTIU':
        // Note: in RISC-V, SLTIU sign-extends the 12-bit immediate first, then compares as unsigned 32-bit
        if (rd !== 0) registers[rd] = (rs1Val >>> 0) < (imm >>> 0) ? 1 : 0;
        break;
      case 'XORI':
        if (rd !== 0) registers[rd] = rs1Val ^ imm;
        break;
      case 'SRLI':
        if (rd !== 0) registers[rd] = (rs1Val >>> (imm & 0x1f)) | 0;
        break;
      case 'SRAI':
        if (rd !== 0) registers[rd] = rs1Val >> (imm & 0x1f);
        break;
      case 'ORI':
        if (rd !== 0) registers[rd] = rs1Val | imm;
        break;
      case 'ANDI':
        if (rd !== 0) registers[rd] = rs1Val & imm;
        break;

      // L-Type
      case 'LW': {
        const addr = (rs1Val + imm) | 0;
        if (addr % 4 !== 0) {
          error = `Acceso desalineado en LW a la dirección ${addr}.`;
          break;
        }
        const loaded = ram.get(addr) ?? 0;
        if (rd !== 0) registers[rd] = loaded | 0;
        break;
      }

      // S-Type
      case 'SW': {
        const addr = (rs1Val + imm) | 0;
        if (addr % 4 !== 0) {
          error = `Acceso desalineado en SW a la dirección ${addr}.`;
          break;
        }
        ram.set(addr, rs2Val | 0);
        break;
      }

      // B-Type
      case 'BEQ':
        if (rs1Val === rs2Val) nextPc = pc + imm;
        break;
      case 'BNE':
        if (rs1Val !== rs2Val) nextPc = pc + imm;
        break;
      case 'BLT':
        if (rs1Val < rs2Val) nextPc = pc + imm;
        break;
      case 'BGE':
        if (rs1Val >= rs2Val) nextPc = pc + imm;
        break;
      case 'BLTU':
        if ((rs1Val >>> 0) < (rs2Val >>> 0)) nextPc = pc + imm;
        break;
      case 'BGEU':
        if ((rs1Val >>> 0) >= (rs2Val >>> 0)) nextPc = pc + imm;
        break;
    }

    registers[0] = 0; // x0 is always hardwired to 0
    if (error) break;

    pc = nextPc;
    stepsExecuted++;
  }

  if (!halted && !error && stepsExecuted >= maxSteps) {
    infiniteLoopDetected = true;
  }

  const variableResults = variables.map((v) => {
    const regVal = registers[v.reg] | 0;
    const ramVal = (ram.get(v.ramAddr) ?? 0) | 0;
    const displayValue =
      v.varType === 'unsigned' ? String(ramVal >>> 0) : String(ramVal);
    const hexValue = `0x${(ramVal >>> 0).toString(16).padStart(8, '0')}`;
    return {
      name: v.name,
      varType: v.varType,
      reg: v.reg,
      regName: v.regName ?? `x${v.reg}`,
      ramAddr: v.ramAddr,
      regValue: regVal,
      ramValue: ramVal,
      displayValue,
      hexValue,
    };
  });

  const regLabels = Array.from({ length: 32 }, (_, i) => `x${i}`);

  return {
    halted,
    infiniteLoopDetected,
    stepsExecuted,
    pc,
    registers,
    regLabels,
    ram,
    variableResults,
    error,
  };
}

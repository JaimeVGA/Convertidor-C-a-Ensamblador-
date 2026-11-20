import { VariableSymbol } from '../semantic';
import type { AssembledLine, CpsrFlags, SimulationStepResult } from '../types';
import { decodeArmFields } from './encoder';
import { ARM_COND, ARM_REG_NAMES } from './isa';

export const MAX_ARM_SIMULATION_STEPS = 100_000;

function evaluateArmCond(cond: number, flags: CpsrFlags): boolean {
  switch (cond) {
    case ARM_COND.EQ:
      return flags.Z;
    case ARM_COND.NE:
      return !flags.Z;
    case ARM_COND.HS:
      return flags.C;
    case ARM_COND.LO:
      return !flags.C;
    case ARM_COND.HI:
      return flags.C && !flags.Z;
    case ARM_COND.LS:
      return !flags.C || flags.Z;
    case ARM_COND.GE:
      return flags.N === flags.V;
    case ARM_COND.LT:
      return flags.N !== flags.V;
    case ARM_COND.GT:
      return !flags.Z && flags.N === flags.V;
    case ARM_COND.LE:
      return flags.Z || flags.N !== flags.V;
    case ARM_COND.AL:
      return true;
    default:
      return false;
  }
}

export function runArmSimulation(
  listado: AssembledLine[],
  variables: VariableSymbol[],
  initialInputs: Record<string, number>,
  maxSteps = MAX_ARM_SIMULATION_STEPS
): SimulationStepResult {
  const registers = new Int32Array(16);
  const ram = new Map<number, number>();
  const flags: CpsrFlags = { N: false, Z: false, C: false, V: false };

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
      decoded = decodeArmFields(word);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      break;
    }

    // Halt instruction: fin: B fin -> 0xEAFFFFFE (cond=AL, imm=-2)
    if (decoded.tipo === 'B' && decoded.cond === ARM_COND.AL && decoded.imm === -2) {
      stepsExecuted++;
      halted = true;
      break;
    }

    let nextPc = pc + 4;
    const imm = decoded.imm ?? 0;

    if (decoded.tipo === 'B') {
      const cond = decoded.cond ?? ARM_COND.AL;
      if (evaluateArmCond(cond, flags)) {
        nextPc = pc + 8 + (imm << 2);
      }
    } else {
      const rd = decoded.rd ?? 0;
      const rn = decoded.rs1 ?? 0;
      const rm = decoded.rs2 ?? 0;
      const rnVal = registers[rn] | 0;
      const rmVal = registers[rm] | 0;

      switch (decoded.mnemonic) {
        // Data processing reg
        case 'ADD':
          registers[rd] = (rnVal + rmVal) | 0;
          break;
        case 'SUB':
          registers[rd] = (rnVal - rmVal) | 0;
          break;
        case 'AND':
          registers[rd] = rnVal & rmVal;
          break;
        case 'ORR':
          registers[rd] = rnVal | rmVal;
          break;
        case 'EOR':
          registers[rd] = rnVal ^ rmVal;
          break;
        case 'MOV':
          registers[rd] = rnVal;
          break;
        case 'MVN':
          registers[rd] = ~rnVal;
          break;
        case 'CMP': {
          const a = rnVal | 0;
          const b = rmVal | 0;
          const res = (a - b) | 0;
          flags.N = res < 0;
          flags.Z = res === 0;
          flags.C = (a >>> 0) >= (b >>> 0);
          flags.V = ((a ^ b) & (a ^ res)) < 0;
          break;
        }
        case 'LSL':
          registers[rd] = rnVal << (rmVal & 0x1f);
          break;
        case 'LSR':
          registers[rd] = (rnVal >>> (rmVal & 0x1f)) | 0;
          break;
        case 'ASR':
          registers[rd] = rnVal >> (rmVal & 0x1f);
          break;

        // Data processing imm
        case 'ADDI':
          registers[rd] = (rnVal + imm) | 0;
          break;
        case 'SUBI':
          registers[rd] = (rnVal - imm) | 0;
          break;
        case 'RSBI':
          registers[rd] = (imm - rnVal) | 0;
          break;
        case 'ANDI':
          registers[rd] = rnVal & imm;
          break;
        case 'ORRI':
          registers[rd] = rnVal | imm;
          break;
        case 'EORI':
          registers[rd] = rnVal ^ imm;
          break;
        case 'MOVI':
          registers[rd] = imm | 0;
          break;
        case 'MVNI':
          registers[rd] = ~imm;
          break;
        case 'CMPI': {
          const a = rnVal | 0;
          const b = imm | 0;
          const res = (a - b) | 0;
          flags.N = res < 0;
          flags.Z = res === 0;
          flags.C = (a >>> 0) >= (b >>> 0);
          flags.V = ((a ^ b) & (a ^ res)) < 0;
          break;
        }
        case 'LSLI':
          registers[rd] = rnVal << (imm & 0x1f);
          break;
        case 'LSRI':
          registers[rd] = (rnVal >>> (imm & 0x1f)) | 0;
          break;
        case 'ASRI':
          registers[rd] = rnVal >> (imm & 0x1f);
          break;

        // Memory
        case 'LDR': {
          const addr = (rnVal + imm) | 0;
          if (addr % 4 !== 0) {
            error = `Acceso desalineado en LDR a la dirección ${addr}.`;
            break;
          }
          registers[rd] = (ram.get(addr) ?? 0) | 0;
          break;
        }
        case 'STR': {
          const addr = (rnVal + imm) | 0;
          if (addr % 4 !== 0) {
            error = `Acceso desalineado en STR a la dirección ${addr}.`;
            break;
          }
          ram.set(addr, registers[decoded.rs2 ?? 0] | 0);
          break;
        }
      }
    }

    if (error) break;
    pc = nextPc;
    registers[15] = pc;
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
      regName: v.regName ?? ARM_REG_NAMES[v.reg],
      ramAddr: v.ramAddr,
      regValue: regVal,
      ramValue: ramVal,
      displayValue,
      hexValue,
    };
  });

  return {
    halted,
    infiniteLoopDetected,
    stepsExecuted,
    pc,
    registers,
    regLabels: [...ARM_REG_NAMES],
    ram,
    variableResults,
    flags: { ...flags },
    error,
  };
}

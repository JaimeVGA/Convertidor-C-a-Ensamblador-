import { VariableSymbol } from '../semantic';
import type { AssembledLine, SimulationStepResult } from '../types';
import { decodeMipsFields } from './encoder';
import { MIPS_REG_NAMES } from './isa';

export const MAX_MIPS_SIMULATION_STEPS = 100_000;

export function runMipsSimulation(
  listado: AssembledLine[],
  variables: VariableSymbol[],
  initialInputs: Record<string, number>,
  maxSteps = MAX_MIPS_SIMULATION_STEPS
): SimulationStepResult {
  const registers = new Int32Array(32);
  const ram = new Map<number, number>();

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
      decoded = decodeMipsFields(word);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      break;
    }

    const rs = (word >>> 21) & 0x1f;
    const rt = (word >>> 16) & 0x1f;
    const rd = (word >>> 11) & 0x1f;
    const shamt = (word >>> 6) & 0x1f;
    const imm = decoded.imm ?? 0;

    // Halt instruction in MIPS: BEQ $zero, $zero, -1 (0x1000FFFF)
    if (decoded.mnemonic === 'BEQ' && rs === 0 && rt === 0 && imm === -1) {
      stepsExecuted++;
      halted = true;
      break;
    }

    const rsVal = registers[rs] | 0;
    const rtVal = registers[rt] | 0;
    let nextPc = pc + 4;

    switch (decoded.mnemonic) {
      // R-Type
      case 'ADD':
      case 'ADDU':
        if (rd !== 0) registers[rd] = (rsVal + rtVal) | 0;
        break;
      case 'SUB':
      case 'SUBU':
        if (rd !== 0) registers[rd] = (rsVal - rtVal) | 0;
        break;
      case 'AND':
        if (rd !== 0) registers[rd] = rsVal & rtVal;
        break;
      case 'OR':
        if (rd !== 0) registers[rd] = rsVal | rtVal;
        break;
      case 'XOR':
        if (rd !== 0) registers[rd] = rsVal ^ rtVal;
        break;
      case 'NOR':
        if (rd !== 0) registers[rd] = ~(rsVal | rtVal);
        break;
      case 'SLT':
        if (rd !== 0) registers[rd] = rsVal < rtVal ? 1 : 0;
        break;
      case 'SLTU':
        if (rd !== 0) registers[rd] = (rsVal >>> 0) < (rtVal >>> 0) ? 1 : 0;
        break;
      case 'SLL':
        if (rd !== 0) registers[rd] = rtVal << shamt;
        break;
      case 'SRL':
        if (rd !== 0) registers[rd] = (rtVal >>> shamt) | 0;
        break;
      case 'SRA':
        if (rd !== 0) registers[rd] = rtVal >> shamt;
        break;
      case 'SLLV':
        if (rd !== 0) registers[rd] = rtVal << (rsVal & 0x1f);
        break;
      case 'SRLV':
        if (rd !== 0) registers[rd] = (rtVal >>> (rsVal & 0x1f)) | 0;
        break;
      case 'SRAV':
        if (rd !== 0) registers[rd] = rtVal >> (rsVal & 0x1f);
        break;

      // I-Type
      case 'ADDI':
      case 'ADDIU':
        if (rt !== 0) registers[rt] = (rsVal + imm) | 0;
        break;
      case 'SLTI':
        if (rt !== 0) registers[rt] = rsVal < imm ? 1 : 0;
        break;
      case 'SLTIU':
        // In MIPS, SLTIU sign-extends the 16-bit immediate and compares as unsigned 32-bit
        if (rt !== 0) registers[rt] = (rsVal >>> 0) < (imm >>> 0) ? 1 : 0;
        break;
      case 'ANDI':
        if (rt !== 0) registers[rt] = rsVal & (imm & 0xffff);
        break;
      case 'ORI':
        if (rt !== 0) registers[rt] = rsVal | (imm & 0xffff);
        break;
      case 'XORI':
        if (rt !== 0) registers[rt] = rsVal ^ (imm & 0xffff);
        break;

      // L-Type
      case 'LW': {
        const addr = (rsVal + imm) | 0;
        if (addr % 4 !== 0) {
          error = `Acceso desalineado en LW a la dirección ${addr}.`;
          break;
        }
        const loaded = ram.get(addr) ?? 0;
        if (rt !== 0) registers[rt] = loaded | 0;
        break;
      }

      // S-Type
      case 'SW': {
        const addr = (rsVal + imm) | 0;
        if (addr % 4 !== 0) {
          error = `Acceso desalineado en SW a la dirección ${addr}.`;
          break;
        }
        ram.set(addr, rtVal | 0);
        break;
      }

      // B-Type
      case 'BEQ':
        if (rsVal === rtVal) nextPc = pc + 4 + (imm << 2);
        break;
      case 'BNE':
        if (rsVal !== rtVal) nextPc = pc + 4 + (imm << 2);
        break;
    }

    registers[0] = 0; // $zero always 0
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
      regName: v.regName ?? MIPS_REG_NAMES[v.reg],
      ramAddr: v.ramAddr,
      regValue: regVal,
      ramValue: ramVal,
      displayValue,
      hexValue,
    };
  });

  const regLabels = MIPS_REG_NAMES.map((name, i) => `${name} ($${i})`);

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

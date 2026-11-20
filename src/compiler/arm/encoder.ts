import type { DecodedInstruction } from '../types';
import { decodeArmImm, encodeArmImm } from './imm';
import {
  ARM_COND,
  ARM_COND_NAME,
  ArmMnemonic,
  formatArmReg,
  SUPPORTED_ARM_ISA,
} from './isa';

export interface ArmInstruction {
  mnemonic: ArmMnemonic;
  rd?: number;
  rn?: number;
  rm?: number;
  rs?: number; // For register-controlled shift
  imm?: number; // Immediate value, shamt, LDR/STR offset, or branch word offset
  targetLabel?: string;
  labels?: string[];
  cLine?: number;
  comment?: string;
}

function toBin(val: number, width: number): string {
  return (val >>> 0).toString(2).slice(-width).padStart(width, '0');
}

export function toHex32(word: number): string {
  return (word >>> 0).toString(16).padStart(8, '0');
}

function signExtend24(val: number): number {
  return (val << 8) >> 8;
}

export function encodeArmInstruction(instr: ArmInstruction): number {
  const spec = SUPPORTED_ARM_ISA[instr.mnemonic];
  if (!spec) {
    throw new Error(`Instrucción ARM32 no soportada: ${instr.mnemonic}`);
  }

  if (spec.tipo === 'B') {
    const cond = spec.cond ?? ARM_COND.AL;
    const offset = instr.imm ?? 0;
    if (offset < -0x800000 || offset > 0x7fffff) {
      throw new Error(`Desplazamiento de salto (${offset}) fuera de rango para ARM32.`);
    }
    return (((cond & 0xf) << 28) | (0b1010 << 24) | (offset & 0xffffff)) >>> 0;
  }

  const cond = ARM_COND.AL;

  if (spec.tipo === 'L' || spec.tipo === 'S') {
    const rn = (instr.rn ?? 12) & 0xf;
    const rd = (instr.rd ?? 0) & 0xf;
    const imm12 = instr.imm ?? 0;
    if (imm12 < 0 || imm12 > 4095) {
      throw new Error(`Desplazamiento de memoria (${imm12}) en ${spec.asmOp} fuera de rango (0..4095).`);
    }
    const loadBit = spec.tipo === 'L' ? 1 : 0;
    // cond(1110) | 01 | I=0 | P=1 | U=1 | B=0 | W=0 | L | Rn | Rd | imm12
    return (
      ((cond << 28) |
        (0b01 << 26) |
        (0b1100 << 21) |
        (loadBit << 20) |
        (rn << 16) |
        (rd << 12) |
        (imm12 & 0xfff)) >>>
      0
    );
  }

  const cmd = spec.cmd ?? 0;
  const sBit = spec.sBit ?? 0;
  const rn = (instr.rn ?? 0) & 0xf;
  const rd = (instr.rd ?? 0) & 0xf;

  if (spec.isShiftImm) {
    const shamt = instr.imm ?? 0;
    if (shamt < 0 || shamt > 31) {
      throw new Error(`El desplazamiento (${shamt}) en ${spec.asmOp} debe estar entre 0 y 31.`);
    }
    const rm = (instr.rm ?? 0) & 0xf;
    const shType = spec.shiftType ?? 0;
    return (
      ((cond << 28) |
        (0b000 << 25) |
        (cmd << 21) |
        (sBit << 20) |
        (0 << 16) |
        (rd << 12) |
        ((shamt & 0x1f) << 7) |
        ((shType & 0x3) << 5) |
        (0 << 4) |
        rm) >>>
      0
    );
  }

  if (spec.isShiftReg) {
    const rs = (instr.rs ?? 0) & 0xf;
    const rm = (instr.rm ?? 0) & 0xf;
    const shType = spec.shiftType ?? 0;
    return (
      ((cond << 28) |
        (0b000 << 25) |
        (cmd << 21) |
        (sBit << 20) |
        (0 << 16) |
        (rd << 12) |
        (rs << 8) |
        (0 << 7) |
        ((shType & 0x3) << 5) |
        (1 << 4) |
        rm) >>>
      0
    );
  }

  if (spec.isImm) {
    const rawImm = instr.imm ?? 0;
    const enc = encodeArmImm(rawImm);
    if (!enc) {
      throw new Error(
        `El número ${rawImm} es demasiado grande o no puede codificarse en un inmediato rotado de 8 bits de ARM32.`
      );
    }
    return (
      ((cond << 28) |
        (0b001 << 25) |
        (cmd << 21) |
        (sBit << 20) |
        (rn << 16) |
        (rd << 12) |
        ((enc.rot & 0xf) << 8) |
        (enc.imm8 & 0xff)) >>>
      0
    );
  }

  // Standard Data-Processing register-register
  const rm = (instr.rm ?? 0) & 0xf;
  return (
    ((cond << 28) |
      (0b000 << 25) |
      (cmd << 21) |
      (sBit << 20) |
      (rn << 16) |
      (rd << 12) |
      rm) >>>
    0
  );
}

export function decodeArmFields(word: number): DecodedInstruction {
  const w = word >>> 0;
  const cond = (w >>> 28) & 0xf;
  const opClass = (w >>> 25) & 0x7;
  const hex = toHex32(w);
  const bin = toBin(w, 32);
  const condLabel = ARM_COND_NAME[cond] ?? `0x${cond.toString(16)}`;

  // Branch: bits[27:25] === 101 and bit[24] === 0
  if (opClass === 0b101 && ((w >>> 24) & 1) === 0) {
    const match = Object.values(SUPPORTED_ARM_ISA).find(
      (s) => s.tipo === 'B' && s.cond === cond
    );
    if (!match) {
      throw new Error(`Instrucción Branch ARM32 desconocida: 0x${hex}`);
    }
    const imm24 = w & 0xffffff;
    const imm = signExtend24(imm24);
    return {
      mnemonic: match.mnemonic,
      tipo: 'B',
      word: w,
      hex,
      bin,
      imm,
      opcode: 0b1010,
      cond,
      segments: [
        { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
        { label: 'op', bits: '1010', range: '27:24', meaning: match.asmOp, role: 'opcode' },
        { label: 'imm24', bits: toBin(imm24, 24), range: '23:0', meaning: `${imm >= 0 ? '+' : ''}${imm} pal.`, role: 'imm' },
      ],
    };
  }

  // Load/Store: bits[27:26] === 01
  if (((w >>> 26) & 0x3) === 0b01) {
    const loadBit = (w >>> 20) & 1;
    const rn = (w >>> 16) & 0xf;
    const rd = (w >>> 12) & 0xf;
    const imm12 = w & 0xfff;
    const mnemonic = loadBit === 1 ? 'LDR' : 'STR';
    const tipo = loadBit === 1 ? 'L' : 'S';

    return {
      mnemonic,
      tipo,
      word: w,
      hex,
      bin,
      rd: loadBit === 1 ? rd : undefined,
      rs1: rn,
      rs2: loadBit === 0 ? rd : undefined,
      imm: imm12,
      opcode: (w >>> 20) & 0xff,
      cond,
      segments: [
        { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
        { label: 'ctrl', bits: toBin((w >>> 20) & 0xff, 8), range: '27:20', meaning: mnemonic, role: 'opcode' },
        { label: 'Rn', bits: toBin(rn, 4), range: '19:16', meaning: `base ${formatArmReg(rn)}`, role: 'rs1' },
        { label: 'Rd', bits: toBin(rd, 4), range: '15:12', meaning: formatArmReg(rd), role: loadBit === 1 ? 'rd' : 'rs2' },
        { label: 'imm12', bits: toBin(imm12, 12), range: '11:0', meaning: `off ${imm12}`, role: 'imm' },
      ],
    };
  }

  // Data-Processing Immediate: bits[27:25] === 001
  if (opClass === 0b001) {
    const cmd = (w >>> 21) & 0xf;
    const sBit = (w >>> 20) & 1;
    const rn = (w >>> 16) & 0xf;
    const rd = (w >>> 12) & 0xf;
    const rot = (w >>> 8) & 0xf;
    const imm8 = w & 0xff;
    const imm = decodeArmImm(rot, imm8);

    const match = Object.values(SUPPORTED_ARM_ISA).find(
      (s) => s.tipo === 'I' && s.isImm && s.cmd === cmd && (s.sBit ?? 0) === sBit
    );
    if (!match) {
      throw new Error(`Instrucción ARM32 Data-Imm desconocida: 0x${hex}`);
    }

    return {
      mnemonic: match.mnemonic,
      tipo: 'I',
      word: w,
      hex,
      bin,
      rd: match.asmOp === 'CMP' ? undefined : rd,
      rs1: rn,
      imm,
      opcode: cmd,
      cond,
      segments: [
        { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
        { label: 'cmd+S', bits: `001${toBin(cmd, 4)}${sBit}`, range: '27:20', meaning: match.asmOp, role: 'opcode' },
        { label: 'Rn', bits: toBin(rn, 4), range: '19:16', meaning: formatArmReg(rn), role: 'rs1' },
        { label: 'Rd', bits: toBin(rd, 4), range: '15:12', meaning: formatArmReg(rd), role: 'rd' },
        { label: 'rot', bits: toBin(rot, 4), range: '11:8', meaning: `x${rot * 2}`, role: 'funct3' },
        { label: 'imm8', bits: toBin(imm8, 8), range: '7:0', meaning: `${imm}`, role: 'imm' },
      ],
    };
  }

  // Data-Processing Register / Shift: bits[27:25] === 000
  if (opClass === 0b000) {
    const cmd = (w >>> 21) & 0xf;
    const sBit = (w >>> 20) & 1;
    const rn = (w >>> 16) & 0xf;
    const rd = (w >>> 12) & 0xf;
    const shiftType = (w >>> 5) & 0x3;
    const bit4 = (w >>> 4) & 1;
    const rm = w & 0xf;

    // Shift by immediate (MOV cmd=1101 with shamt != 0 or shiftType != 0, bit4 === 0)
    const shamt = (w >>> 7) & 0x1f;
    if (cmd === 0b1101 && sBit === 0 && bit4 === 0 && (shamt > 0 || shiftType !== 0)) {
      const match = Object.values(SUPPORTED_ARM_ISA).find(
        (s) => s.isShiftImm && s.shiftType === shiftType
      );
      if (!match) {
        throw new Error(`Instrucción ARM32 Shift-Imm desconocida: 0x${hex}`);
      }
      return {
        mnemonic: match.mnemonic,
        tipo: 'I',
        word: w,
        hex,
        bin,
        rd,
        rs1: rm,
        imm: shamt,
        opcode: cmd,
        cond,
        segments: [
          { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
          { label: 'cmd', bits: `000${toBin(cmd, 4)}${sBit}`, range: '27:20', meaning: match.asmOp, role: 'opcode' },
          { label: 'Rd', bits: toBin(rd, 4), range: '15:12', meaning: formatArmReg(rd), role: 'rd' },
          { label: 'shamt', bits: toBin(shamt, 5), range: '11:7', meaning: `#${shamt}`, role: 'imm' },
          { label: 'sh', bits: `${toBin(shiftType, 2)}0`, range: '6:4', meaning: match.asmOp, role: 'funct3' },
          { label: 'Rm', bits: toBin(rm, 4), range: '3:0', meaning: formatArmReg(rm), role: 'rs2' },
        ],
      };
    }

    // Shift by register (MOV cmd=1101, bit4 === 1)
    if (cmd === 0b1101 && sBit === 0 && bit4 === 1 && ((w >>> 7) & 1) === 0) {
      const rs = (w >>> 8) & 0xf;
      const match = Object.values(SUPPORTED_ARM_ISA).find(
        (s) => s.isShiftReg && s.shiftType === shiftType
      );
      if (!match) {
        throw new Error(`Instrucción ARM32 Shift-Reg desconocida: 0x${hex}`);
      }
      return {
        mnemonic: match.mnemonic,
        tipo: 'R',
        word: w,
        hex,
        bin,
        rd,
        rs1: rm,
        rs2: rs,
        opcode: cmd,
        cond,
        segments: [
          { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
          { label: 'cmd', bits: `000${toBin(cmd, 4)}${sBit}`, range: '27:20', meaning: match.asmOp, role: 'opcode' },
          { label: 'Rd', bits: toBin(rd, 4), range: '15:12', meaning: formatArmReg(rd), role: 'rd' },
          { label: 'Rs', bits: toBin(rs, 4), range: '11:8', meaning: formatArmReg(rs), role: 'rs2' },
          { label: 'sh', bits: `0${toBin(shiftType, 2)}1`, range: '7:4', meaning: match.asmOp, role: 'funct3' },
          { label: 'Rm', bits: toBin(rm, 4), range: '3:0', meaning: formatArmReg(rm), role: 'rs1' },
        ],
      };
    }

    // Standard Data-Processing Register
    const match = Object.values(SUPPORTED_ARM_ISA).find(
      (s) => s.tipo === 'R' && !s.isShiftReg && s.cmd === cmd && (s.sBit ?? 0) === sBit
    );
    if (!match) {
      throw new Error(`Instrucción ARM32 Data-Reg desconocida: 0x${hex}`);
    }

    return {
      mnemonic: match.mnemonic,
      tipo: 'R',
      word: w,
      hex,
      bin,
      rd: match.asmOp === 'CMP' ? undefined : rd,
      rs1: match.asmOp === 'MOV' || match.asmOp === 'MVN' ? rm : rn,
      rs2: match.asmOp === 'MOV' || match.asmOp === 'MVN' ? undefined : rm,
      opcode: cmd,
      cond,
      segments: [
        { label: 'cond', bits: toBin(cond, 4), range: '31:28', meaning: condLabel, role: 'cond' },
        { label: 'cmd+S', bits: `000${toBin(cmd, 4)}${sBit}`, range: '27:20', meaning: match.asmOp, role: 'opcode' },
        { label: 'Rn', bits: toBin(rn, 4), range: '19:16', meaning: formatArmReg(rn), role: 'rs1' },
        { label: 'Rd', bits: toBin(rd, 4), range: '15:12', meaning: formatArmReg(rd), role: 'rd' },
        { label: 'shift', bits: toBin((w >>> 4) & 0xff, 8), range: '11:4', meaning: '0', role: 'funct3' },
        { label: 'Rm', bits: toBin(rm, 4), range: '3:0', meaning: formatArmReg(rm), role: 'rs2' },
      ],
    };
  }

  throw new Error(`La palabra 0x${hex} no pertenece al Set soportado de ARM32.`);
}

export function formatArmAsmText(instr: ArmInstruction): string {
  const spec = SUPPORTED_ISA_REF(instr.mnemonic);
  const m = spec.asmOp.padEnd(4, ' ');
  const rd = formatArmReg(instr.rd ?? 0);
  const rn = formatArmReg(instr.rn ?? 0);
  const rm = formatArmReg(instr.rm ?? 0);
  const rs = formatArmReg(instr.rs ?? 0);

  if (spec.tipo === 'B') {
    return `${m} ${instr.targetLabel ?? instr.imm ?? 0}`;
  }
  if (spec.tipo === 'L' || spec.tipo === 'S') {
    return `${m} ${rd}, [${rn}, #${instr.imm ?? 0}]`;
  }
  if (spec.isShiftImm) {
    return `${m} ${rd}, ${rm}, #${instr.imm ?? 0}`;
  }
  if (spec.isShiftReg) {
    return `${m} ${rd}, ${rm}, ${rs}`;
  }
  if (spec.asmOp === 'MOV' || spec.asmOp === 'MVN') {
    if (spec.isImm) {
      const displayImm =
        instr.mnemonic === 'MVNI'
          ? (instr.imm ?? 0) & 0xffffffff
          : instr.imm ?? 0;
      const enc = encodeArmImm(displayImm);
      const shown = enc ? `#${instr.imm ?? 0}` : `#${instr.imm ?? 0}`;
      return `${m} ${rd}, ${shown}`;
    }
    return `${m} ${rd}, ${rm}`;
  }
  if (spec.asmOp === 'CMP') {
    return spec.isImm
      ? `${m} ${rn}, #${instr.imm ?? 0}`
      : `${m} ${rn}, ${rm}`;
  }
  return spec.isImm
    ? `${m} ${rd}, ${rn}, #${instr.imm ?? 0}`
    : `${m} ${rd}, ${rn}, ${rm}`;
}

function SUPPORTED_ISA_REF(mnemonic: ArmMnemonic) {
  return SUPPORTED_ARM_ISA[mnemonic];
}

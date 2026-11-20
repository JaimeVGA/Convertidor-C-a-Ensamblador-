import type { DecodedInstruction } from '../types';
import { formatMipsReg, MipsMnemonic, SUPPORTED_MIPS_ISA } from './isa';

export interface MipsInstruction {
  mnemonic: MipsMnemonic;
  rd?: number;
  rs?: number;
  rt?: number;
  shamt?: number;
  imm?: number; // For I, L, S, or resolved B word offset relative to PC + 4
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

function signExtend16(val: number): number {
  return (val << 16) >> 16;
}

export function encodeMipsInstruction(instr: MipsInstruction): number {
  const spec = SUPPORTED_MIPS_ISA[instr.mnemonic];
  if (!spec) {
    throw new Error(`Instrucción MIPS32 no soportada: ${instr.mnemonic}`);
  }

  const opcode = spec.opcode & 0x3f;

  if (spec.tipo === 'R') {
    const rs = (instr.rs ?? 0) & 0x1f;
    const rt = (instr.rt ?? 0) & 0x1f;
    const rd = (instr.rd ?? 0) & 0x1f;
    const shamt = (instr.shamt ?? 0) & 0x1f;
    const funct = (spec.funct ?? 0) & 0x3f;

    if (spec.isShiftImm) {
      const rawShamt = instr.shamt ?? 0;
      if (rawShamt < 0 || rawShamt > 31) {
        throw new Error(`El desplazamiento (${rawShamt}) en ${instr.mnemonic} debe estar entre 0 y 31.`);
      }
    }

    return (
      ((opcode << 26) |
        (rs << 21) |
        (rt << 16) |
        (rd << 11) |
        (shamt << 6) |
        funct) >>>
      0
    );
  }

  const rs = (instr.rs ?? 0) & 0x1f;
  const rt = (instr.rt ?? 0) & 0x1f;
  const rawImm = instr.imm ?? 0;

  if (spec.isZeroExtImm) {
    if (rawImm < 0 || rawImm > 65535) {
      throw new Error(
        `El inmediato sin signo (${rawImm}) en ${instr.mnemonic} debe estar entre 0 y 65535.`
      );
    }
  } else {
    if (rawImm < -32768 || rawImm > 32767) {
      throw new Error(
        `El inmediato (${rawImm}) en ${instr.mnemonic} está fuera de rango (−32768..32767).`
      );
    }
  }

  const imm16 = rawImm & 0xffff;
  return ((opcode << 26) | (rs << 21) | (rt << 16) | imm16) >>> 0;
}

export function decodeMipsFields(word: number): DecodedInstruction {
  const w = word >>> 0;
  const opcode = (w >>> 26) & 0x3f;
  const rs = (w >>> 21) & 0x1f;
  const rt = (w >>> 16) & 0x1f;
  const rd = (w >>> 11) & 0x1f;
  const shamt = (w >>> 6) & 0x1f;
  const funct = w & 0x3f;

  const hex = toHex32(w);
  const bin = toBin(w, 32);

  if (opcode === 0x00) {
    const match = Object.values(SUPPORTED_MIPS_ISA).find(
      (s) => s.tipo === 'R' && s.funct === funct
    );
    if (!match) {
      throw new Error(`Palabra MIPS R-Type desconocida: 0x${hex}`);
    }

    return {
      mnemonic: match.mnemonic,
      tipo: 'R',
      word: w,
      hex,
      bin,
      rd,
      rs1: rs,
      rs2: rt,
      imm: match.isShiftImm ? shamt : undefined,
      funct3: shamt,
      funct7: funct,
      opcode,
      segments: [
        { label: 'opcode', bits: toBin(opcode, 6), range: '31:26', meaning: 'R (000000)', role: 'opcode' },
        { label: 'rs', bits: toBin(rs, 5), range: '25:21', meaning: formatMipsReg(rs), role: 'rs1' },
        { label: 'rt', bits: toBin(rt, 5), range: '20:16', meaning: formatMipsReg(rt), role: 'rs2' },
        { label: 'rd', bits: toBin(rd, 5), range: '15:11', meaning: formatMipsReg(rd), role: 'rd' },
        { label: 'shamt', bits: toBin(shamt, 5), range: '10:6', meaning: `${shamt}`, role: 'imm' },
        { label: 'funct', bits: toBin(funct, 6), range: '5:0', meaning: `0x${funct.toString(16).padStart(2, '0')}`, role: 'funct7' },
      ],
    };
  }

  const match = Object.values(SUPPORTED_MIPS_ISA).find(
    (s) => s.tipo !== 'R' && s.opcode === opcode
  );
  if (!match) {
    throw new Error(`La palabra 0x${hex} no pertenece al Set soportado de MIPS32.`);
  }

  const imm16 = w & 0xffff;
  const imm = match.isZeroExtImm ? imm16 : signExtend16(imm16);

  const immMeaning =
    match.tipo === 'B'
      ? `${imm >= 0 ? '+' : ''}${imm} pal.`
      : `${imm}`;

  return {
    mnemonic: match.mnemonic,
    tipo: match.tipo,
    word: w,
    hex,
    bin,
    rd: match.tipo === 'I' || match.tipo === 'L' ? rt : undefined,
    rs1: rs,
    rs2: match.tipo === 'S' || match.tipo === 'B' ? rt : undefined,
    imm,
    opcode,
    segments: [
      { label: 'opcode', bits: toBin(opcode, 6), range: '31:26', meaning: `${match.mnemonic} (0x${opcode.toString(16).padStart(2, '0')})`, role: 'opcode' },
      { label: 'rs', bits: toBin(rs, 5), range: '25:21', meaning: match.tipo === 'L' || match.tipo === 'S' ? `base ${formatMipsReg(rs)}` : formatMipsReg(rs), role: 'rs1' },
      { label: 'rt', bits: toBin(rt, 5), range: '20:16', meaning: formatMipsReg(rt), role: match.tipo === 'I' || match.tipo === 'L' ? 'rd' : 'rs2' },
      { label: 'imm[15:0]', bits: toBin(imm16, 16), range: '15:0', meaning: immMeaning, role: 'imm' },
    ],
  };
}

export function formatMipsAsmText(instr: MipsInstruction): string {
  const spec = SUPPORTED_MIPS_ISA[instr.mnemonic];
  const m = instr.mnemonic.padEnd(5, ' ');
  const rd = formatMipsReg(instr.rd ?? 0);
  const rs = formatMipsReg(instr.rs ?? 0);
  const rt = formatMipsReg(instr.rt ?? 0);

  if (spec.tipo === 'R') {
    if (spec.isShiftImm) {
      return `${m} ${rd}, ${rt}, ${instr.shamt ?? 0}`;
    }
    if (spec.isShiftVar) {
      return `${m} ${rd}, ${rt}, ${rs}`;
    }
    return `${m} ${rd}, ${rs}, ${rt}`;
  }

  switch (spec.tipo) {
    case 'I':
      return `${m} ${rt}, ${rs}, ${instr.imm ?? 0}`;
    case 'L':
    case 'S':
      return `${m} ${rt}, ${instr.imm ?? 0}(${rs})`;
    case 'B':
      return `${m} ${rs}, ${rt}, ${instr.targetLabel ?? instr.imm ?? 0}`;
  }
}

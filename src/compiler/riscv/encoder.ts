import { InstrCategory, SUPPORTED_ISA, SupportedMnemonic } from './isa';

export interface AsmInstruction {
  mnemonic: SupportedMnemonic;
  rd?: number;
  rs1?: number;
  rs2?: number;
  imm?: number; // For I, L, S, or resolved B byte offset
  targetLabel?: string; // For unresolved B-type
  labels?: string[]; // Labels attached to this instruction
  cLine?: number; // Source line in C
  comment?: string;
}

export interface BitFieldSegment {
  label: string;
  bits: string; // binary string e.g. "0000000"
  range: string; // e.g. "31:25"
  meaning: string; // e.g. "funct7 (0)" or "rd (x10)"
  role: 'opcode' | 'rd' | 'funct3' | 'rs1' | 'rs2' | 'funct7' | 'imm';
}

export interface DecodedInstruction {
  mnemonic: SupportedMnemonic;
  tipo: InstrCategory;
  word: number;
  hex: string;
  bin: string;
  rd?: number;
  rs1?: number;
  rs2?: number;
  imm?: number;
  funct3: number;
  funct7?: number;
  opcode: number;
  segments: BitFieldSegment[];
}

function toBin(val: number, width: number): string {
  return (val >>> 0).toString(2).slice(-width).padStart(width, '0');
}

export function toHex32(word: number): string {
  return (word >>> 0).toString(16).padStart(8, '0');
}

function signExtend(val: number, bits: number): number {
  const shift = 32 - bits;
  return (val << shift) >> shift;
}

export function encodeInstruction(instr: AsmInstruction): number {
  const spec = SUPPORTED_ISA[instr.mnemonic];
  if (!spec) {
    throw new Error(`Instrucción no soportada: ${instr.mnemonic}`);
  }

  const opcode = spec.opcode & 0x7f;
  const funct3 = spec.funct3 & 0x7;

  switch (spec.tipo) {
    case 'R': {
      const rd = (instr.rd ?? 0) & 0x1f;
      const rs1 = (instr.rs1 ?? 0) & 0x1f;
      const rs2 = (instr.rs2 ?? 0) & 0x1f;
      const funct7 = (spec.funct7 ?? 0) & 0x7f;
      return (
        ((funct7 << 25) |
          (rs2 << 20) |
          (rs1 << 15) |
          (funct3 << 12) |
          (rd << 7) |
          opcode) >>>
        0
      );
    }

    case 'I': {
      const rd = (instr.rd ?? 0) & 0x1f;
      const rs1 = (instr.rs1 ?? 0) & 0x1f;
      const rawImm = instr.imm ?? 0;

      if (spec.isShiftImm) {
        if (rawImm < 0 || rawImm > 31) {
          throw new Error(`El desplazamiento inmediato (${rawImm}) en ${instr.mnemonic} debe estar entre 0 y 31.`);
        }
        const shamt = rawImm & 0x1f;
        const funct7 = (spec.funct7 ?? 0) & 0x7f;
        return (
          ((funct7 << 25) |
            (shamt << 20) |
            (rs1 << 15) |
            (funct3 << 12) |
            (rd << 7) |
            opcode) >>>
          0
        );
      }

      if (rawImm < -2048 || rawImm > 2047) {
        throw new Error(`El inmediato (${rawImm}) en ${instr.mnemonic} fuera de rango (−2048..2047).`);
      }
      const imm12 = rawImm & 0xfff;
      return (
        ((imm12 << 20) |
          (rs1 << 15) |
          (funct3 << 12) |
          (rd << 7) |
          opcode) >>>
        0
      );
    }

    case 'L': {
      const rd = (instr.rd ?? 0) & 0x1f;
      const rs1 = (instr.rs1 ?? 0) & 0x1f;
      const rawImm = instr.imm ?? 0;
      if (rawImm < -2048 || rawImm > 2047) {
        throw new Error(`El desplazamiento (${rawImm}) en LW fuera de rango (−2048..2047).`);
      }
      const imm12 = rawImm & 0xfff;
      return (
        ((imm12 << 20) |
          (rs1 << 15) |
          (funct3 << 12) |
          (rd << 7) |
          opcode) >>>
        0
      );
    }

    case 'S': {
      const rs1 = (instr.rs1 ?? 0) & 0x1f;
      const rs2 = (instr.rs2 ?? 0) & 0x1f;
      const rawImm = instr.imm ?? 0;
      if (rawImm < -2048 || rawImm > 2047) {
        throw new Error(`El desplazamiento (${rawImm}) en SW fuera de rango (−2048..2047).`);
      }
      const imm12 = rawImm & 0xfff;
      const imm11_5 = (imm12 >> 5) & 0x7f;
      const imm4_0 = imm12 & 0x1f;
      return (
        ((imm11_5 << 25) |
          (rs2 << 20) |
          (rs1 << 15) |
          (funct3 << 12) |
          (imm4_0 << 7) |
          opcode) >>>
        0
      );
    }

    case 'B': {
      const rs1 = (instr.rs1 ?? 0) & 0x1f;
      const rs2 = (instr.rs2 ?? 0) & 0x1f;
      const offset = instr.imm ?? 0;
      if (offset % 2 !== 0) {
        throw new Error(`El desplazamiento de salto (${offset}) debe ser par.`);
      }
      if (offset < -4096 || offset > 4094) {
        throw new Error(`El desplazamiento de salto (${offset}) está fuera de rango (−4096..4094).`);
      }
      const imm13 = offset & 0x1fff;
      const bit12 = (imm13 >> 12) & 0x1;
      const bit11 = (imm13 >> 11) & 0x1;
      const bits10_5 = (imm13 >> 5) & 0x3f;
      const bits4_1 = (imm13 >> 1) & 0x0f;
      return (
        ((bit12 << 31) |
          (bits10_5 << 25) |
          (rs2 << 20) |
          (rs1 << 15) |
          (funct3 << 12) |
          (bits4_1 << 8) |
          (bit11 << 7) |
          opcode) >>>
        0
      );
    }
  }
}

export function decodeFields(word: number): DecodedInstruction {
  const w = word >>> 0;
  const opcode = w & 0x7f;
  const rd = (w >>> 7) & 0x1f;
  const funct3 = (w >>> 12) & 0x7;
  const rs1 = (w >>> 15) & 0x1f;
  const rs2 = (w >>> 20) & 0x1f;
  const funct7 = (w >>> 25) & 0x7f;

  const hex = toHex32(w);
  const bin = toBin(w, 32);

  // Match against SUPPORTED_ISA
  if (opcode === 0x33) {
    const match = Object.values(SUPPORTED_ISA).find(
      (s) => s.tipo === 'R' && s.funct3 === funct3 && s.funct7 === funct7
    );
    if (!match) {
      throw new Error(`Palabra R-Type desconocida: 0x${hex}`);
    }
    return {
      mnemonic: match.mnemonic,
      tipo: 'R',
      word: w,
      hex,
      bin,
      rd,
      rs1,
      rs2,
      funct3,
      funct7,
      opcode,
      segments: [
        { label: 'funct7', bits: toBin(funct7, 7), range: '31:25', meaning: `0x${funct7.toString(16)}`, role: 'funct7' },
        { label: 'rs2', bits: toBin(rs2, 5), range: '24:20', meaning: `x${rs2}`, role: 'rs2' },
        { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `x${rs1}`, role: 'rs1' },
        { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: `${funct3}`, role: 'funct3' },
        { label: 'rd', bits: toBin(rd, 5), range: '11:7', meaning: `x${rd}`, role: 'rd' },
        { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'R (0110011)', role: 'opcode' },
      ],
    };
  }

  if (opcode === 0x13) {
    // Check shift immediates first
    if (funct3 === 0b001 || funct3 === 0b101) {
      const match = Object.values(SUPPORTED_ISA).find(
        (s) => s.tipo === 'I' && s.isShiftImm && s.funct3 === funct3 && s.funct7 === funct7
      );
      if (!match) {
        throw new Error(`Palabra Shift-I desconocida: 0x${hex}`);
      }
      const shamt = rs2;
      return {
        mnemonic: match.mnemonic,
        tipo: 'I',
        word: w,
        hex,
        bin,
        rd,
        rs1,
        imm: shamt,
        funct3,
        funct7,
        opcode,
        segments: [
          { label: 'funct7', bits: toBin(funct7, 7), range: '31:25', meaning: `0x${funct7.toString(16)}`, role: 'funct7' },
          { label: 'shamt', bits: toBin(shamt, 5), range: '24:20', meaning: `${shamt}`, role: 'imm' },
          { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `x${rs1}`, role: 'rs1' },
          { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: `${funct3}`, role: 'funct3' },
          { label: 'rd', bits: toBin(rd, 5), range: '11:7', meaning: `x${rd}`, role: 'rd' },
          { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'I (0010011)', role: 'opcode' },
        ],
      };
    }

    const match = Object.values(SUPPORTED_ISA).find(
      (s) => s.tipo === 'I' && !s.isShiftImm && s.funct3 === funct3
    );
    if (!match) {
      throw new Error(`Palabra I-Type desconocida: 0x${hex}`);
    }
    const imm12 = (w >>> 20) & 0xfff;
    const imm = signExtend(imm12, 12);
    return {
      mnemonic: match.mnemonic,
      tipo: 'I',
      word: w,
      hex,
      bin,
      rd,
      rs1,
      imm,
      funct3,
      opcode,
      segments: [
        { label: 'imm', bits: toBin(imm12, 12), range: '31:20', meaning: `${imm}`, role: 'imm' },
        { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `x${rs1}`, role: 'rs1' },
        { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: `${funct3}`, role: 'funct3' },
        { label: 'rd', bits: toBin(rd, 5), range: '11:7', meaning: `x${rd}`, role: 'rd' },
        { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'I (0010011)', role: 'opcode' },
      ],
    };
  }

  if (opcode === 0x03 && funct3 === 0b010) {
    const imm12 = (w >>> 20) & 0xfff;
    const imm = signExtend(imm12, 12);
    return {
      mnemonic: 'LW',
      tipo: 'L',
      word: w,
      hex,
      bin,
      rd,
      rs1,
      imm,
      funct3,
      opcode,
      segments: [
        { label: 'imm', bits: toBin(imm12, 12), range: '31:20', meaning: `off ${imm}`, role: 'imm' },
        { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `base x${rs1}`, role: 'rs1' },
        { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: '010 (w)', role: 'funct3' },
        { label: 'rd', bits: toBin(rd, 5), range: '11:7', meaning: `x${rd}`, role: 'rd' },
        { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'L (0000011)', role: 'opcode' },
      ],
    };
  }

  if (opcode === 0x23 && funct3 === 0b010) {
    const imm11_5 = funct7;
    const imm4_0 = rd;
    const imm12 = (imm11_5 << 5) | imm4_0;
    const imm = signExtend(imm12, 12);
    return {
      mnemonic: 'SW',
      tipo: 'S',
      word: w,
      hex,
      bin,
      rs1,
      rs2,
      imm,
      funct3,
      opcode,
      segments: [
        { label: 'imm[11:5]', bits: toBin(imm11_5, 7), range: '31:25', meaning: `off[11:5]`, role: 'imm' },
        { label: 'rs2', bits: toBin(rs2, 5), range: '24:20', meaning: `src x${rs2}`, role: 'rs2' },
        { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `base x${rs1}`, role: 'rs1' },
        { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: '010 (w)', role: 'funct3' },
        { label: 'imm[4:0]', bits: toBin(imm4_0, 5), range: '11:7', meaning: `off ${imm}`, role: 'imm' },
        { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'S (0100011)', role: 'opcode' },
      ],
    };
  }

  if (opcode === 0x63) {
    const match = Object.values(SUPPORTED_ISA).find((s) => s.tipo === 'B' && s.funct3 === funct3);
    if (!match) {
      throw new Error(`Palabra B-Type desconocida: 0x${hex}`);
    }
    const bit12 = (w >>> 31) & 1;
    const bits10_5 = (w >>> 25) & 0x3f;
    const bits4_1 = (w >>> 8) & 0x0f;
    const bit11 = (w >>> 7) & 1;
    const imm13 = (bit12 << 12) | (bit11 << 11) | (bits10_5 << 5) | (bits4_1 << 1);
    const imm = signExtend(imm13, 13);
    return {
      mnemonic: match.mnemonic,
      tipo: 'B',
      word: w,
      hex,
      bin,
      rs1,
      rs2,
      imm,
      funct3,
      opcode,
      segments: [
        {
          label: 'imm[12|10:5]',
          bits: `${bit12}${toBin(bits10_5, 6)}`,
          range: '31:25',
          meaning: `off ${imm}`,
          role: 'imm',
        },
        { label: 'rs2', bits: toBin(rs2, 5), range: '24:20', meaning: `x${rs2}`, role: 'rs2' },
        { label: 'rs1', bits: toBin(rs1, 5), range: '19:15', meaning: `x${rs1}`, role: 'rs1' },
        { label: 'funct3', bits: toBin(funct3, 3), range: '14:12', meaning: `${funct3}`, role: 'funct3' },
        {
          label: 'imm[4:1|11]',
          bits: `${toBin(bits4_1, 4)}${bit11}`,
          range: '11:7',
          meaning: `${imm / 4 >= 0 ? '+' : ''}${imm / 4}p`,
          role: 'imm',
        },
        { label: 'opcode', bits: toBin(opcode, 7), range: '6:0', meaning: 'B (1100011)', role: 'opcode' },
      ],
    };
  }

  throw new Error(`La palabra 0x${hex} no pertenece al Set soportado del procesador.`);
}

export function formatAsmText(instr: AsmInstruction): string {
  const spec = SUPPORTED_ISA[instr.mnemonic];
  const m = instr.mnemonic.padEnd(5, ' ');
  switch (spec.tipo) {
    case 'R':
      return `${m} x${instr.rd}, x${instr.rs1}, x${instr.rs2}`;
    case 'I':
      return `${m} x${instr.rd}, x${instr.rs1}, ${instr.imm}`;
    case 'L':
      return `${m} x${instr.rd}, ${instr.imm}(x${instr.rs1})`;
    case 'S':
      return `${m} x${instr.rs2}, ${instr.imm}(x${instr.rs1})`;
    case 'B':
      return `${m} x${instr.rs1}, x${instr.rs2}, ${instr.targetLabel ?? instr.imm}`;
  }
}

import type { InstrCategory } from '../types';

export const MIPS_REG_NAMES: readonly string[] = [
  '$zero', '$at', '$v0', '$v1',
  '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9', '$k0', '$k1',
  '$gp', '$sp', '$fp', '$ra',
];

// 14 variables: $s0..$s7, $a0..$a3, $v0..$v1
export const MIPS_VAR_REGS: number[] = [16, 17, 18, 19, 20, 21, 22, 23, 4, 5, 6, 7, 2, 3];

// 10 temporaries: $t0..$t9
export const MIPS_TEMP_REGS: number[] = [8, 9, 10, 11, 12, 13, 14, 15, 24, 25];

export type MipsMnemonic =
  // R-Type reg-reg (10)
  | 'ADD'
  | 'ADDU'
  | 'SUB'
  | 'SUBU'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NOR'
  | 'SLT'
  | 'SLTU'
  // R-Type shift-imm (3)
  | 'SLL'
  | 'SRL'
  | 'SRA'
  // R-Type shift-var (3)
  | 'SLLV'
  | 'SRLV'
  | 'SRAV'
  // I-Type arithmetic/logical (7)
  | 'ADDI'
  | 'ADDIU'
  | 'SLTI'
  | 'SLTIU'
  | 'ANDI'
  | 'ORI'
  | 'XORI'
  // L-Type load (1)
  | 'LW'
  // S-Type store (1)
  | 'SW'
  // B-Type branch (2)
  | 'BEQ'
  | 'BNE';

export interface MipsIsaSpec {
  mnemonic: MipsMnemonic;
  tipo: InstrCategory;
  opcode: number;
  funct?: number;
  isShiftImm?: boolean;
  isShiftVar?: boolean;
  isZeroExtImm?: boolean;
  descripcion: string;
}

export const SUPPORTED_MIPS_ISA: Record<MipsMnemonic, MipsIsaSpec> = {
  // R-Type (opcode 0x00)
  ADD:  { mnemonic: 'ADD',  tipo: 'R', opcode: 0x00, funct: 0x20, descripcion: 'Suma con signo de registros (rd = rs + rt)' },
  ADDU: { mnemonic: 'ADDU', tipo: 'R', opcode: 0x00, funct: 0x21, descripcion: 'Suma sin desbordamiento de registros (rd = rs + rt)' },
  SUB:  { mnemonic: 'SUB',  tipo: 'R', opcode: 0x00, funct: 0x22, descripcion: 'Resta con signo de registros (rd = rs - rt)' },
  SUBU: { mnemonic: 'SUBU', tipo: 'R', opcode: 0x00, funct: 0x23, descripcion: 'Resta sin desbordamiento de registros (rd = rs - rt)' },
  AND:  { mnemonic: 'AND',  tipo: 'R', opcode: 0x00, funct: 0x24, descripcion: 'AND bit a bit (rd = rs & rt)' },
  OR:   { mnemonic: 'OR',   tipo: 'R', opcode: 0x00, funct: 0x25, descripcion: 'OR inclusivo bit a bit (rd = rs | rt)' },
  XOR:  { mnemonic: 'XOR',  tipo: 'R', opcode: 0x00, funct: 0x26, descripcion: 'OR exclusivo bit a bit (rd = rs ^ rt)' },
  NOR:  { mnemonic: 'NOR',  tipo: 'R', opcode: 0x00, funct: 0x27, descripcion: 'NOR bit a bit, usado para ~rs (rd = ~(rs | rt))' },
  SLT:  { mnemonic: 'SLT',  tipo: 'R', opcode: 0x00, funct: 0x2a, descripcion: 'Menor que con signo (rd = (rs < rt) ? 1 : 0)' },
  SLTU: { mnemonic: 'SLTU', tipo: 'R', opcode: 0x00, funct: 0x2b, descripcion: 'Menor que sin signo (rd = (rs < rt) ? 1 : 0)' },

  // R-Type shift by immediate shamt (opcode 0x00)
  SLL:  { mnemonic: 'SLL',  tipo: 'R', opcode: 0x00, funct: 0x00, isShiftImm: true, descripcion: 'Corrimiento lógico a la izquierda por shamt (rd = rt << shamt)' },
  SRL:  { mnemonic: 'SRL',  tipo: 'R', opcode: 0x00, funct: 0x02, isShiftImm: true, descripcion: 'Corrimiento lógico a la derecha por shamt (rd = rt >>> shamt)' },
  SRA:  { mnemonic: 'SRA',  tipo: 'R', opcode: 0x00, funct: 0x03, isShiftImm: true, descripcion: 'Corrimiento aritmético a la derecha por shamt (rd = rt >> shamt)' },

  // R-Type shift by variable register (opcode 0x00)
  SLLV: { mnemonic: 'SLLV', tipo: 'R', opcode: 0x00, funct: 0x04, isShiftVar: true, descripcion: 'Corrimiento lógico a la izquierda variable (rd = rt << rs)' },
  SRLV: { mnemonic: 'SRLV', tipo: 'R', opcode: 0x00, funct: 0x06, isShiftVar: true, descripcion: 'Corrimiento lógico a la derecha variable (rd = rt >>> rs)' },
  SRAV: { mnemonic: 'SRAV', tipo: 'R', opcode: 0x00, funct: 0x07, isShiftVar: true, descripcion: 'Corrimiento aritmético a la derecha variable (rd = rt >> rs)' },

  // I-Type
  ADDI:  { mnemonic: 'ADDI',  tipo: 'I', opcode: 0x08, descripcion: 'Suma con inmediato de 16 bits con signo (rt = rs + imm)' },
  ADDIU: { mnemonic: 'ADDIU', tipo: 'I', opcode: 0x09, descripcion: 'Suma inmediata de 16 bits sin trampa de overflow' },
  SLTI:  { mnemonic: 'SLTI',  tipo: 'I', opcode: 0x0a, descripcion: 'Menor que inmediato con signo' },
  SLTIU: { mnemonic: 'SLTIU', tipo: 'I', opcode: 0x0b, descripcion: 'Menor que inmediato sin signo' },
  ANDI:  { mnemonic: 'ANDI',  tipo: 'I', opcode: 0x0c, isZeroExtImm: true, descripcion: 'AND con inmediato de 16 bits (extensión con ceros)' },
  ORI:   { mnemonic: 'ORI',   tipo: 'I', opcode: 0x0d, isZeroExtImm: true, descripcion: 'OR con inmediato de 16 bits (extensión con ceros)' },
  XORI:  { mnemonic: 'XORI',  tipo: 'I', opcode: 0x0e, isZeroExtImm: true, descripcion: 'XOR con inmediato de 16 bits (extensión con ceros)' },

  // L-Type / S-Type
  LW: { mnemonic: 'LW', tipo: 'L', opcode: 0x23, descripcion: 'Carga palabra de 32 bits desde Memoria de datos' },
  SW: { mnemonic: 'SW', tipo: 'S', opcode: 0x2b, descripcion: 'Guarda palabra de 32 bits en Memoria de datos' },

  // B-Type
  BEQ: { mnemonic: 'BEQ', tipo: 'B', opcode: 0x04, descripcion: 'Salta si rs == rt (offset relativo a PC + 4)' },
  BNE: { mnemonic: 'BNE', tipo: 'B', opcode: 0x05, descripcion: 'Salta si rs != rt (offset relativo a PC + 4)' },
};

export const MIPS_MNEMONICS = Object.keys(SUPPORTED_MIPS_ISA) as MipsMnemonic[];

export function isSupportedMipsMnemonic(name: string): name is MipsMnemonic {
  return name in SUPPORTED_MIPS_ISA;
}

export function formatMipsReg(reg: number): string {
  return MIPS_REG_NAMES[reg] ?? `$${reg}`;
}

import type { InstrCategory } from '../types';

export const ARM_REG_NAMES: readonly string[] = [
  'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7',
  'R8', 'R9', 'R10', 'R11', 'R12', 'SP', 'LR', 'PC',
];

// 8 variables: R0..R7
export const ARM_VAR_REGS: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

// 4 temporaries: R8..R11
export const ARM_TEMP_REGS: number[] = [8, 9, 10, 11];

// R12 reserved as Data Memory (RAM) base pointer initialized to 0
export const ARM_BASE_REG = 12;

export const ARM_COND = {
  EQ: 0x0,
  NE: 0x1,
  HS: 0x2,
  LO: 0x3,
  HI: 0x8,
  LS: 0x9,
  GE: 0xa,
  LT: 0xb,
  GT: 0xc,
  LE: 0xd,
  AL: 0xe,
} as const;

export const ARM_COND_NAME: Record<number, string> = {
  0x0: 'EQ',
  0x1: 'NE',
  0x2: 'HS',
  0x3: 'LO',
  0x8: 'HI',
  0x9: 'LS',
  0xa: 'GE',
  0xb: 'LT',
  0xc: 'GT',
  0xd: 'LE',
  0xe: 'AL',
};

export type ArmMnemonic =
  // R-Type data processing reg-reg & reg-shift (11)
  | 'ADD'
  | 'SUB'
  | 'AND'
  | 'ORR'
  | 'EOR'
  | 'MOV'
  | 'MVN'
  | 'CMP'
  | 'LSL'
  | 'LSR'
  | 'ASR'
  // I-Type data processing imm & imm-shift (12)
  | 'ADDI'
  | 'SUBI'
  | 'RSBI'
  | 'ANDI'
  | 'ORRI'
  | 'EORI'
  | 'MOVI'
  | 'MVNI'
  | 'CMPI'
  | 'LSLI'
  | 'LSRI'
  | 'ASRI'
  // L-Type / S-Type (2)
  | 'LDR'
  | 'STR'
  // B-Type branches (11)
  | 'B'
  | 'BEQ'
  | 'BNE'
  | 'BHS'
  | 'BLO'
  | 'BHI'
  | 'BLS'
  | 'BGE'
  | 'BLT'
  | 'BGT'
  | 'BLE';

export interface ArmIsaSpec {
  mnemonic: ArmMnemonic;
  asmOp: string; // e.g. 'ADD', 'MOV', 'CMP', 'BEQ'
  tipo: InstrCategory;
  cmd?: number; // 4-bit data-processing opcode
  sBit?: number;
  shiftType?: number; // 0=LSL, 1=LSR, 2=ASR
  isShiftReg?: boolean;
  isShiftImm?: boolean;
  isImm?: boolean;
  cond?: number;
  descripcion: string;
}

export const SUPPORTED_ARM_ISA: Record<ArmMnemonic, ArmIsaSpec> = {
  // R-Type (reg-reg)
  ADD: { mnemonic: 'ADD', asmOp: 'ADD', tipo: 'R', cmd: 0b0100, sBit: 0, descripcion: 'Suma de registros (Rd = Rn + Rm)' },
  SUB: { mnemonic: 'SUB', asmOp: 'SUB', tipo: 'R', cmd: 0b0010, sBit: 0, descripcion: 'Resta de registros (Rd = Rn - Rm)' },
  AND: { mnemonic: 'AND', asmOp: 'AND', tipo: 'R', cmd: 0b0000, sBit: 0, descripcion: 'AND bit a bit (Rd = Rn & Rm)' },
  ORR: { mnemonic: 'ORR', asmOp: 'ORR', tipo: 'R', cmd: 0b1100, sBit: 0, descripcion: 'OR inclusivo bit a bit (Rd = Rn | Rm)' },
  EOR: { mnemonic: 'EOR', asmOp: 'EOR', tipo: 'R', cmd: 0b0001, sBit: 0, descripcion: 'OR exclusivo bit a bit (Rd = Rn ^ Rm)' },
  MOV: { mnemonic: 'MOV', asmOp: 'MOV', tipo: 'R', cmd: 0b1101, sBit: 0, descripcion: 'Copia registro (Rd = Rm)' },
  MVN: { mnemonic: 'MVN', asmOp: 'MVN', tipo: 'R', cmd: 0b1111, sBit: 0, descripcion: 'Complemento bit a bit (Rd = ~Rm)' },
  CMP: { mnemonic: 'CMP', asmOp: 'CMP', tipo: 'R', cmd: 0b1010, sBit: 1, descripcion: 'Compara registros (Rn - Rm) y actualiza CPSR' },
  LSL: { mnemonic: 'LSL', asmOp: 'LSL', tipo: 'R', cmd: 0b1101, sBit: 0, shiftType: 0b00, isShiftReg: true, descripcion: 'Corrimiento lógico izquierda por registro' },
  LSR: { mnemonic: 'LSR', asmOp: 'LSR', tipo: 'R', cmd: 0b1101, sBit: 0, shiftType: 0b01, isShiftReg: true, descripcion: 'Corrimiento lógico derecha por registro' },
  ASR: { mnemonic: 'ASR', asmOp: 'ASR', tipo: 'R', cmd: 0b1101, sBit: 0, shiftType: 0b10, isShiftReg: true, descripcion: 'Corrimiento aritmético derecha por registro' },

  // I-Type (rotated 8-bit immediate & shift immediate)
  ADDI: { mnemonic: 'ADDI', asmOp: 'ADD', tipo: 'I', cmd: 0b0100, sBit: 0, isImm: true, descripcion: 'Suma con inmediato rotado (Rd = Rn + #imm)' },
  SUBI: { mnemonic: 'SUBI', asmOp: 'SUB', tipo: 'I', cmd: 0b0010, sBit: 0, isImm: true, descripcion: 'Resta con inmediato rotado (Rd = Rn - #imm)' },
  RSBI: { mnemonic: 'RSBI', asmOp: 'RSB', tipo: 'I', cmd: 0b0011, sBit: 0, isImm: true, descripcion: 'Resta inversa (#imm - Rn, usado para -x)' },
  ANDI: { mnemonic: 'ANDI', asmOp: 'AND', tipo: 'I', cmd: 0b0000, sBit: 0, isImm: true, descripcion: 'AND con inmediato rotado' },
  ORRI: { mnemonic: 'ORRI', asmOp: 'ORR', tipo: 'I', cmd: 0b1100, sBit: 0, isImm: true, descripcion: 'OR con inmediato rotado' },
  EORI: { mnemonic: 'EORI', asmOp: 'EOR', tipo: 'I', cmd: 0b0001, sBit: 0, isImm: true, descripcion: 'XOR con inmediato rotado' },
  MOVI: { mnemonic: 'MOVI', asmOp: 'MOV', tipo: 'I', cmd: 0b1101, sBit: 0, isImm: true, descripcion: 'Carga inmediato rotado (Rd = #imm)' },
  MVNI: { mnemonic: 'MVNI', asmOp: 'MVN', tipo: 'I', cmd: 0b1111, sBit: 0, isImm: true, descripcion: 'Carga complemento de inmediato (Rd = ~#imm)' },
  CMPI: { mnemonic: 'CMPI', asmOp: 'CMP', tipo: 'I', cmd: 0b1010, sBit: 1, isImm: true, descripcion: 'Compara contra inmediato (Rn - #imm) y actualiza CPSR' },
  LSLI: { mnemonic: 'LSLI', asmOp: 'LSL', tipo: 'I', cmd: 0b1101, sBit: 0, shiftType: 0b00, isShiftImm: true, descripcion: 'Corrimiento lógico izquierda por inmediato' },
  LSRI: { mnemonic: 'LSRI', asmOp: 'LSR', tipo: 'I', cmd: 0b1101, sBit: 0, shiftType: 0b01, isShiftImm: true, descripcion: 'Corrimiento lógico derecha por inmediato' },
  ASRI: { mnemonic: 'ASRI', asmOp: 'ASR', tipo: 'I', cmd: 0b1101, sBit: 0, shiftType: 0b10, isShiftImm: true, descripcion: 'Corrimiento aritmético derecha por inmediato' },

  // L-Type / S-Type
  LDR: { mnemonic: 'LDR', asmOp: 'LDR', tipo: 'L', descripcion: 'Carga palabra de 32 bits desde Memoria de datos [Rn, #imm12]' },
  STR: { mnemonic: 'STR', asmOp: 'STR', tipo: 'S', descripcion: 'Guarda palabra de 32 bits en Memoria de datos [Rn, #imm12]' },

  // B-Type
  B:   { mnemonic: 'B',   asmOp: 'B',   tipo: 'B', cond: ARM_COND.AL, descripcion: 'Salto incondicional (offset relativo a PC + 8)' },
  BEQ: { mnemonic: 'BEQ', asmOp: 'BEQ', tipo: 'B', cond: ARM_COND.EQ, descripcion: 'Salta si igual (Z == 1)' },
  BNE: { mnemonic: 'BNE', asmOp: 'BNE', tipo: 'B', cond: ARM_COND.NE, descripcion: 'Salta si distinto (Z == 0)' },
  BHS: { mnemonic: 'BHS', asmOp: 'BHS', tipo: 'B', cond: ARM_COND.HS, descripcion: 'Salta si >= sin signo (C == 1)' },
  BLO: { mnemonic: 'BLO', asmOp: 'BLO', tipo: 'B', cond: ARM_COND.LO, descripcion: 'Salta si < sin signo (C == 0)' },
  BHI: { mnemonic: 'BHI', asmOp: 'BHI', tipo: 'B', cond: ARM_COND.HI, descripcion: 'Salta si > sin signo (C == 1 && Z == 0)' },
  BLS: { mnemonic: 'BLS', asmOp: 'BLS', tipo: 'B', cond: ARM_COND.LS, descripcion: 'Salta si <= sin signo (C == 0 || Z == 1)' },
  BGE: { mnemonic: 'BGE', asmOp: 'BGE', tipo: 'B', cond: ARM_COND.GE, descripcion: 'Salta si >= con signo (N == V)' },
  BLT: { mnemonic: 'BLT', asmOp: 'BLT', tipo: 'B', cond: ARM_COND.LT, descripcion: 'Salta si < con signo (N != V)' },
  BGT: { mnemonic: 'BGT', asmOp: 'BGT', tipo: 'B', cond: ARM_COND.GT, descripcion: 'Salta si > con signo (Z == 0 && N == V)' },
  BLE: { mnemonic: 'BLE', asmOp: 'BLE', tipo: 'B', cond: ARM_COND.LE, descripcion: 'Salta si <= con signo (Z == 1 || N != V)' },
};

export const ARM_MNEMONICS = Object.keys(SUPPORTED_ARM_ISA) as ArmMnemonic[];

export function isSupportedArmMnemonic(name: string): name is ArmMnemonic {
  return name in SUPPORTED_ARM_ISA;
}

export function formatArmReg(reg: number): string {
  return ARM_REG_NAMES[reg] ?? `R${reg}`;
}

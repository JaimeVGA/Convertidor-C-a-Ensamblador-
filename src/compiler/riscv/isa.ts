export type InstrCategory = 'R' | 'I' | 'L' | 'S' | 'B';

export type SupportedMnemonic =
  // R-Type (10)
  | 'ADD'
  | 'SUB'
  | 'SLL'
  | 'SLT'
  | 'SLTU'
  | 'XOR'
  | 'SRL'
  | 'SRA'
  | 'OR'
  | 'AND'
  // I-Type arithmetic (9)
  | 'ADDI'
  | 'SLLI'
  | 'SLTI'
  | 'SLTIU'
  | 'XORI'
  | 'SRLI'
  | 'SRAI'
  | 'ORI'
  | 'ANDI'
  // L-Type load (1)
  | 'LW'
  // S-Type store (1)
  | 'SW'
  // B-Type branch (6)
  | 'BEQ'
  | 'BNE'
  | 'BLT'
  | 'BGE'
  | 'BLTU'
  | 'BGEU';

export interface IsaSpec {
  mnemonic: SupportedMnemonic;
  tipo: InstrCategory;
  opcode: number;
  funct3: number;
  funct7?: number;
  isShiftImm?: boolean;
  descripcion: string;
}

export const SUPPORTED_ISA: Record<SupportedMnemonic, IsaSpec> = {
  // R-Type (opcode 0110011 = 0x33)
  ADD:  { mnemonic: 'ADD',  tipo: 'R', opcode: 0x33, funct3: 0b000, funct7: 0b0000000, descripcion: 'Suma de registros (rd = rs1 + rs2)' },
  SUB:  { mnemonic: 'SUB',  tipo: 'R', opcode: 0x33, funct3: 0b000, funct7: 0b0100000, descripcion: 'Resta de registros (rd = rs1 - rs2)' },
  SLL:  { mnemonic: 'SLL',  tipo: 'R', opcode: 0x33, funct3: 0b001, funct7: 0b0000000, descripcion: 'Corrimiento lógico a la izquierda' },
  SLT:  { mnemonic: 'SLT',  tipo: 'R', opcode: 0x33, funct3: 0b010, funct7: 0b0000000, descripcion: 'Menor que con signo (rd = (rs1 < rs2) ? 1 : 0)' },
  SLTU: { mnemonic: 'SLTU', tipo: 'R', opcode: 0x33, funct3: 0b011, funct7: 0b0000000, descripcion: 'Menor que sin signo' },
  XOR:  { mnemonic: 'XOR',  tipo: 'R', opcode: 0x33, funct3: 0b100, funct7: 0b0000000, descripcion: 'OR exclusivo bit a bit' },
  SRL:  { mnemonic: 'SRL',  tipo: 'R', opcode: 0x33, funct3: 0b101, funct7: 0b0000000, descripcion: 'Corrimiento lógico a la derecha' },
  SRA:  { mnemonic: 'SRA',  tipo: 'R', opcode: 0x33, funct3: 0b101, funct7: 0b0100000, descripcion: 'Corrimiento aritmético a la derecha' },
  OR:   { mnemonic: 'OR',   tipo: 'R', opcode: 0x33, funct3: 0b110, funct7: 0b0000000, descripcion: 'OR inclusivo bit a bit' },
  AND:  { mnemonic: 'AND',  tipo: 'R', opcode: 0x33, funct3: 0b111, funct7: 0b0000000, descripcion: 'AND bit a bit' },

  // I-Type arithmetic (opcode 0010011 = 0x13)
  ADDI:  { mnemonic: 'ADDI',  tipo: 'I', opcode: 0x13, funct3: 0b000, descripcion: 'Suma con inmediato de 12 bits' },
  SLLI:  { mnemonic: 'SLLI',  tipo: 'I', opcode: 0x13, funct3: 0b001, funct7: 0b0000000, isShiftImm: true, descripcion: 'Corrimiento lógico a la izquierda por inmediato' },
  SLTI:  { mnemonic: 'SLTI',  tipo: 'I', opcode: 0x13, funct3: 0b010, descripcion: 'Menor que inmediato con signo' },
  SLTIU: { mnemonic: 'SLTIU', tipo: 'I', opcode: 0x13, funct3: 0b011, descripcion: 'Menor que inmediato sin signo' },
  XORI:  { mnemonic: 'XORI',  tipo: 'I', opcode: 0x13, funct3: 0b100, descripcion: 'XOR con inmediato' },
  SRLI:  { mnemonic: 'SRLI',  tipo: 'I', opcode: 0x13, funct3: 0b101, funct7: 0b0000000, isShiftImm: true, descripcion: 'Corrimiento lógico a la derecha por inmediato' },
  SRAI:  { mnemonic: 'SRAI',  tipo: 'I', opcode: 0x13, funct3: 0b101, funct7: 0b0100000, isShiftImm: true, descripcion: 'Corrimiento aritmético a la derecha por inmediato' },
  ORI:   { mnemonic: 'ORI',   tipo: 'I', opcode: 0x13, funct3: 0b110, descripcion: 'OR con inmediato' },
  ANDI:  { mnemonic: 'ANDI',  tipo: 'I', opcode: 0x13, funct3: 0b111, descripcion: 'AND con inmediato' },

  // L-Type load (opcode 0000011 = 0x03)
  LW: { mnemonic: 'LW', tipo: 'L', opcode: 0x03, funct3: 0b010, descripcion: 'Carga palabra de 32 bits desde Memoria de datos' },

  // S-Type store (opcode 0100011 = 0x23)
  SW: { mnemonic: 'SW', tipo: 'S', opcode: 0x23, funct3: 0b010, descripcion: 'Guarda palabra de 32 bits en Memoria de datos' },

  // B-Type branch (opcode 1100011 = 0x63)
  BEQ:  { mnemonic: 'BEQ',  tipo: 'B', opcode: 0x63, funct3: 0b000, descripcion: 'Salta si rs1 == rs2' },
  BNE:  { mnemonic: 'BNE',  tipo: 'B', opcode: 0x63, funct3: 0b001, descripcion: 'Salta si rs1 != rs2' },
  BLT:  { mnemonic: 'BLT',  tipo: 'B', opcode: 0x63, funct3: 0b100, descripcion: 'Salta si rs1 < rs2 (con signo)' },
  BGE:  { mnemonic: 'BGE',  tipo: 'B', opcode: 0x63, funct3: 0b101, descripcion: 'Salta si rs1 >= rs2 (con signo)' },
  BLTU: { mnemonic: 'BLTU', tipo: 'B', opcode: 0x63, funct3: 0b110, descripcion: 'Salta si rs1 < rs2 (sin signo)' },
  BGEU: { mnemonic: 'BGEU', tipo: 'B', opcode: 0x63, funct3: 0b111, descripcion: 'Salta si rs1 >= rs2 (sin signo)' },
};

export const SUPPORTED_MNEMONICS = Object.keys(SUPPORTED_ISA) as SupportedMnemonic[];

export function isSupportedMnemonic(name: string): name is SupportedMnemonic {
  return name in SUPPORTED_ISA;
}

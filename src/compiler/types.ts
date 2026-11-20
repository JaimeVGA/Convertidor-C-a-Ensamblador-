import { ProgramNode } from './ast';
import { CompileError } from './errors';
import { RomDepth } from './output/vhdl';
import type { VariableSymbol } from './semantic';

export type TargetArch = 'riscv' | 'mips' | 'arm';

export type MipsArithmeticMode = 'signed' | 'unsigned';

export type InstrCategory = 'R' | 'I' | 'L' | 'S' | 'B';

export type BitFieldRole =
  | 'opcode'
  | 'cond'
  | 'rd'
  | 'funct3'
  | 'rs1'
  | 'rs2'
  | 'funct7'
  | 'imm';

export interface BitFieldSegment {
  label: string;
  bits: string;
  range: string;
  meaning: string;
  role: BitFieldRole;
}

export interface DecodedInstruction {
  mnemonic: string;
  tipo: InstrCategory;
  word: number;
  hex: string;
  bin: string;
  rd?: number;
  rs1?: number;
  rs2?: number;
  imm?: number;
  funct3?: number;
  funct7?: number;
  opcode: number;
  cond?: number;
  segments: BitFieldSegment[];
}

export interface AssembledLine {
  index: number;
  pc: number;
  pcHex: string;
  word: number;
  hex: string;
  tipo: InstrCategory;
  mnemonic: string;
  asmText: string;
  labels: string[];
  targetLabel?: string;
  cLine?: number;
  comment?: string;
  decoded: DecodedInstruction;
}

export interface IsaCatalogEntry {
  mnemonic: string;
  tipo: InstrCategory;
  descripcion: string;
}

export interface ArchMetadata {
  id: TargetArch;
  name: string;
  shortName: string;
  badge: string;
  regCount: number;
  maxVariables: number;
  varRegs: number[];
  varRegRangeLabel: string;
  tempRegs: number[];
  tempRegRangeLabel: string;
  hasZeroReg: boolean;
  hasCpsrFlags: boolean;
  formatReg: (reg: number) => string;
  formatRegBankLabel: (reg: number) => string;
}

export interface CpsrFlags {
  N: boolean;
  Z: boolean;
  C: boolean;
  V: boolean;
}

export interface VariableSimulationResult {
  name: string;
  varType: 'int' | 'unsigned';
  reg: number;
  regName: string;
  ramAddr: number;
  regValue: number;
  ramValue: number;
  displayValue: string;
  hexValue: string;
}

export interface SimulationStepResult {
  halted: boolean;
  infiniteLoopDetected: boolean;
  stepsExecuted: number;
  pc: number;
  registers: Int32Array;
  regLabels: string[];
  ram: Map<number, number>;
  variableResults: VariableSimulationResult[];
  flags?: CpsrFlags;
  error?: string;
}

export interface BackendCompileOptions {
  romDepth: RomDepth;
  mipsArithmeticMode?: MipsArithmeticMode;
}

export interface TargetBackend {
  arch: TargetArch;
  meta: ArchMetadata;
  isaCatalog: IsaCatalogEntry[];
  validateConstant: (val: number) => string | null;
  compileAst: (
    program: ProgramNode,
    variables: VariableSymbol[],
    symbolMap: Map<string, VariableSymbol>,
    options: BackendCompileOptions
  ) => { listado: AssembledLine[]; errores: CompileError[] };
  simulate: (
    listado: AssembledLine[],
    variables: VariableSymbol[],
    initialInputs: Record<string, number>,
    maxSteps?: number
  ) => SimulationStepResult;
}

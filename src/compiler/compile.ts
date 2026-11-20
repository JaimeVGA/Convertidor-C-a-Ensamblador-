import { armBackend } from './arm/backend';
import { CompileError } from './errors';
import { tokenize } from './lexer';
import { mipsBackend } from './mips/backend';
import { generateHexTxt } from './output/hexTxt';
import { generateVhdl, RomDepth } from './output/vhdl';
import { parse } from './parser';
import { riscvBackend } from './riscv/backend';
import { analyzeSemantics, VariableSymbol } from './semantic';
import type {
  ArchMetadata,
  AssembledLine,
  IsaCatalogEntry,
  MipsArithmeticMode,
  SimulationStepResult,
  TargetArch,
  TargetBackend,
} from './types';

export interface CompileOptions {
  arch?: TargetArch;
  romDepth?: RomDepth;
  mipsArithmeticMode?: MipsArithmeticMode;
}

export type CompileOutcome =
  | {
      ok: true;
      arch: TargetArch;
      archMeta: ArchMetadata;
      isaCatalog: IsaCatalogEntry[];
      mipsArithmeticMode: MipsArithmeticMode;
      listado: AssembledLine[];
      variables: VariableSymbol[];
      vhdl: string;
      hexTxt: string;
      romDepth: RomDepth;
    }
  | {
      ok: false;
      arch: TargetArch;
      errores: CompileError[];
    };

const BACKENDS: Record<TargetArch, TargetBackend> = {
  riscv: riscvBackend,
  mips: mipsBackend,
  arm: armBackend,
};

export function getBackend(arch: TargetArch): TargetBackend {
  return BACKENDS[arch] ?? riscvBackend;
}

export function simulateProgram(
  arch: TargetArch,
  listado: AssembledLine[],
  variables: VariableSymbol[],
  initialInputs: Record<string, number>,
  maxSteps?: number
): SimulationStepResult {
  return getBackend(arch).simulate(listado, variables, initialInputs, maxSteps);
}

export function compile(
  source: string,
  options: CompileOptions = {}
): CompileOutcome {
  const arch: TargetArch = options.arch ?? 'riscv';
  const romDepth: RomDepth = options.romDepth ?? 32;
  const mipsArithmeticMode: MipsArithmeticMode =
    options.mipsArithmeticMode ?? 'signed';
  const backend = getBackend(arch);

  // 1. Lexer
  const lexRes = tokenize(source);
  if (lexRes.errores.length > 0) {
    return { ok: false, arch, errores: lexRes.errores };
  }

  // 2. Parser
  const parseRes = parse(lexRes.tokens);
  if (parseRes.errores.length > 0) {
    return { ok: false, arch, errores: parseRes.errores };
  }

  // 3. Semantic analysis (parameterized by backend)
  const semRes = analyzeSemantics(parseRes.program, backend);
  if (semRes.errores.length > 0) {
    return { ok: false, arch, errores: semRes.errores };
  }

  // 4 & 5. Codegen, Assembly & Encoding
  const cgAsmRes = backend.compileAst(
    semRes.program,
    semRes.variables,
    semRes.symbolMap,
    { romDepth, mipsArithmeticMode }
  );
  if (cgAsmRes.errores.length > 0) {
    return { ok: false, arch, errores: cgAsmRes.errores };
  }

  // 6. Output artifacts
  const archLabel =
    arch === 'mips'
      ? `${backend.meta.name} (${mipsArithmeticMode === 'unsigned' ? 'ADDU/ADDIU' : 'ADD/ADDI'})`
      : backend.meta.name;
  const vhdl = generateVhdl(cgAsmRes.listado, romDepth, archLabel);
  const hexTxt = generateHexTxt(cgAsmRes.listado);

  return {
    ok: true,
    arch,
    archMeta: backend.meta,
    isaCatalog: backend.isaCatalog,
    mipsArithmeticMode,
    listado: cgAsmRes.listado,
    variables: semRes.variables,
    vhdl,
    hexTxt,
    romDepth,
  };
}

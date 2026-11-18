import { CompileError } from './errors';
import { tokenize } from './lexer';
import { generateHexTxt } from './output/hexTxt';
import { generateVhdl, RomDepth } from './output/vhdl';
import { parse } from './parser';
import { assemble, AssembledLine } from './riscv/assembler';
import { generateRiscvCode } from './riscv/codegen';
import { analyzeSemantics, VariableSymbol } from './semantic';

export interface CompileOptions {
  romDepth?: RomDepth;
}

export type CompileOutcome =
  | {
      ok: true;
      listado: AssembledLine[];
      variables: VariableSymbol[];
      vhdl: string;
      hexTxt: string;
      romDepth: RomDepth;
    }
  | {
      ok: false;
      errores: CompileError[];
    };

export function compile(
  source: string,
  options: CompileOptions = {}
): CompileOutcome {
  const romDepth: RomDepth = options.romDepth ?? 32;

  // 1. Lexer
  const lexRes = tokenize(source);
  if (lexRes.errores.length > 0) {
    return { ok: false, errores: lexRes.errores };
  }

  // 2. Parser
  const parseRes = parse(lexRes.tokens);
  if (parseRes.errores.length > 0) {
    return { ok: false, errores: parseRes.errores };
  }

  // 3. Semantic analysis
  const semRes = analyzeSemantics(parseRes.program);
  if (semRes.errores.length > 0) {
    return { ok: false, errores: semRes.errores };
  }

  // 4. RISC-V Code generation
  const cgRes = generateRiscvCode(
    semRes.program,
    semRes.variables,
    semRes.symbolMap
  );
  if (cgRes.errores.length > 0) {
    return { ok: false, errores: cgRes.errores };
  }

  // 5. Assembler & Encoder
  const asmRes = assemble(cgRes.instructions, romDepth);
  if (asmRes.errores.length > 0) {
    return { ok: false, errores: asmRes.errores };
  }

  // 6. Output artifacts
  const vhdl = generateVhdl(asmRes.listado, romDepth);
  const hexTxt = generateHexTxt(asmRes.listado);

  return {
    ok: true,
    listado: asmRes.listado,
    variables: semRes.variables,
    vhdl,
    hexTxt,
    romDepth,
  };
}

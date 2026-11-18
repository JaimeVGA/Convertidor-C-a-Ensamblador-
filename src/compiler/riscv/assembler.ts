import { CompileError, createError } from '../errors';
import {
  AsmInstruction,
  DecodedInstruction,
  decodeFields,
  encodeInstruction,
  formatAsmText,
  toHex32,
} from './encoder';
import { InstrCategory, SUPPORTED_ISA } from './isa';

export interface AssembledLine {
  index: number; // Word index 0, 1, 2, ...
  pc: number; // Byte address 0, 4, 8, ...
  pcHex: string; // e.g. "0x00"
  word: number; // 32-bit unsigned word
  hex: string; // 8-digit lowercase hex e.g. "00002503"
  tipo: InstrCategory;
  mnemonic: AsmInstruction['mnemonic'];
  asmText: string;
  labels: string[];
  targetLabel?: string;
  cLine?: number;
  comment?: string;
  decoded: DecodedInstruction;
}

export interface AssembleResult {
  listado: AssembledLine[];
  labelMap: Map<string, number>; // label -> byte address
  errores: CompileError[];
}

export function assemble(
  instructions: AsmInstruction[],
  romDepth = 32
): AssembleResult {
  const errores: CompileError[] = [];
  const labelMap = new Map<string, number>();

  // Pass 1: Record label byte addresses
  for (let i = 0; i < instructions.length; i++) {
    const pc = i * 4;
    const labels = instructions[i].labels ?? [];
    for (const lbl of labels) {
      labelMap.set(lbl, pc);
    }
  }

  // Validate ROM capacity
  if (instructions.length > romDepth) {
    errores.push(
      createError(
        1,
        1,
        `El programa compilado ocupa ${instructions.length} palabras y no cabe en la Memoria de instrucciones configurada de ${romDepth} palabras. Aumenta la profundidad de la ROM (64, 128 o 256).`
      )
    );
  }

  // Pass 2: Resolve branch offsets and encode each instruction
  const listado: AssembledLine[] = [];

  for (let i = 0; i < instructions.length; i++) {
    const instr = { ...instructions[i] };
    const pc = i * 4;
    const spec = SUPPORTED_ISA[instr.mnemonic];

    if (spec.tipo === 'B' && instr.targetLabel !== undefined) {
      const targetPc = labelMap.get(instr.targetLabel);
      if (targetPc === undefined) {
        errores.push(
          createError(
            instr.cLine ?? 1,
            1,
            `Etiqueta de salto '${instr.targetLabel}' no encontrada.`
          )
        );
        instr.imm = 0;
      } else {
        const offset = targetPc - pc;
        if (offset < -4096 || offset > 4094) {
          errores.push(
            createError(
              instr.cLine ?? 1,
              1,
              `Salto a '${instr.targetLabel}' fuera de rango para tipo B (desplazamiento ${offset} bytes).`
            )
          );
        }
        instr.imm = offset;
      }
    }

    try {
      const word = encodeInstruction(instr);
      const decoded = decodeFields(word);
      listado.push({
        index: i,
        pc,
        pcHex: `0x${pc.toString(16).padStart(2, '0')}`,
        word,
        hex: toHex32(word),
        tipo: spec.tipo,
        mnemonic: instr.mnemonic,
        asmText: formatAsmText(instr),
        labels: instr.labels ?? [],
        targetLabel: instr.targetLabel,
        cLine: instr.cLine,
        comment: instr.comment,
        decoded,
      });
    } catch (err) {
      errores.push(
        createError(
          instr.cLine ?? 1,
          1,
          err instanceof Error ? err.message : String(err)
        )
      );
    }
  }

  return { listado, labelMap, errores };
}

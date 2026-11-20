import { CompileError, createError } from '../errors';
import type { AssembledLine } from '../types';
import {
  decodeMipsFields,
  encodeMipsInstruction,
  formatMipsAsmText,
  MipsInstruction,
  toHex32,
} from './encoder';
import { SUPPORTED_MIPS_ISA } from './isa';

export interface MipsAssembleResult {
  listado: AssembledLine[];
  labelMap: Map<string, number>;
  errores: CompileError[];
}

export function assembleMips(
  instructions: MipsInstruction[],
  romDepth = 32
): MipsAssembleResult {
  const errores: CompileError[] = [];
  const labelMap = new Map<string, number>();

  for (let i = 0; i < instructions.length; i++) {
    const pc = i * 4;
    const labels = instructions[i].labels ?? [];
    for (const lbl of labels) {
      labelMap.set(lbl, pc);
    }
  }

  if (instructions.length > romDepth) {
    errores.push(
      createError(
        1,
        1,
        `El programa compilado ocupa ${instructions.length} palabras y no cabe en la Memoria de instrucciones configurada de ${romDepth} palabras. Aumenta la profundidad de la ROM (64, 128 o 256).`
      )
    );
  }

  const listado: AssembledLine[] = [];

  for (let i = 0; i < instructions.length; i++) {
    const instr = { ...instructions[i] };
    const pc = i * 4;
    const spec = SUPPORTED_MIPS_ISA[instr.mnemonic];

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
        // MIPS branch offset is in words relative to (PC + 4)
        const wordOffset = (targetPc - (pc + 4)) / 4;
        if (wordOffset < -32768 || wordOffset > 32767) {
          errores.push(
            createError(
              instr.cLine ?? 1,
              1,
              `Salto a '${instr.targetLabel}' fuera de rango para tipo B de MIPS32 (desplazamiento ${wordOffset} palabras).`
            )
          );
        }
        instr.imm = wordOffset;
      }
    }

    try {
      const word = encodeMipsInstruction(instr);
      const decoded = decodeMipsFields(word);
      listado.push({
        index: i,
        pc,
        pcHex: `0x${pc.toString(16).padStart(2, '0')}`,
        word,
        hex: toHex32(word),
        tipo: spec.tipo,
        mnemonic: instr.mnemonic,
        asmText: formatMipsAsmText(instr),
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

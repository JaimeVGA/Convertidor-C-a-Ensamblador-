import { CompileError, createError } from '../errors';
import type { AssembledLine } from '../types';
import {
  ArmInstruction,
  decodeArmFields,
  encodeArmInstruction,
  formatArmAsmText,
  toHex32,
} from './encoder';
import { SUPPORTED_ARM_ISA } from './isa';

export interface ArmAssembleResult {
  listado: AssembledLine[];
  labelMap: Map<string, number>;
  errores: CompileError[];
}

export function assembleArm(
  instructions: ArmInstruction[],
  romDepth = 32
): ArmAssembleResult {
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
    const spec = SUPPORTED_ARM_ISA[instr.mnemonic];

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
        // ARM32 branch offset is in words relative to (PC + 8)
        const wordOffset = (targetPc - (pc + 8)) / 4;
        if (wordOffset < -0x800000 || wordOffset > 0x7fffff) {
          errores.push(
            createError(
              instr.cLine ?? 1,
              1,
              `Salto a '${instr.targetLabel}' fuera de rango para ARM32.`
            )
          );
        }
        instr.imm = wordOffset;
      }
    }

    try {
      const word = encodeArmInstruction(instr);
      const decoded = decodeArmFields(word);
      listado.push({
        index: i,
        pc,
        pcHex: `0x${pc.toString(16).padStart(2, '0')}`,
        word,
        hex: toHex32(word),
        tipo: spec.tipo,
        mnemonic: instr.mnemonic,
        asmText: formatArmAsmText(instr),
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

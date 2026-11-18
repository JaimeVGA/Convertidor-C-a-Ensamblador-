import { AssembledLine } from '../riscv/assembler';

export function generateHexTxt(listado: AssembledLine[]): string {
  return listado.map((line) => line.hex).join('\n') + '\n';
}

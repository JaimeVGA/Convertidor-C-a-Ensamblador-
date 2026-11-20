import type { AssembledLine } from '../types';

export function generateHexTxt(listado: AssembledLine[]): string {
  return listado.map((line) => line.hex).join('\n') + '\n';
}

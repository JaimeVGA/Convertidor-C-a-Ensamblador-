export interface CompileError {
  linea: number;
  columna: number;
  mensaje: string;
}

export class CompilerException extends Error {
  public readonly errors: CompileError[];

  constructor(errors: CompileError | CompileError[]) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(list.map((e) => `Línea ${e.linea}: ${e.mensaje}`).join('\n'));
    this.errors = list;
  }
}

export function createError(linea: number, columna: number, mensaje: string): CompileError {
  return { linea, columna, mensaje };
}

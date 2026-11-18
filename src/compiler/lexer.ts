export type TokenType =
  | 'KEYWORD'
  | 'IDENT'
  | 'NUMBER'
  | 'OP'
  | 'PUNCT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  numValue?: number;
  linea: number;
  columna: number;
}

const SUPPORTED_KEYWORDS = new Set(['int', 'unsigned', 'if', 'else', 'while']);

const UNSUPPORTED_KEYWORDS: Record<string, string> = {
  for: "'for' no está soportado; usa 'while'.",
  do: "'do-while' no está soportado; usa 'while'.",
  switch: "'switch' no está soportado; usa 'if / else'.",
  case: "'case' no está soportado; usa 'if / else'.",
  break: "'break' no está soportado.",
  continue: "'continue' no está soportado.",
  return: "'return' y las funciones no están soportados.",
  void: "Las funciones y 'void' no están soportados.",
  char: "El tipo 'char' no está soportado; usa 'int' o 'unsigned'.",
  short: "El tipo 'short' no está soportado; usa 'int' o 'unsigned'.",
  long: "El tipo 'long' no está soportado; usa 'int' o 'unsigned'.",
  float: "Los números en punto flotante ('float') no están soportados.",
  double: "Los números en punto flotante ('double') no están soportados.",
  struct: "'struct' no está soportado.",
};

const UNSUPPORTED_OPS: Record<string, string> = {
  '&&': "El operador lógico '&&' no está soportado; usa condicionales 'if' anidados o '&' bit a bit.",
  '||': "El operador lógico '||' no está soportado; usa condicionales 'if' o '|' bit a bit.",
  '!': "El operador '!' no está soportado; usa comparaciones como '== 0' o '!= 0'.",
  '++': "El operador '++' no está soportado; usa 'x = x + 1'.",
  '--': "El operador '--' no está soportado; usa 'x = x - 1'.",
  '+=': "El operador '+=' no está soportado; usa 'x = x + y'.",
  '-=': "El operador '-=' no está soportado; usa 'x = x - y'.",
  '*=': "El operador '*=' no está soportado.",
  '/=': "El operador '/=' no está soportado.",
  '%=': "El operador '%=' no está soportado.",
  '&=': "El operador '&=' no está soportado; usa 'x = x & y'.",
  '|=': "El operador '|=' no está soportado; usa 'x = x | y'.",
  '^=': "El operador '^=' no está soportado; usa 'x = x ^ y'.",
  '<<=': "El operador '<<=' no está soportado; usa 'x = x << y'.",
  '>>=': "El operador '>>=' no está soportado; usa 'x = x >> y'.",
  '*': "El operador '*' no está soportado por el procesador (no hay instrucción MUL ni punteros).",
  '/': "El operador '/' no está soportado por el procesador (no hay instrucción DIV; usa '>>' para potencias de 2).",
  '%': "El operador '%' no está soportado por el procesador (usa '&' para máscaras de potencias de 2).",
};

import { CompileError, createError } from './errors';

export interface LexResult {
  tokens: Token[];
  errores: CompileError[];
}

export function tokenize(source: string): LexResult {
  const tokens: Token[] = [];
  const errores: CompileError[] = [];

  let i = 0;
  let linea = 1;
  let columna = 1;

  const advance = (count = 1) => {
    for (let k = 0; k < count; k++) {
      if (source[i] === '\n') {
        linea++;
        columna = 1;
      } else {
        columna++;
      }
      i++;
    }
  };

  while (i < source.length) {
    const ch = source[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // Preprocessor directives
    if (ch === '#') {
      errores.push(
        createError(linea, columna, "Las directivas de preprocesador ('#include', '#define') no están soportadas.")
      );
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }

    // Line comments //
    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }

    // Block comments /* */
    if (ch === '/' && source[i + 1] === '*') {
      const startLine = linea;
      const startCol = columna;
      advance(2);
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        advance();
      }
      if (i >= source.length) {
        errores.push(createError(startLine, startCol, 'Comentario de bloque sin cerrar (falta "*/").'));
      } else {
        advance(2);
      }
      continue;
    }

    const startLine = linea;
    const startCol = columna;

    // 3-character operators
    const threeChar = source.slice(i, i + 3);
    if (threeChar === '<<=' || threeChar === '>>=') {
      errores.push(createError(startLine, startCol, UNSUPPORTED_OPS[threeChar]));
      advance(3);
      continue;
    }

    // 2-character operators
    const twoChar = source.slice(i, i + 2);
    if (twoChar in UNSUPPORTED_OPS) {
      errores.push(createError(startLine, startCol, UNSUPPORTED_OPS[twoChar]));
      advance(2);
      continue;
    }

    if (
      twoChar === '==' ||
      twoChar === '!=' ||
      twoChar === '<=' ||
      twoChar === '>=' ||
      twoChar === '<<' ||
      twoChar === '>>'
    ) {
      tokens.push({ type: 'OP', value: twoChar, linea: startLine, columna: startCol });
      advance(2);
      continue;
    }

    // 1-character unsupported operators
    if (ch in UNSUPPORTED_OPS) {
      errores.push(createError(startLine, startCol, UNSUPPORTED_OPS[ch]));
      advance(1);
      continue;
    }

    if (ch === '[' || ch === ']') {
      errores.push(createError(startLine, startCol, 'Los arreglos ([ ]) no están soportados.'));
      advance(1);
      continue;
    }

    // 1-character supported operators
    if ('+-&|^~<>='.includes(ch)) {
      tokens.push({ type: 'OP', value: ch, linea: startLine, columna: startCol });
      advance(1);
      continue;
    }

    // Punctuation
    if ('(){};,'.includes(ch)) {
      tokens.push({ type: 'PUNCT', value: ch, linea: startLine, columna: startCol });
      advance(1);
      continue;
    }

    // Numbers (decimal and hex 0x...)
    if (ch >= '0' && ch <= '9') {
      let raw = '';
      if (ch === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        raw += source.slice(i, i + 2);
        advance(2);
        while (i < source.length && /[0-9a-fA-F]/.test(source[i])) {
          raw += source[i];
          advance();
        }
        if (raw.length <= 2) {
          errores.push(createError(startLine, startCol, `Literal hexadecimal inválido '${raw}'.`));
          continue;
        }
        const numValue = Number.parseInt(raw.slice(2), 16);
        tokens.push({ type: 'NUMBER', value: raw, numValue, linea: startLine, columna: startCol });
      } else {
        while (i < source.length && source[i] >= '0' && source[i] <= '9') {
          raw += source[i];
          advance();
        }
        if (i < source.length && /[a-zA-Z_]/.test(source[i])) {
          while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
            raw += source[i];
            advance();
          }
          errores.push(createError(startLine, startCol, `Identificador o número inválido '${raw}'.`));
          continue;
        }
        const numValue = Number.parseInt(raw, 10);
        tokens.push({ type: 'NUMBER', value: raw, numValue, linea: startLine, columna: startCol });
      }
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        ident += source[i];
        advance();
      }
      if (ident in UNSUPPORTED_KEYWORDS) {
        errores.push(createError(startLine, startCol, UNSUPPORTED_KEYWORDS[ident]));
        continue;
      }
      if (SUPPORTED_KEYWORDS.has(ident)) {
        tokens.push({ type: 'KEYWORD', value: ident, linea: startLine, columna: startCol });
      } else {
        tokens.push({ type: 'IDENT', value: ident, linea: startLine, columna: startCol });
      }
      continue;
    }

    errores.push(createError(startLine, startCol, `Carácter no reconocido '${ch}'.`));
    advance();
  }

  tokens.push({ type: 'EOF', value: '', linea, columna });
  return { tokens, errores };
}

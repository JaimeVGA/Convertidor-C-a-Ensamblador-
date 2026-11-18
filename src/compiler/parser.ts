import { BinaryOp, ExprNode, ProgramNode, StmtNode, UnaryOp, VarDataType } from './ast';
import { CompileError, createError } from './errors';
import { Token } from './lexer';

export interface ParseResult {
  program: ProgramNode;
  errores: CompileError[];
}

export function parse(tokens: Token[]): ParseResult {
  let pos = 0;
  const errores: CompileError[] = [];

  const peek = (offset = 0): Token => {
    const idx = pos + offset;
    return idx < tokens.length ? tokens[idx] : tokens[tokens.length - 1];
  };

  const isAtEnd = (): boolean => peek().type === 'EOF';

  const advance = (): Token => {
    const tok = peek();
    if (!isAtEnd()) pos++;
    return tok;
  };

  const match = (type: Token['type'], value?: string): Token | null => {
    const tok = peek();
    if (tok.type === type && (value === undefined || tok.value === value)) {
      return advance();
    }
    return null;
  };

  const expect = (type: Token['type'], value: string | undefined, errMsg: string): Token | null => {
    const tok = match(type, value);
    if (!tok) {
      const cur = peek();
      errores.push(createError(cur.linea, cur.columna, errMsg));
      return null;
    }
    return tok;
  };

  const syncToNextStmt = () => {
    while (!isAtEnd()) {
      const tok = advance();
      if (tok.type === 'PUNCT' && (tok.value === ';' || tok.value === '}')) {
        return;
      }
      const next = peek();
      if (
        next.type === 'KEYWORD' &&
        (next.value === 'int' || next.value === 'unsigned' || next.value === 'if' || next.value === 'while')
      ) {
        return;
      }
    }
  };

  const parseType = (): { varType: VarDataType; linea: number; columna: number } | null => {
    const first = peek();
    if (first.type === 'KEYWORD' && first.value === 'unsigned') {
      advance();
      // Optional 'int' after 'unsigned'
      match('KEYWORD', 'int');
      return { varType: 'unsigned', linea: first.linea, columna: first.columna };
    }
    if (first.type === 'KEYWORD' && first.value === 'int') {
      advance();
      return { varType: 'int', linea: first.linea, columna: first.columna };
    }
    return null;
  };

  const parseStmt = (insideBlock: boolean): StmtNode | null => {
    const cur = peek();

    // Check if user wrote `int main() { ... }`
    if (
      !insideBlock &&
      cur.type === 'KEYWORD' &&
      cur.value === 'int' &&
      peek(1).type === 'IDENT' &&
      peek(1).value === 'main' &&
      peek(2).type === 'PUNCT' &&
      peek(2).value === '('
    ) {
      errores.push(
        createError(
          cur.linea,
          cur.columna,
          "No es necesario declarar 'int main()'; escribe las variables e instrucciones directamente en el nivel superior."
        )
      );
      syncToNextStmt();
      return null;
    }

    // Variable declaration
    if (cur.type === 'KEYWORD' && (cur.value === 'int' || cur.value === 'unsigned')) {
      const typeInfo = parseType()!;
      if (insideBlock) {
        errores.push(
          createError(
            typeInfo.linea,
            typeInfo.columna,
            'Las declaraciones de variables solo se permiten en el nivel superior (fuera de bloques if/while).'
          )
        );
      }
      const ident = expect('IDENT', undefined, 'Se esperaba un nombre de variable después del tipo.');
      if (!ident) {
        syncToNextStmt();
        return null;
      }

      if (match('PUNCT', '(')) {
        errores.push(
          createError(ident.linea, ident.columna, `Las funciones ('${ident.value}') no están soportadas.`)
        );
        syncToNextStmt();
        return null;
      }

      let init: ExprNode | undefined;
      if (match('OP', '=')) {
        const expr = parseExpr();
        if (!expr) {
          syncToNextStmt();
          return null;
        }
        init = expr;
      }

      if (!expect('PUNCT', ';', "Falta ';' al final de la declaración de variable.")) {
        syncToNextStmt();
        return null;
      }

      return {
        kind: 'VarDecl',
        varType: typeInfo.varType,
        name: ident.value,
        init,
        linea: typeInfo.linea,
        columna: typeInfo.columna,
      };
    }

    // If statement
    if (match('KEYWORD', 'if')) {
      if (!expect('PUNCT', '(', "Se esperaba '(' después de 'if'.")) {
        syncToNextStmt();
        return null;
      }
      const condition = parseExpr();
      if (!condition) {
        syncToNextStmt();
        return null;
      }
      if (!expect('PUNCT', ')', "Se esperaba ')' después de la condición del 'if'.")) {
        syncToNextStmt();
        return null;
      }
      const thenBranch = parseBlockOrSingleStmt();
      if (!thenBranch) return null;

      let elseBranch: StmtNode[] | undefined;
      if (match('KEYWORD', 'else')) {
        const parsedElse = parseBlockOrSingleStmt();
        if (!parsedElse) return null;
        elseBranch = parsedElse;
      }

      return {
        kind: 'If',
        condition,
        thenBranch,
        elseBranch,
        linea: cur.linea,
        columna: cur.columna,
      };
    }

    // While statement
    if (match('KEYWORD', 'while')) {
      if (!expect('PUNCT', '(', "Se esperaba '(' después de 'while'.")) {
        syncToNextStmt();
        return null;
      }
      const condition = parseExpr();
      if (!condition) {
        syncToNextStmt();
        return null;
      }
      if (!expect('PUNCT', ')', "Se esperaba ')' después de la condición del 'while'.")) {
        syncToNextStmt();
        return null;
      }
      const body = parseBlockOrSingleStmt();
      if (!body) return null;

      return {
        kind: 'While',
        condition,
        body,
        linea: cur.linea,
        columna: cur.columna,
      };
    }

    // Assignment: IDENT = expr ;
    if (cur.type === 'IDENT') {
      const ident = advance();
      if (match('PUNCT', '(')) {
        errores.push(
          createError(ident.linea, ident.columna, `Las llamadas a funciones ('${ident.value}()') no están soportadas.`)
        );
        syncToNextStmt();
        return null;
      }
      if (!expect('OP', '=', `Se esperaba '=' después de '${ident.value}'.`)) {
        syncToNextStmt();
        return null;
      }
      const value = parseExpr();
      if (!value) {
        syncToNextStmt();
        return null;
      }
      if (!expect('PUNCT', ';', "Falta ';' al final de la asignación.")) {
        syncToNextStmt();
        return null;
      }
      return {
        kind: 'Assign',
        name: ident.value,
        value,
        linea: ident.linea,
        columna: ident.columna,
      };
    }

    errores.push(
      createError(cur.linea, cur.columna, `Instrucción inesperada '${cur.value || cur.type}'.`)
    );
    syncToNextStmt();
    return null;
  };

  const parseBlockOrSingleStmt = (): StmtNode[] | null => {
    if (match('PUNCT', '{')) {
      const stmts: StmtNode[] = [];
      while (!isAtEnd() && !(peek().type === 'PUNCT' && peek().value === '}')) {
        const s = parseStmt(true);
        if (s) stmts.push(s);
      }
      expect('PUNCT', '}', "Falta '}' para cerrar el bloque.");
      return stmts;
    } else {
      const s = parseStmt(true);
      return s ? [s] : null;
    }
  };

  // Precedence climbing:
  // 1. Bitwise OR: |
  // 2. Bitwise XOR: ^
  // 3. Bitwise AND: &
  // 4. Equality: ==, !=
  // 5. Relational: <, <=, >, >=
  // 6. Shift: <<, >>
  // 7. Additive: +, -
  // 8. Unary: -, ~
  // 9. Primary: NUMBER, IDENT, ( expr )

  const parseExpr = (): ExprNode | null => parseBitOr();

  const parseBitOr = (): ExprNode | null => {
    let left = parseBitXor();
    if (!left) return null;
    while (match('OP', '|')) {
      const right = parseBitXor();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op: '|', left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseBitXor = (): ExprNode | null => {
    let left = parseBitAnd();
    if (!left) return null;
    while (match('OP', '^')) {
      const right = parseBitAnd();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op: '^', left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseBitAnd = (): ExprNode | null => {
    let left = parseEquality();
    if (!left) return null;
    while (match('OP', '&')) {
      const right = parseEquality();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op: '&', left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseEquality = (): ExprNode | null => {
    let left = parseRelational();
    if (!left) return null;
    while (peek().type === 'OP' && (peek().value === '==' || peek().value === '!=')) {
      const op = advance().value as BinaryOp;
      const right = parseRelational();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op, left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseRelational = (): ExprNode | null => {
    let left = parseShift();
    if (!left) return null;
    while (
      peek().type === 'OP' &&
      (peek().value === '<' || peek().value === '<=' || peek().value === '>' || peek().value === '>=')
    ) {
      const op = advance().value as BinaryOp;
      const right = parseShift();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op, left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseShift = (): ExprNode | null => {
    let left = parseAdditive();
    if (!left) return null;
    while (peek().type === 'OP' && (peek().value === '<<' || peek().value === '>>')) {
      const op = advance().value as BinaryOp;
      const right = parseAdditive();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op, left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseAdditive = (): ExprNode | null => {
    let left = parseUnary();
    if (!left) return null;
    while (peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = advance().value as BinaryOp;
      const right = parseUnary();
      if (!right) return null;
      left = { kind: 'BinaryExpr', op, left, right, linea: left.linea, columna: left.columna };
    }
    return left;
  };

  const parseUnary = (): ExprNode | null => {
    const cur = peek();
    if (cur.type === 'OP' && (cur.value === '-' || cur.value === '~')) {
      const opTok = advance();
      const operand = parseUnary();
      if (!operand) return null;
      // Fold negative number literal right away when possible (e.g., -5)
      if (opTok.value === '-' && operand.kind === 'NumberLiteral') {
        return {
          kind: 'NumberLiteral',
          value: -operand.value,
          raw: `-${operand.raw}`,
          linea: opTok.linea,
          columna: opTok.columna,
        };
      }
      return {
        kind: 'UnaryExpr',
        op: opTok.value as UnaryOp,
        operand,
        linea: opTok.linea,
        columna: opTok.columna,
      };
    }
    return parsePrimary();
  };

  const parsePrimary = (): ExprNode | null => {
    const cur = peek();
    if (cur.type === 'NUMBER') {
      advance();
      return {
        kind: 'NumberLiteral',
        value: cur.numValue!,
        raw: cur.value,
        linea: cur.linea,
        columna: cur.columna,
      };
    }
    if (cur.type === 'IDENT') {
      advance();
      if (match('PUNCT', '(')) {
        errores.push(
          createError(cur.linea, cur.columna, `Las llamadas a funciones ('${cur.value}()') no están soportadas.`)
        );
        return null;
      }
      return {
        kind: 'Identifier',
        name: cur.value,
        linea: cur.linea,
        columna: cur.columna,
      };
    }
    if (match('PUNCT', '(')) {
      const inner = parseExpr();
      if (!inner) return null;
      if (!expect('PUNCT', ')', "Se esperaba ')' para cerrar la expresión entre paréntesis.")) {
        return null;
      }
      return inner;
    }

    errores.push(
      createError(cur.linea, cur.columna, `Se esperaba una expresión, pero se encontró '${cur.value || 'fin de archivo'}'.`)
    );
    return null;
  };

  const body: StmtNode[] = [];
  while (!isAtEnd()) {
    const stmt = parseStmt(false);
    if (stmt) body.push(stmt);
  }

  return {
    program: { kind: 'Program', body },
    errores,
  };
}

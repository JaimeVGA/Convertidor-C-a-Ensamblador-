import { ExprNode, ProgramNode, StmtNode, VarDataType } from './ast';
import { CompileError, createError } from './errors';

export interface VariableSymbol {
  name: string;
  varType: VarDataType;
  reg: number; // x10 .. x27
  ramAddr: number; // 0, 4, 8, ...
  isInput: boolean; // declared without initializer
  linea: number;
}

export interface SemanticResult {
  program: ProgramNode;
  variables: VariableSymbol[];
  symbolMap: Map<string, VariableSymbol>;
  errores: CompileError[];
}

const MAX_VARIABLES = 18; // x10..x27

export function fitsInImm12(val: number): boolean {
  return val >= -2048 && val <= 2047;
}

export function analyzeSemantics(program: ProgramNode): SemanticResult {
  const errores: CompileError[] = [];
  const variables: VariableSymbol[] = [];
  const symbolMap = new Map<string, VariableSymbol>();

  // Fold constants and infer expression types
  const checkAndFoldExpr = (expr: ExprNode): ExprNode => {
    switch (expr.kind) {
      case 'NumberLiteral': {
        expr.inferredType = 'int';
        return expr;
      }
      case 'Identifier': {
        const sym = symbolMap.get(expr.name);
        if (!sym) {
          errores.push(
            createError(expr.linea, expr.columna, `La variable '${expr.name}' no ha sido declarada.`)
          );
          expr.inferredType = 'int';
        } else {
          expr.inferredType = sym.varType;
        }
        return expr;
      }
      case 'UnaryExpr': {
        const operand = checkAndFoldExpr(expr.operand);
        expr.operand = operand;
        expr.inferredType = operand.inferredType ?? 'int';

        if (operand.kind === 'NumberLiteral') {
          const val = expr.op === '-' ? (-operand.value) | 0 : (~operand.value) | 0;
          return {
            kind: 'NumberLiteral',
            value: val,
            raw: String(val),
            linea: expr.linea,
            columna: expr.columna,
            inferredType: expr.inferredType,
          };
        }
        return expr;
      }
      case 'BinaryExpr': {
        const left = checkAndFoldExpr(expr.left);
        const right = checkAndFoldExpr(expr.right);
        expr.left = left;
        expr.right = right;

        const isUnsigned = left.inferredType === 'unsigned' || right.inferredType === 'unsigned';
        // Relational and equality results are int (0 or 1), but we still need operand unsignedness during codegen
        if (['==', '!=', '<', '<=', '>', '>='].includes(expr.op)) {
          expr.inferredType = 'int';
        } else if (expr.op === '<<' || expr.op === '>>') {
          expr.inferredType = left.inferredType ?? 'int';
        } else {
          expr.inferredType = isUnsigned ? 'unsigned' : 'int';
        }

        // Constant folding when both sides are NumberLiteral
        if (left.kind === 'NumberLiteral' && right.kind === 'NumberLiteral') {
          const a = left.value | 0;
          const b = right.value | 0;
          let folded: number;
          switch (expr.op) {
            case '+':
              folded = (a + b) | 0;
              break;
            case '-':
              folded = (a - b) | 0;
              break;
            case '&':
              folded = a & b;
              break;
            case '|':
              folded = a | b;
              break;
            case '^':
              folded = a ^ b;
              break;
            case '<<':
              folded = a << (b & 31);
              break;
            case '>>':
              folded = left.inferredType === 'unsigned' ? (a >>> (b & 31)) | 0 : a >> (b & 31);
              break;
            case '==':
              folded = a === b ? 1 : 0;
              break;
            case '!=':
              folded = a !== b ? 1 : 0;
              break;
            case '<':
              folded = isUnsigned ? (a >>> 0 < b >>> 0 ? 1 : 0) : a < b ? 1 : 0;
              break;
            case '<=':
              folded = isUnsigned ? (a >>> 0 <= b >>> 0 ? 1 : 0) : a <= b ? 1 : 0;
              break;
            case '>':
              folded = isUnsigned ? (a >>> 0 > b >>> 0 ? 1 : 0) : a > b ? 1 : 0;
              break;
            case '>=':
              folded = isUnsigned ? (a >>> 0 >= b >>> 0 ? 1 : 0) : a >= b ? 1 : 0;
              break;
          }
          return {
            kind: 'NumberLiteral',
            value: folded,
            raw: String(folded),
            linea: expr.linea,
            columna: expr.columna,
            inferredType: expr.inferredType,
          };
        }

        // Validate shift constant range if right is NumberLiteral on << or >>
        if ((expr.op === '<<' || expr.op === '>>') && right.kind === 'NumberLiteral') {
          if (right.value < 0 || right.value > 31) {
            errores.push(
              createError(
                right.linea,
                right.columna,
                `El desplazamiento ${right.value} está fuera de rango (debe estar entre 0 y 31).`
              )
            );
          }
        }

        return expr;
      }
    }
  };

  const validateImm12InExpr = (expr: ExprNode) => {
    switch (expr.kind) {
      case 'NumberLiteral': {
        if (!fitsInImm12(expr.value)) {
          errores.push(
            createError(
              expr.linea,
              expr.columna,
              `La constante ${expr.value} no cabe en un inmediato de 12 bits (−2048..2047) y el procesador no tiene instrucción LUI.`
            )
          );
        }
        break;
      }
      case 'UnaryExpr':
        validateImm12InExpr(expr.operand);
        break;
      case 'BinaryExpr':
        validateImm12InExpr(expr.left);
        // Note: For `a - 2048`, `-2048` negated is `+2048` which doesn't fit in ADDI, so codegen will load `-2048` into temp and use SUB
        validateImm12InExpr(expr.right);
        break;
      case 'Identifier':
        break;
    }
  };

  const checkStmt = (stmt: StmtNode, topLevel: boolean) => {
    switch (stmt.kind) {
      case 'VarDecl': {
        if (!topLevel) {
          errores.push(
            createError(
              stmt.linea,
              stmt.columna,
              'Las declaraciones de variables solo se permiten fuera de los bloques if/while.'
            )
          );
          return;
        }
        if (stmt.name === 'fin') {
          errores.push(
            createError(
              stmt.linea,
              stmt.columna,
              "El nombre 'fin' está reservado para la etiqueta de término del programa."
            )
          );
          return;
        }
        if (symbolMap.has(stmt.name)) {
          errores.push(
            createError(stmt.linea, stmt.columna, `La variable '${stmt.name}' ya fue declarada anteriormente.`)
          );
          return;
        }
        if (variables.length >= MAX_VARIABLES) {
          errores.push(
            createError(
              stmt.linea,
              stmt.columna,
              `Se superó el límite máximo de ${MAX_VARIABLES} variables (registros x10..x27 agotados).`
            )
          );
          return;
        }
        if (stmt.init) {
          stmt.init = checkAndFoldExpr(stmt.init);
          validateImm12InExpr(stmt.init);
        }
        const idx = variables.length;
        const sym: VariableSymbol = {
          name: stmt.name,
          varType: stmt.varType,
          reg: 10 + idx,
          ramAddr: idx * 4,
          isInput: stmt.init === undefined,
          linea: stmt.linea,
        };
        variables.push(sym);
        symbolMap.set(stmt.name, sym);
        break;
      }
      case 'Assign': {
        const sym = symbolMap.get(stmt.name);
        if (!sym) {
          errores.push(
            createError(stmt.linea, stmt.columna, `La variable '${stmt.name}' no ha sido declarada.`)
          );
        }
        stmt.value = checkAndFoldExpr(stmt.value);
        validateImm12InExpr(stmt.value);
        break;
      }
      case 'If': {
        stmt.condition = checkAndFoldExpr(stmt.condition);
        validateImm12InExpr(stmt.condition);
        for (const s of stmt.thenBranch) checkStmt(s, false);
        if (stmt.elseBranch) {
          for (const s of stmt.elseBranch) checkStmt(s, false);
        }
        break;
      }
      case 'While': {
        stmt.condition = checkAndFoldExpr(stmt.condition);
        validateImm12InExpr(stmt.condition);
        for (const s of stmt.body) checkStmt(s, false);
        break;
      }
    }
  };

  for (const stmt of program.body) {
    checkStmt(stmt, true);
  }

  return { program, variables, symbolMap, errores };
}

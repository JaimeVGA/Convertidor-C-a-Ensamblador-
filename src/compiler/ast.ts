export type VarDataType = 'int' | 'unsigned';

export type BinaryOp =
  | '+'
  | '-'
  | '&'
  | '|'
  | '^'
  | '<<'
  | '>>'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>=';

export type UnaryOp = '-' | '~';

export type ExprNode =
  | {
      kind: 'NumberLiteral';
      value: number;
      raw: string;
      linea: number;
      columna: number;
      inferredType?: VarDataType;
    }
  | {
      kind: 'Identifier';
      name: string;
      linea: number;
      columna: number;
      inferredType?: VarDataType;
    }
  | {
      kind: 'UnaryExpr';
      op: UnaryOp;
      operand: ExprNode;
      linea: number;
      columna: number;
      inferredType?: VarDataType;
    }
  | {
      kind: 'BinaryExpr';
      op: BinaryOp;
      left: ExprNode;
      right: ExprNode;
      linea: number;
      columna: number;
      inferredType?: VarDataType;
    };

export type StmtNode =
  | {
      kind: 'VarDecl';
      varType: VarDataType;
      name: string;
      init?: ExprNode;
      linea: number;
      columna: number;
    }
  | {
      kind: 'Assign';
      name: string;
      value: ExprNode;
      linea: number;
      columna: number;
    }
  | {
      kind: 'If';
      condition: ExprNode;
      thenBranch: StmtNode[];
      elseBranch?: StmtNode[];
      linea: number;
      columna: number;
    }
  | {
      kind: 'While';
      condition: ExprNode;
      body: StmtNode[];
      linea: number;
      columna: number;
    };

export interface ProgramNode {
  kind: 'Program';
  body: StmtNode[];
}

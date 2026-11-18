export interface CodeExample {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  codigo: string;
  entradasPorDefecto: Record<string, number>;
}

export const EXAMPLES: CodeExample[] = [
  {
    id: 'collatz',
    titulo: 'Conjetura de Collatz (3n + 1)',
    subtitulo: 'Tu programa de referencia en C',
    descripcion:
      'Calcula cuántos pasos toma llegar a 1 desde n: si es par divide entre 2 (>> 1), si es impar calcula 3n + 1.',
    codigo: `// Conjetura de Collatz (3n + 1)
// Entrada desde RAM[0]: n
unsigned n;
int pasos = 0;

while (n != 1) {
    if ((n & 1) == 0) {
        n = n >> 1;
    } else {
        n = n + (n << 1) + 1;
    }
    pasos = pasos + 1;
}
`,
    entradasPorDefecto: { n: 6 },
  },
  {
    id: 'suma_n',
    titulo: 'Suma Acumulada (1 .. n)',
    subtitulo: 'Ciclo while + acumulador',
    descripcion:
      'Suma todos los enteros desde 1 hasta n y guarda el total en la Memoria de datos.',
    codigo: `// Suma acumulada de 1 hasta n
int n;
int suma = 0;
int i = 1;

while (i <= n) {
    suma = suma + i;
    i = i + 1;
}
`,
    entradasPorDefecto: { n: 10 },
  },
  {
    id: 'mcd_euclides',
    titulo: 'Máximo Común Divisor (MCD)',
    subtitulo: 'Algoritmo de Euclides por restas',
    descripcion:
      'Encuentra el MCD de dos entradas a y b usando únicamente restas y comparaciones tipo B.',
    codigo: `// Algoritmo de Euclides por restas sucesivas
int a;
int b;

while (a != b) {
    if (a > b) {
        a = a - b;
    } else {
        b = b - a;
    }
}
`,
    entradasPorDefecto: { a: 48, b: 18 },
  },
  {
    id: 'bits_popcount',
    titulo: 'Contador de Bits en 1 (Popcount)',
    subtitulo: 'Operaciones lógicas y corrimientos',
    descripcion:
      'Cuenta cuántos bits en 1 tiene una palabra sin signo usando ANDI y SRLI.',
    codigo: `// Cuenta cuántos bits en 1 tiene 'valor'
unsigned valor;
int unos = 0;

while (valor != 0) {
    unos = unos + (valor & 1);
    valor = valor >> 1;
}
`,
    entradasPorDefecto: { valor: 0b10110111 },
  },
  {
    id: 'max_abs',
    titulo: 'Máximo y Valor Absoluto',
    subtitulo: 'Condicionales if/else con signo',
    descripcion:
      'Calcula el valor absoluto de dos números con signo y determina cuál es el mayor.',
    codigo: `// Valor absoluto y máximo entre dos enteros con signo
int x;
int y;
int max = 0;

if (x < 0) {
    x = -x;
}
if (y < 0) {
    y = -y;
}

if (x >= y) {
    max = x;
} else {
    max = y;
}
`,
    entradasPorDefecto: { x: -25, y: 14 },
  },
];

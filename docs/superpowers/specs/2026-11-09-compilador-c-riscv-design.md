# Especificación de Diseño: Compilador web de C → RISC-V (Set soportado) con memoria de instrucciones VHDL

## Objetivo

Una página web (React + Vite + TypeScript) que corre **100 % en el navegador** y se despliega en **Vercel** como sitio estático. El usuario escribe un programa sencillo en C y la página:

1. Lo compila a ensamblador RISC-V usando **solo** las 27 instrucciones que soporta su procesador en Active-HDL.
2. Muestra cada instrucción con su **Palabra de instrucción** (hex de 32 bits) y una vista por campos.
3. Genera `instruction_memory.vhdl` **idéntico en estructura** a la plantilla del usuario, y un `.txt` con una palabra hex por línea.
4. Permite **simular** el programa en la página antes de llevarlo a Active-HDL.

Toda la interfaz y los mensajes van en **español**.

## Set soportado

- **R**: `ADD`, `SUB`, `SLL`, `SLT`, `SLTU`, `XOR`, `SRL`, `SRA`, `OR`, `AND`
- **I**: `ADDI`, `SLLI`, `SLTI`, `SLTIU`, `XORI`, `SRLI`, `SRAI`, `ORI`, `ANDI`
- **L**: `LW`
- **S**: `SW`
- **B**: `BEQ`, `BNE`, `BLT`, `BGE`, `BLTU`, `BGEU`

Sin `LUI`, `AUIPC`, `JAL` ni `JALR`.

## Subconjunto de C acordado

| Sí se soporta | Fuera (marca error claro) |
|---|---|
| `int` y `unsigned` (32 bits) | `for`, `do-while`, `switch` |
| `if` / `else`, `while` | `&&`, `\|\|`, `!` |
| Asignación `=` | `+=` y demás compuestos, `++` / `--` |
| `+ - & \| ^ << >>`, `-x`, `~x` | `*`, `/`, `%` |
| `== != < <= > >=` | `break`, `continue` |
| Paréntesis, comentarios `//` y `/* */` | funciones, arreglos, punteros |
| Literales decimales y hex (`0x1F`) | constantes fuera de −2048..2047 |

## Reglas de generación de código

- Variables asignadas a registros `x10` .. `x27` (máximo 18) y direcciones de RAM `0, 4, 8, ...` en orden de declaración.
- Registros temporales: `x5, x6, x7, x28, x29, x30, x31` (7 temporales).
- `x0` siempre vale cero.
- Variable de entrada (`int n;`): genera `LW x(10+k), 4k(x0)` en el punto de la declaración.
- Variable inicializada (`int c = 5;`): evalúa la expresión directamente en `x(10+k)`.
- Epílogo: `SW` de cada Variable a su dirección de RAM y luego `fin: BEQ x0, x0, fin`.
- Etiquetas en español: `mientras_N`, `finmientras_N`, `sino_N`, `finsi_N` y `fin`.

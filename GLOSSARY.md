# Glosario

Vocabulario del dominio del compilador C → RISC-V y su memoria de instrucciones VHDL.

## Procesador objetivo

**Procesador objetivo**
El procesador RISC-V de 32 bits que el usuario simula en Active-HDL. Solo ejecuta el **Set soportado**; todo lo que el compilador emite debe pertenecer a él.

**Set soportado**
Las 27 instrucciones que el Procesador objetivo ejecuta: ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR, AND, ADDI, SLLI, SLTI, SLTIU, XORI, SRLI, SRAI, ORI, ANDI, LW, SW, BEQ, BNE, BLT, BGE, BLTU, BGEU.
_Evitar_: "RV32I" (el Set soportado es un subconjunto de RV32I: no incluye LUI, AUIPC, JAL, JALR, ni loads/stores de byte o media palabra).

**Tipo de instrucción**
Clasificación de una instrucción del Set soportado según su formato: **R** (registro-registro), **I** (aritmética con inmediato), **L** (carga desde Memoria de datos), **S** (almacenamiento en Memoria de datos), **B** (salto condicional).
_Nota_: en la especificación oficial de RISC-V, las cargas usan el formato I; en este proyecto se distinguen como tipo **L**.

**Salto incondicional**
Un salto que siempre se toma. Como no existe el tipo J, se expresa como `BEQ x0, x0, etiqueta`.

**Ciclo de fin**
La última instrucción de todo programa: `fin: BEQ x0, x0, fin`. Detiene al procesador saltando sobre sí misma.

## Memorias y registros

**Banco de registros**
Los 32 registros de 32 bits (`x0`–`x31`) del Procesador objetivo. `x0` siempre vale cero.

**Memoria de datos (RAM)**
Memoria de palabras de 32 bits, accedida solo con LW y SW, donde viven los valores de entrada y los resultados observables en la simulación.

**Memoria de instrucciones**
ROM de solo lectura con una entrada (dirección proveniente del PC) y una salida (la instrucción de 32 bits). Es el artefacto VHDL que genera el compilador.

## Programa en C

**Variable**
Un entero de 32 bits declarado como `int` (con signo) o `unsigned` (sin signo). Cada Variable tiene un registro fijo en el Banco de registros y una dirección fija en la Memoria de datos, ambos asignados en orden de declaración.

**Variable de entrada**
Una Variable declarada sin valor inicial (`int n;`). Su valor se lee de la Memoria de datos al inicio del programa.
_Evitar_: "variable sin inicializar" (aquí sí tiene valor: el que haya en la RAM).

**Resultado**
El valor final de cada Variable, que se escribe en su dirección de la Memoria de datos justo antes del Ciclo de fin.

## Salidas

**Palabra de instrucción**
La codificación binaria de 32 bits de una instrucción, mostrada en hexadecimal de 8 dígitos (p. ej. `00500093`).

**Simulador integrado**
Ejecución en la página del programa compilado sobre un modelo del Procesador objetivo, para ver los Resultados antes de llevarlo a Active-HDL.

# Glosario

Vocabulario del dominio del compilador multi-arquitectura (C → RISC-V / MIPS32 / ARM32) y su memoria de instrucciones VHDL.

## Procesador objetivo

**Procesador objetivo**
El procesador de 32 bits (**RISC-V**, **MIPS32** o **ARM32**) que el usuario simula en Active-HDL o en el Simulador integrado. Solo ejecuta el **Set soportado** de la arquitectura activa.

**Set soportado**
- **RISC-V (27 instrucciones):** `ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR, AND, ADDI, SLLI, SLTI, SLTIU, XORI, SRLI, SRAI, ORI, ANDI, LW, SW, BEQ, BNE, BLT, BGE, BLTU, BGEU`.
- **MIPS32 (27 instrucciones):** `ADD, ADDU, SUB, SUBU, AND, OR, XOR, NOR, SLT, SLTU, SLL, SRL, SRA, SLLV, SRLV, SRAV, ADDI, ADDIU, SLTI, SLTIU, ANDI, ORI, XORI, LW, SW, BEQ, BNE`.
- **ARM32 / A32 (36 formas):** `ADD, SUB, AND, ORR, EOR, MOV, MVN, CMP, LSL, LSR, ASR` (registro e inmediato rotado más `RSB`), `LDR, STR`, y saltos `B, BEQ, BNE, BHS, BLO, BHI, BLS, BGE, BLT, BGT, BLE`.

**Tipo de instrucción**
Clasificación visual unificada de cada instrucción en las tres arquitecturas: **R** (registro-registro), **I** (aritmética con inmediato), **L** (carga desde Memoria de datos), **S** (almacenamiento en Memoria de datos), **B** (salto condicional o incondicional).

**Salto incondicional**
Un salto que siempre se toma. En RISC-V se emite `BEQ x0, x0, etiqueta`; en MIPS32 `BEQ $zero, $zero, etiqueta`; en ARM32 `B etiqueta`.

**Ciclo de fin**
La última instrucción de todo programa, que detiene al procesador saltando sobre sí misma: `fin: BEQ x0, x0, fin` (RISC-V), `fin: BEQ $zero, $zero, fin` (MIPS32) o `fin: B fin` (ARM32).

## Memorias y registros

**Banco de registros**
Los registros del procesador: 32 registros en RISC-V (`x0`–`x31`) y MIPS32 (`$zero`–`$ra`, con `$0`/`x0` fijos en cero), y 16 registros en ARM32 (`R0`–`R15`, más banderas de estado `CPSR: N, Z, C, V`). En ARM32, `R12` se reserva como puntero base (`0`) para acceder a la Memoria de datos.

**Memoria de datos (RAM)**
Memoria de palabras de 32 bits, accedida solo con `LW`/`SW` (RISC-V y MIPS32) o `LDR`/`STR` (ARM32), donde viven las Variables de entrada y los Resultados observables en la simulación.

**Memoria de instrucciones**
ROM de solo lectura con una entrada (`addr`) y una salida (`data`). Es el artefacto `instruction_memory.vhdl` generado por el compilador.

## Programa en C

**Variable**
Un entero de 32 bits declarado como `int` (con signo) o `unsigned` (sin signo). Cada Variable tiene un registro fijo en el Banco de registros y una dirección fija en la Memoria de datos (`0, 4, 8, ...`), ambos asignados en orden de declaración.

**Variable de entrada**
Una Variable declarada sin valor inicial (`int n;`). Su valor se lee de la Memoria de datos al inicio del programa.

**Resultado**
El valor final de cada Variable, que se escribe en su dirección de la Memoria de datos justo antes del Ciclo de fin.

## Salidas

**Palabra de instrucción**
La codificación binaria de 32 bits de una instrucción, mostrada en hexadecimal de 8 dígitos (p. ej. `00500093`, `20080005`, `e2800001`).

**Simulador integrado**
Ejecución en la página del programa compilado sobre un modelo de la arquitectura seleccionada (incluyendo banderas `CPSR` en ARM32) para verificar los Resultados antes de llevarlo a Active-HDL.

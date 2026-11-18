# Convertidor C a Ensamblador (RISC-V) & Generador VHDL

Una aplicación web moderna para compilar un subconjunto estructurado de **lenguaje C** a código máquina **RISC-V (RV32I)**, visualizar las palabras de instrucción en hexadecimal (32 bits), desglosar los campos binarios (R, I, L, S, B) y generar módulos de memoria ROM en **VHDL** listos para simulación en **Active-HDL**, además de contar con un simulador de hardware integrado.

![Estilo Trigger.dev Dark Mode](https://img.shields.io/badge/Theme-Trigger.dev_Slate-1c1e21?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![Active-HDL](https://img.shields.io/badge/Target-Active--HDL-green?style=flat-square)

---

## Características Principales

1. **Compilador en el Navegador**:
   - Analizador léxico (Lexer), sintáctico (Parser AST) y semántico escrito en TypeScript.
   - Ejecución 100% del lado del cliente, sin necesidad de servidores o dependencias pesadas.
2. **Subconjunto de C Soportado**:
   - Variables enteras de 32 bits (`int` con signo y `unsigned` sin signo).
   - Asignaciones aritméticas y lógicas (`+`, `-`, `&`, `|`, `^`, `<<`, `>>`, `-x`, `~x`).
   - Comparaciones (`==`, `!=`, `<`, `<=`, `>`, `>=`).
   - Control de flujo estructurado con `if`, `else` y bucles `while`.
   - Diagnósticos claros con número de línea y columna.
3. **Set Soportado de 27 Instrucciones RV32I**:
   - **Tipo R**: `ADD`, `SUB`, `SLL`, `SLT`, `SLTU`, `XOR`, `SRL`, `SRA`, `OR`, `AND`.
   - **Tipo I**: `ADDI`, `SLLI`, `SLTI`, `SLTIU`, `XORI`, `SRLI`, `SRAI`, `ORI`, `ANDI`.
   - **Tipo L**: `LW` (Carga desde Memoria de Datos).
   - **Tipo S**: `SW` (Guardado en Memoria de Datos).
   - **Tipo B**: `BEQ`, `BNE`, `BLT`, `BGE`, `BLTU`, `BGEU`.
   - *Nota*: Saltos incondicionales generados mediante `BEQ x0, x0, etiqueta`.
4. **Exportación para Active-HDL**:
   - Generación de `instruction_memory.vhdl` con entidad y puertos configurados para direccionamiento por palabras (`addr(N downto 2)`).
   - Archivo complementario `programa.txt` con palabras hexadecimales de 32 bits por línea.
   - Profundidad de ROM configurable (32, 64, 128 o 256 palabras).
5. **Simulador Integrado**:
   - Simula la ejecución ciclo a ciclo sobre el Banco de Registros (`x0..x31`) y la Memoria de Datos (RAM).
   - Permite ingresar valores iniciales de entrada y visualizar los resultados en memoria.
6. **Diseño Visual**:
   - Inspirado en la estética de **Trigger.dev**: fondo Slate Canvas (`#1c1e21`), superficies Ink Well (`#121317`), detalles en Signal Lime (`#a8ff53`), tipografía Geist y bordes nítidos de 1px.

---

## Mapeo de Hardware

- **Variables en C**: Asignadas en orden de declaración a los registros `x10` a `x27` (hasta 18 variables simultáneas) y a las direcciones de RAM `0, 4, 8, ...`.
- **Variables de Entrada**: Declaradas sin valor inicial (`int n;`), se cargan automáticamente desde la RAM al inicio mediante `LW`.
- **Registros Temporales**: `x5, x6, x7, x28, x29, x30, x31` reservados para el cálculo de expresiones intermedias.
- **Epílogo**: Guarda el estado final de las variables en la RAM (`SW`) y se detiene con un ciclo infinito final (`fin: BEQ x0, x0, fin`).

---

## Instalación y Ejecución Local

Requisitos: **Node.js 18+**

```bash
# Clonar el repositorio
git clone https://github.com/JaimeVGA/Convertidor-C-a-Ensamblador-.git

# Entrar a la carpeta
cd Convertidor-C-a-Ensamblador-

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre en tu navegador la dirección indicada en la terminal (por defecto `http://localhost:5173`).

---

## Comandos Disponibles

- `npm run dev`: Inicia el servidor de desarrollo Vite con hot-reload.
- `npm run build`: Verifica tipos de TypeScript y compila el bundle estático en la carpeta `dist/`.
- `npm run preview`: Previsualiza la versión compilada de producción localmente.
- `npm test`: Ejecuta las pruebas unitarias y de integración con **Vitest**.

---

## Despliegue en Vercel

Este proyecto está optimizado como sitio estático sin backend:
1. Conecta tu repositorio de GitHub a tu cuenta de [Vercel](https://vercel.com).
2. Vercel detectará la configuración automáticamente (`Framework Preset: Vite`).
3. Presiona **Deploy**.

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

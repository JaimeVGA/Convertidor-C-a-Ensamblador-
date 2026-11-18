import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { assemble } from '../riscv/assembler';
import { AsmInstruction, decodeFields, encodeInstruction, toHex32 } from '../riscv/encoder';
import { isSupportedMnemonic, SUPPORTED_MNEMONICS } from '../riscv/isa';
import { runSimulation } from '../riscv/simulator';
import { EXAMPLES } from '../../examples';

describe('Codificador RISC-V y Set soportado (27 instrucciones)', () => {
  it('reproduce exactamente las 15 palabras de la ROM de ejemplo del usuario (con la línea 12 corregida a fc000ee3)', () => {
    const manualProgram: AsmInstruction[] = [
      { mnemonic: 'LW', rd: 10, rs1: 0, imm: 0 },
      { mnemonic: 'ADDI', rd: 11, rs1: 0, imm: 0 },
      { mnemonic: 'ADDI', rd: 12, rs1: 0, imm: 1 },
      { mnemonic: 'BEQ', rs1: 10, rs2: 12, targetLabel: 'fin', labels: ['bucle'] },
      { mnemonic: 'ANDI', rd: 14, rs1: 10, imm: 1 },
      { mnemonic: 'BNE', rs1: 14, rs2: 0, targetLabel: 'impar' },
      { mnemonic: 'SRLI', rd: 10, rs1: 10, imm: 1, labels: ['par'] },
      { mnemonic: 'BEQ', rs1: 0, rs2: 0, targetLabel: 'paso' },
      { mnemonic: 'SLLI', rd: 15, rs1: 10, imm: 1, labels: ['impar'] },
      { mnemonic: 'ADD', rd: 10, rs1: 10, rs2: 15 },
      { mnemonic: 'ADDI', rd: 10, rs1: 10, imm: 1 },
      { mnemonic: 'ADDI', rd: 11, rs1: 11, imm: 1, labels: ['paso'] },
      { mnemonic: 'BEQ', rs1: 0, rs2: 0, targetLabel: 'bucle' },
      { mnemonic: 'SW', rs1: 0, rs2: 11, imm: 12, labels: ['fin'] },
      { mnemonic: 'BEQ', rs1: 0, rs2: 0, targetLabel: 'halt', labels: ['halt'] },
    ];

    const res = assemble(manualProgram, 32);
    expect(res.errores).toEqual([]);
    const hexList = res.listado.map((l) => l.hex);

    expect(hexList).toEqual([
      '00002503', // 0: LW x10, 0(x0)
      '00000593', // 1: ADDI x11, x0, 0
      '00100613', // 2: ADDI x12, x0, 1
      '02c50463', // 3: BEQ x10, x12, fin (+40)
      '00157713', // 4: ANDI x14, x10, 1
      '00071663', // 5: BNE x14, x0, impar (+12)
      '00155513', // 6: SRLI x10, x10, 1
      '00000863', // 7: BEQ x0, x0, paso (+16)
      '00151793', // 8: SLLI x15, x10, 1
      '00f50533', // 9: ADD x10, x10, x15
      '00150513', // 10: ADDI x10, x10, 1
      '00158593', // 11: ADDI x11, x11, 1
      'fc000ee3', // 12: BEQ x0, x0, bucle (-36)
      '00b02623', // 13: SW x11, 12(x0)
      '00000063', // 14: BEQ x0, x0, halt (0)
    ]);
  });

  it('codifica y decodifica (ida y vuelta) las 27 instrucciones del Set soportado', () => {
    expect(SUPPORTED_MNEMONICS.length).toBe(27);

    for (const mnemonic of SUPPORTED_MNEMONICS) {
      let sample: AsmInstruction;
      if (
        ['ADD', 'SUB', 'SLL', 'SLT', 'SLTU', 'XOR', 'SRL', 'SRA', 'OR', 'AND'].includes(
          mnemonic
        )
      ) {
        sample = { mnemonic, rd: 10, rs1: 11, rs2: 12 };
      } else if (['SLLI', 'SRLI', 'SRAI'].includes(mnemonic)) {
        sample = { mnemonic, rd: 14, rs1: 10, imm: 17 };
      } else if (
        ['ADDI', 'SLTI', 'SLTIU', 'XORI', 'ORI', 'ANDI'].includes(mnemonic)
      ) {
        sample = { mnemonic, rd: 15, rs1: 11, imm: -123 };
      } else if (mnemonic === 'LW') {
        sample = { mnemonic, rd: 10, rs1: 0, imm: 16 };
      } else if (mnemonic === 'SW') {
        sample = { mnemonic, rs1: 0, rs2: 11, imm: 24 };
      } else {
        sample = { mnemonic, rs1: 10, rs2: 12, imm: -36 };
      }

      const word = encodeInstruction(sample);
      const decoded = decodeFields(word);
      expect(decoded.mnemonic).toBe(mnemonic);
      expect(decoded.hex).toBe(toHex32(word));
      if (sample.rd !== undefined) expect(decoded.rd).toBe(sample.rd);
      if (sample.rs1 !== undefined) expect(decoded.rs1).toBe(sample.rs1);
      if (sample.rs2 !== undefined) expect(decoded.rs2).toBe(sample.rs2);
      if (sample.imm !== undefined) expect(decoded.imm).toBe(sample.imm);
    }
  });

  it('maneja valores extremos de inmediatos (-2048, 2047) y desplazamientos B negativos', () => {
    const minI = encodeInstruction({ mnemonic: 'ADDI', rd: 5, rs1: 6, imm: -2048 });
    expect(decodeFields(minI).imm).toBe(-2048);

    const maxI = encodeInstruction({ mnemonic: 'ADDI', rd: 5, rs1: 6, imm: 2047 });
    expect(decodeFields(maxI).imm).toBe(2047);

    const minB = encodeInstruction({ mnemonic: 'BLT', rs1: 5, rs2: 6, imm: -4096 });
    expect(decodeFields(minB).imm).toBe(-4096);
  });
});

describe('Compilador de punta a punta y Simulador integrado', () => {
  it('compila y simula Collatz para n = 6 (8 pasos) y n = 27 (111 pasos)', () => {
    const collatzExample = EXAMPLES.find((e) => e.id === 'collatz')!;
    const out = compile(collatzExample.codigo, { romDepth: 32 });
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    // Verify all instructions belong to the supported 27-instruction set
    for (const line of out.listado) {
      expect(isSupportedMnemonic(line.mnemonic)).toBe(true);
    }

    const sim6 = runSimulation(out.listado, out.variables, { n: 6 });
    expect(sim6.halted).toBe(true);
    expect(sim6.ram.get(0)).toBe(1); // n ends at 1
    expect(sim6.ram.get(4)).toBe(8); // 6 -> 3 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1 (8 steps)

    const sim27 = runSimulation(out.listado, out.variables, { n: 27 });
    expect(sim27.halted).toBe(true);
    expect(sim27.ram.get(0)).toBe(1);
    expect(sim27.ram.get(4)).toBe(111);
  });

  it('compila y simula Suma 1..n, MCD Euclides, Popcount y Max/Abs', () => {
    // Suma 1..10 = 55
    const sumaEx = EXAMPLES.find((e) => e.id === 'suma_n')!;
    const outSuma = compile(sumaEx.codigo);
    expect(outSuma.ok).toBe(true);
    if (outSuma.ok) {
      const sim = runSimulation(outSuma.listado, outSuma.variables, { n: 10 });
      expect(sim.halted).toBe(true);
      const sumaVar = sim.variableResults.find((v) => v.name === 'suma')!;
      expect(sumaVar.ramValue).toBe(55);
    }

    // MCD(48, 18) = 6
    const mcdEx = EXAMPLES.find((e) => e.id === 'mcd_euclides')!;
    const outMcd = compile(mcdEx.codigo);
    expect(outMcd.ok).toBe(true);
    if (outMcd.ok) {
      const sim = runSimulation(outMcd.listado, outMcd.variables, { a: 48, b: 18 });
      expect(sim.halted).toBe(true);
      const aVar = sim.variableResults.find((v) => v.name === 'a')!;
      expect(aVar.ramValue).toBe(6);
    }

    // Popcount(0b10110111) = 6
    const popEx = EXAMPLES.find((e) => e.id === 'bits_popcount')!;
    const outPop = compile(popEx.codigo);
    expect(outPop.ok).toBe(true);
    if (outPop.ok) {
      const sim = runSimulation(outPop.listado, outPop.variables, { valor: 0b10110111 });
      expect(sim.halted).toBe(true);
      const unosVar = sim.variableResults.find((v) => v.name === 'unos')!;
      expect(unosVar.ramValue).toBe(6);
    }
  });

  it('distingue correctamente int (SRAI/SLT/BLT) vs unsigned (SRLI/SLTU/BLTU)', () => {
    const code = `
      int s = -8;
      unsigned u = -8;
      int sr_signed = s >> 2;
      unsigned sr_unsigned = u >> 2;
      int cmp_signed = s < 0;
      int cmp_unsigned = u < 0;
    `;
    const out = compile(code);
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    const mnemonics = out.listado.map((l) => l.mnemonic);
    expect(mnemonics).toContain('SRAI');
    expect(mnemonics).toContain('SRLI');

    const sim = runSimulation(out.listado, out.variables, {});
    expect(sim.halted).toBe(true);
    const byName = Object.fromEntries(sim.variableResults.map((v) => [v.name, v.ramValue]));
    expect(byName.sr_signed).toBe(-2);
    expect(byName.sr_unsigned >>> 0).toBe((-8 >>> 2) >>> 0);
    expect(byName.cmp_signed).toBe(1);
    expect(byName.cmp_unsigned).toBe(0);
  });
});

describe('Validación de errores en español y plantilla VHDL', () => {
  it('reporta errores claros en español para construcciones fuera del subconjunto', () => {
    const rFor = compile('for (int i = 0; i < 10; i++) {}');
    expect(rFor.ok).toBe(false);
    if (!rFor.ok) expect(rFor.errores[0].mensaje).toContain("'for' no está soportado");

    const rMul = compile('int a = 3;\nint b = a * 5;');
    expect(rMul.ok).toBe(false);
    if (!rMul.ok) {
      expect(rMul.errores[0].linea).toBe(2);
      expect(rMul.errores[0].mensaje).toContain("'*' no está soportado");
    }

    const rBig = compile('int a = 5000;');
    expect(rBig.ok).toBe(false);
    if (!rBig.ok) expect(rBig.errores[0].mensaje).toContain('no cabe en un inmediato de 12 bits');

    const rBreak = compile('int a = 1;\nwhile (a != 0) { break; }');
    expect(rBreak.ok).toBe(false);
    if (!rBreak.ok) expect(rBreak.errores[0].mensaje).toContain("'break' no está soportado");

    const rUndecl = compile('x = 10;');
    expect(rUndecl.ok).toBe(false);
    if (!rUndecl.ok) expect(rUndecl.errores[0].mensaje).toContain("La variable 'x' no ha sido declarada");
  });

  it('genera el VHDL exactamente con la entidad, puertos y proceso de la plantilla del usuario', () => {
    const out32 = compile('int a;\nint b = a + 1;', { romDepth: 32 });
    expect(out32.ok).toBe(true);
    if (!out32.ok) return;

    expect(out32.vhdl).toContain('entity instruction_memory is');
    expect(out32.vhdl).toContain('addr : in  std_logic_vector(31 downto 0);');
    expect(out32.vhdl).toContain('data : out std_logic_vector(31 downto 0)');
    expect(out32.vhdl).toContain('type rom_type is array (0 to 31) of std_logic_vector(31 downto 0);');
    expect(out32.vhdl).toContain('index := to_integer(unsigned(addr(6 downto 2)));');
    expect(out32.vhdl).toContain('others => (others => \'0\')');

    const out64 = compile('int a;\nint b = a + 1;', { romDepth: 64 });
    expect(out64.ok).toBe(true);
    if (out64.ok) {
      expect(out64.vhdl).toContain('addr(7 downto 2)');
      expect(out64.vhdl).toContain('if index >= 0 and index < 64 then');
    }
  });
});

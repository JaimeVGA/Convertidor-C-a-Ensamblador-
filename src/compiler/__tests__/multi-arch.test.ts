import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../../examples';
import { canEncodeArmLiteral, decodeArmImm, encodeArmImm } from '../arm/imm';
import {
  decodeArmFields,
  encodeArmInstruction,
  ArmInstruction,
} from '../arm/encoder';
import { ARM_MNEMONICS, isSupportedArmMnemonic } from '../arm/isa';
import { compile, simulateProgram } from '../compile';
import { decodeMipsFields, encodeMipsInstruction, MipsInstruction } from '../mips/encoder';
import { isSupportedMipsMnemonic, MIPS_MNEMONICS } from '../mips/isa';

describe('Backend MIPS32: Codificación, Modos ADD/ADDU y Simulación', () => {
  it('codifica las palabras hexadecimales de referencia de MIPS32', () => {
    expect(
      encodeMipsInstruction({ mnemonic: 'ADDI', rs: 0, rt: 8, imm: 5 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('20080005');

    expect(
      encodeMipsInstruction({ mnemonic: 'ADDIU', rs: 0, rt: 8, imm: 5 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('24080005');

    expect(
      encodeMipsInstruction({ mnemonic: 'ADD', rd: 10, rs: 8, rt: 9 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('01095020');

    expect(
      encodeMipsInstruction({ mnemonic: 'ADDU', rd: 10, rs: 8, rt: 9 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('01095021');

    expect(
      encodeMipsInstruction({ mnemonic: 'SUBU', rd: 10, rs: 8, rt: 9 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('01095023');

    expect(
      encodeMipsInstruction({ mnemonic: 'LW', rs: 0, rt: 16, imm: 0 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('8c100000');

    expect(
      encodeMipsInstruction({ mnemonic: 'SW', rs: 0, rt: 16, imm: 12 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('ac10000c');

    expect(
      encodeMipsInstruction({ mnemonic: 'BEQ', rs: 0, rt: 0, imm: -1 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('1000ffff');
  });

  it('realiza ida y vuelta decode(encode(i)) sobre las 27 instrucciones de MIPS32', () => {
    expect(MIPS_MNEMONICS.length).toBe(27);

    for (const mnemonic of MIPS_MNEMONICS) {
      let instr: MipsInstruction;
      if (['SLL', 'SRL', 'SRA'].includes(mnemonic)) {
        instr = { mnemonic, rd: 16, rt: 17, shamt: 7 };
      } else if (['SLLV', 'SRLV', 'SRAV'].includes(mnemonic)) {
        instr = { mnemonic, rd: 16, rt: 17, rs: 8 };
      } else if (
        ['ADD', 'ADDU', 'SUB', 'SUBU', 'AND', 'OR', 'XOR', 'NOR', 'SLT', 'SLTU'].includes(
          mnemonic
        )
      ) {
        instr = { mnemonic, rd: 16, rs: 17, rt: 18 };
      } else if (['ANDI', 'ORI', 'XORI'].includes(mnemonic)) {
        instr = { mnemonic, rs: 16, rt: 8, imm: 0x00ff };
      } else if (['ADDI', 'ADDIU', 'SLTI', 'SLTIU'].includes(mnemonic)) {
        instr = { mnemonic, rs: 16, rt: 8, imm: -321 };
      } else if (mnemonic === 'LW' || mnemonic === 'SW') {
        instr = { mnemonic, rs: 0, rt: 16, imm: 16 };
      } else {
        instr = { mnemonic, rs: 16, rt: 17, imm: -5 };
      }

      const word = encodeMipsInstruction(instr);
      const decoded = decodeMipsFields(word);
      expect(decoded.mnemonic).toBe(mnemonic);
      if (instr.imm !== undefined) expect(decoded.imm).toBe(instr.imm);
    }
  });

  it('alterna correctamente entre ADD/SUB/ADDI y ADDU/SUBU/ADDIU en MIPS32', () => {
    const code = `
      int a;
      int b = 5;
      int c = a + b;
      int d = c - 2;
    `;
    const signedOut = compile(code, { arch: 'mips', mipsArithmeticMode: 'signed' });
    expect(signedOut.ok).toBe(true);
    if (!signedOut.ok) return;
    const signedMnemonics = signedOut.listado.map((l) => l.mnemonic);
    expect(signedMnemonics).toContain('ADD');
    expect(signedMnemonics).toContain('ADDI');
    expect(signedMnemonics).not.toContain('ADDU');
    expect(signedMnemonics).not.toContain('ADDIU');

    const unsignedOut = compile(code, { arch: 'mips', mipsArithmeticMode: 'unsigned' });
    expect(unsignedOut.ok).toBe(true);
    if (!unsignedOut.ok) return;
    const unsignedMnemonics = unsignedOut.listado.map((l) => l.mnemonic);
    expect(unsignedMnemonics).toContain('ADDU');
    expect(unsignedMnemonics).toContain('ADDIU');
    expect(unsignedMnemonics).not.toContain('ADD');
    expect(unsignedMnemonics).not.toContain('ADDI');
  });
});

describe('Backend ARM32: Inmediatos Rotados, Codificación y Simulación', () => {
  it('codifica y decodifica inmediatos rotados de 8 bits en ARM32', () => {
    expect(encodeArmImm(0)).toEqual({ rot: 0, imm8: 0 });
    expect(encodeArmImm(255)).toEqual({ rot: 0, imm8: 255 });
    expect(encodeArmImm(256)).not.toBeNull();
    expect(encodeArmImm(1024)).not.toBeNull();
    expect(encodeArmImm(257)).toBeNull();
    expect(canEncodeArmLiteral(-1)).toBe(true);
    expect(canEncodeArmLiteral(-256)).toBe(true);
    expect(canEncodeArmLiteral(257)).toBe(false);

    const enc1000 = encodeArmImm(1000);
    expect(enc1000).not.toBeNull();
    if (enc1000) {
      expect(decodeArmImm(enc1000.rot, enc1000.imm8)).toBe(1000);
    }
  });

  it('codifica las palabras hexadecimales de referencia de ARM32', () => {
    expect(
      encodeArmInstruction({ mnemonic: 'MOVI', rd: 12, imm: 0 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e3a0c000');

    expect(
      encodeArmInstruction({ mnemonic: 'LDR', rd: 0, rn: 12, imm: 0 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e59c0000');

    expect(
      encodeArmInstruction({ mnemonic: 'ADDI', rd: 0, rn: 0, imm: 1 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e2800001');

    expect(
      encodeArmInstruction({ mnemonic: 'CMPI', rn: 0, imm: 1 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e3500001');

    expect(
      encodeArmInstruction({ mnemonic: 'RSBI', rd: 0, rn: 0, imm: 0 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e2600000');

    expect(
      encodeArmInstruction({ mnemonic: 'LSLI', rd: 8, rm: 0, imm: 1 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('e1a08080');

    expect(
      encodeArmInstruction({ mnemonic: 'B', imm: -2 })
        .toString(16)
        .padStart(8, '0')
    ).toBe('eafffffe');
  });

  it('realiza ida y vuelta decode(encode(i)) sobre las 36 formas de ARM32', () => {
    expect(ARM_MNEMONICS.length).toBe(36);

    for (const mnemonic of ARM_MNEMONICS) {
      let instr: ArmInstruction;
      if (['ADD', 'SUB', 'AND', 'ORR', 'EOR'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, rn: 0, rm: 1 };
      } else if (['MOV', 'MVN'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, rm: 1 };
      } else if (mnemonic === 'CMP') {
        instr = { mnemonic, rn: 0, rm: 1 };
      } else if (['LSL', 'LSR', 'ASR'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, rm: 0, rs: 9 };
      } else if (['ADDI', 'SUBI', 'RSBI', 'ANDI', 'ORRI', 'EORI'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, rn: 0, imm: 12 };
      } else if (['MOVI', 'MVNI'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, imm: 42 };
      } else if (mnemonic === 'CMPI') {
        instr = { mnemonic, rn: 0, imm: 7 };
      } else if (['LSLI', 'LSRI', 'ASRI'].includes(mnemonic)) {
        instr = { mnemonic, rd: 8, rm: 0, imm: 3 };
      } else if (mnemonic === 'LDR' || mnemonic === 'STR') {
        instr = { mnemonic, rd: 0, rn: 12, imm: 8 };
      } else {
        instr = { mnemonic, imm: -3 };
      }

      const word = encodeArmInstruction(instr);
      const decoded = decodeArmFields(word);
      expect(decoded.mnemonic).toBe(mnemonic);
    }
  });

  it('muestra error claro en español cuando un número es demasiado grande o no codificable en ARM32', () => {
    const out = compile('int a = 257;', { arch: 'arm' });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errores[0].mensaje).toContain('demasiado grande');
    }

    const outBig = compile('int a = 5000;', { arch: 'arm' });
    expect(outBig.ok).toBe(false);
    if (!outBig.ok) {
      expect(outBig.errores[0].mensaje).toContain('ARM32');
    }
  });
});

describe('Paridad Semántica Cruzada (RISC-V == MIPS32 == ARM32)', () => {
  const configs = [
    { label: 'RISC-V', arch: 'riscv' as const, mode: undefined },
    { label: 'MIPS32 (ADD)', arch: 'mips' as const, mode: 'signed' as const },
    { label: 'MIPS32 (ADDU)', arch: 'mips' as const, mode: 'unsigned' as const },
    { label: 'ARM32', arch: 'arm' as const, mode: undefined },
  ];

  it('todos los ejemplos integrados producen exactamente los mismos resultados en RAM en las 3 arquitecturas', () => {
    for (const example of EXAMPLES) {
      const expectedByArch: Record<string, Record<string, number>> = {};

      for (const cfg of configs) {
        const out = compile(example.codigo, {
          arch: cfg.arch,
          romDepth: 64,
          mipsArithmeticMode: cfg.mode,
        });
        expect(out.ok, `${example.id} falló al compilar en ${cfg.label}`).toBe(true);
        if (!out.ok) continue;

        // Verify strict ISA compliance
        for (const line of out.listado) {
          if (cfg.arch === 'mips') {
            expect(isSupportedMipsMnemonic(line.mnemonic)).toBe(true);
          } else if (cfg.arch === 'arm') {
            expect(isSupportedArmMnemonic(line.mnemonic)).toBe(true);
          }
        }

        // Verify VHDL generation works for each architecture
        expect(out.vhdl).toContain('entity instruction_memory is');
        expect(out.vhdl).toContain('addr : in  std_logic_vector(31 downto 0);');

        const sim = simulateProgram(
          cfg.arch,
          out.listado,
          out.variables,
          example.entradasPorDefecto
        );
        expect(sim.halted, `${example.id} no se detuvo en ${cfg.label}`).toBe(true);

        expectedByArch[cfg.label] = Object.fromEntries(
          sim.variableResults.map((v) => [v.name, v.ramValue])
        );
      }

      const baseline = expectedByArch['RISC-V'];
      for (const cfg of configs) {
        expect(expectedByArch[cfg.label], `Discrepancia en ${example.id} para ${cfg.label}`).toEqual(
          baseline
        );
      }
    }
  });

  it('mantiene paridad exacta en Collatz n=27 (111 pasos), operaciones unarias, shifts variables y comparaciones', () => {
    const collatz = EXAMPLES.find((e) => e.id === 'collatz')!;
    for (const cfg of configs) {
      const out = compile(collatz.codigo, {
        arch: cfg.arch,
        romDepth: 32,
        mipsArithmeticMode: cfg.mode,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) continue;

      const sim = simulateProgram(cfg.arch, out.listado, out.variables, { n: 27 });
      expect(sim.halted).toBe(true);
      expect(sim.ram.get(0)).toBe(1);
      expect(sim.ram.get(4)).toBe(111);
    }

    const edgeCode = `
      int a = -12;
      unsigned b = -12;
      int sh = 3;
      int neg_a = -a;
      int not_a = ~a;
      int mask_neg = a & -5;
      int sra_v = a >> sh;
      unsigned srl_v = b >> sh;
      int cmp_lt = a < 0;
      int cmp_ult = b < 0;
      int cmp_le = a <= -12;
      int cmp_eq = neg_a == 12;
    `;
    const edgeResults: Record<string, number>[] = [];
    for (const cfg of configs) {
      // Uses 11 variables -> RISC-V (18), MIPS (14). ARM allows 8 vars so test ARM with 8 vars separately.
      if (cfg.arch === 'arm') continue;
      const out = compile(edgeCode, {
        arch: cfg.arch,
        romDepth: 64,
        mipsArithmeticMode: cfg.mode,
      });
      expect(out.ok).toBe(true);
      if (!out.ok) continue;
      const sim = simulateProgram(cfg.arch, out.listado, out.variables, {});
      expect(sim.halted).toBe(true);
      edgeResults.push(Object.fromEntries(sim.variableResults.map((v) => [v.name, v.ramValue])));
    }

    expect(edgeResults[1]).toEqual(edgeResults[0]);
    expect(edgeResults[2]).toEqual(edgeResults[0]);

    // ARM32 edge parity within 8-variable limit
    const armEdgeCode = `
      int a = -12;
      unsigned b = -12;
      int sh = 3;
      int not_a = ~a;
      int sra_v = a >> sh;
      unsigned srl_v = b >> sh;
      int cmp_lt = a < 0;
      int cmp_ult = b < 0;
    `;
    const rvSub = compile(armEdgeCode, { arch: 'riscv', romDepth: 64 });
    const armSub = compile(armEdgeCode, { arch: 'arm', romDepth: 64 });
    expect(rvSub.ok).toBe(true);
    expect(armSub.ok).toBe(true);
    if (rvSub.ok && armSub.ok) {
      const simRv = simulateProgram('riscv', rvSub.listado, rvSub.variables, {});
      const simArm = simulateProgram('arm', armSub.listado, armSub.variables, {});
      expect(simArm.halted).toBe(true);
      expect(
        Object.fromEntries(simArm.variableResults.map((v) => [v.name, v.ramValue]))
      ).toEqual(Object.fromEntries(simRv.variableResults.map((v) => [v.name, v.ramValue])));
    }
  });

  it('valida límites de variables y constantes por arquitectura', () => {
    const nineVars = Array.from({ length: 9 }, (_, i) => `int v${i} = ${i};`).join('\n');
    const armNine = compile(nineVars, { arch: 'arm' });
    expect(armNine.ok).toBe(false);
    if (!armNine.ok) expect(armNine.errores[0].mensaje).toContain('límite máximo de 8 variables');

    const mipsNine = compile(nineVars, { arch: 'mips' });
    expect(mipsNine.ok).toBe(true);

    const mipsBig = compile('int x = 40000;', { arch: 'mips' });
    expect(mipsBig.ok).toBe(false);
    if (!mipsBig.ok) expect(mipsBig.errores[0].mensaje).toContain('16 bits');
  });
});

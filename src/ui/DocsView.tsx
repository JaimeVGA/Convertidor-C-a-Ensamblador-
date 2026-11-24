import React from 'react';
import {
  Cpu,
  BookOpen,
  Layers,
  Sparkles,
  Terminal,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { getBackend } from '../compiler/compile';
import type { TargetArch } from '../compiler/types';

interface DocsViewProps {
  arch: TargetArch;
  onChangeArch: (arch: TargetArch) => void;
  onGoToCompiler: () => void;
  onGoToSimulator: () => void;
}

const ARCH_TABS: { id: TargetArch; label: string }[] = [
  { id: 'riscv', label: 'RISC-V (32b)' },
  { id: 'mips', label: 'MIPS32' },
  { id: 'arm', label: 'ARM32 (A32)' },
];

export const DocsView: React.FC<DocsViewProps> = ({
  arch,
  onChangeArch,
  onGoToCompiler,
  onGoToSimulator,
}) => {
  const backend = getBackend(arch);
  const { meta, isaCatalog } = backend;

  return (
    <div className="max-w-[1000px] mx-auto py-4 sm:py-8 px-1 sm:px-6 space-y-8 sm:space-y-10 font-sans text-[#e5e7eb]">
      {/* Hero Header */}
      <div className="space-y-3 border-b border-[#272a2e] pb-6 sm:pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121317] border border-[#272a2e] text-[11px] sm:text-[12px] font-mono text-[var(--accent)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] shrink-0" />
          Documentación & Arquitectura — {meta.name}
        </div>
        <h1 className="font-display font-medium text-[26px] sm:text-[36px] md:text-[44px] leading-tight tracking-[0.03em] text-[#e5e7eb]">
          Compilador C → {meta.shortName} & Síntesis VHDL
        </h1>
        <p className="text-[14px] sm:text-[16px] text-[#878c99] leading-relaxed max-w-[760px]">
          Plataforma web multi-arquitectura diseñada para traducir un subconjunto estricto de código en C a ensamblador{' '}
          <strong>RISC-V, MIPS32 y ARM32</strong>, generar la memoria de instrucciones en formato VHDL para simulación en{' '}
          <strong>Active-HDL</strong> y verificar la ejecución en hardware ciclo a ciclo.
        </p>

        {/* Architecture selector inside Docs */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center rounded-[4px] bg-[#121317] p-1 border border-[#272a2e] text-[12px] font-mono">
            {ARCH_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onChangeArch(t.id)}
                className={`px-3 py-1.5 rounded-[4px] transition-colors ${
                  arch === t.id
                    ? 'bg-[#1c1e21] text-[var(--accent)] border border-[var(--accent-border)] font-semibold'
                    : 'text-[#878c99] hover:text-[#e5e7eb]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={onGoToCompiler}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[var(--accent)] text-[#121317] font-medium text-[14px] hover:bg-[var(--accent-hover)] transition-all shadow-[inset_0_0_0_1px_var(--accent-border)]"
          >
            <span>Ir al Compilador</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#121317]" />
          </button>
          <button
            onClick={onGoToSimulator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#121317] border border-[#272a2e] text-[#d7d9dd] hover:text-[#e5e7eb] hover:border-[#3b3e45] text-[14px] font-medium transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Abrir Simulador</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Terminal className="w-4 h-4" />
            <h3 className="font-mono text-[14px] font-semibold text-[#e5e7eb]">Subconjunto C</h3>
          </div>
          <p className="text-[14px] text-[#878c99] leading-relaxed">
            Variables <code className="text-[#9c9af2]">int</code> y <code className="text-[#9c9af2]">unsigned</code>, asignaciones aritméticas (<code className="text-[#afec73]">+ - & | ^ &lt;&lt; &gt;&gt;</code>), comparaciones y control de flujo con <code className="text-[#fa3abf]">while</code> e <code className="text-[#fa3abf]">if/else</code>.
          </p>
        </div>

        <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-2">
          <div className="flex items-center gap-2 text-[#9c9af2]">
            <Layers className="w-4 h-4" />
            <h3 className="font-mono text-[14px] font-semibold text-[#e5e7eb]">
              {isaCatalog.length} Formas en {meta.shortName}
            </h3>
          </div>
          <p className="text-[14px] text-[#878c99] leading-relaxed">
            Emisión estricta clasificada como R, I, L, S y B. Sin pseudo-instrucciones ni multiplicación; cada instrucción se codifica directamente en 32 bits.
          </p>
        </div>

        <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-2">
          <div className="flex items-center gap-2 text-[#fa3abf]">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-mono text-[14px] font-semibold text-[#e5e7eb]">Active-HDL Ready</h3>
          </div>
          <p className="text-[14px] text-[#878c99] leading-relaxed">
            Exporta directamente el archivo <code className="text-[var(--accent)]">instruction_memory.vhdl</code> con entidad combinacional y el listado <code className="text-[var(--accent)]">programa.txt</code>.
          </p>
        </div>
      </div>

      {/* Detailed Architecture Section */}
      <div className="space-y-4">
        <h2 className="font-display font-medium text-[24px] text-[#e5e7eb] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--accent)]" />
          <span>Mapeo de Hardware en {meta.name}</span>
        </h2>
        <div className="p-5 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-4 text-[14px] leading-relaxed text-[#b5b8c0]">
          <p>
            El procesador cuenta con un <strong>Banco de Registros</strong> de {meta.regCount} palabras y una{' '}
            <strong>Memoria de Datos (RAM)</strong> direccionable por palabras (múltiplos de 4 bytes):
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#878c99]">
            <li>
              <strong className="text-[#e5e7eb]">Variables C ({meta.varRegRangeLabel}):</strong> Se asignan en orden de declaración. Soportan hasta {meta.maxVariables} variables simultáneas con dirección fija en RAM (<code className="text-[#d9f07c]">0, 4, 8, ...</code>).
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Registros Temporales ({meta.tempRegRangeLabel}):</strong> Reservados para evaluar subexpresiones aritméticas y lógicas sin colisionar con las variables.
            </li>
            {arch === 'riscv' && (
              <>
                <li>
                  <strong className="text-[#e5e7eb]">Inmediatos y Saltos:</strong> Inmediatos de 12 bits con signo (<code className="text-[#d9f07c]">−2048..2047</code>) y saltos incondicionales mediante <code className="text-[var(--accent)]">BEQ x0, x0, etiqueta</code>.
                </li>
                <li>
                  <strong className="text-[#e5e7eb]">Ciclo de Fin:</strong> Guarda todas las variables con <code className="text-[var(--accent)]">SW</code> y termina en <code className="text-[#fa3abf]">fin: BEQ x0, x0, fin</code>.
                </li>
              </>
            )}
            {arch === 'mips' && (
              <>
                <li>
                  <strong className="text-[#e5e7eb]">Aritmética Configurable:</strong> Puedes elegir entre modo con signo (<code className="text-[var(--accent)]">ADD / SUB / ADDI</code>) o sin desbordamiento (<code className="text-[var(--accent)]">ADDU / SUBU / ADDIU</code>).
                </li>
                <li>
                  <strong className="text-[#e5e7eb]">Inmediatos y Negación:</strong> Inmediatos de 16 bits con signo (<code className="text-[#d9f07c]">−32768..32767</code>), <code className="text-[var(--accent)]">NOR</code> para <code className="text-[#9c9af2]">~x</code> y offsets relativos a <code className="text-[#e5e7eb]">PC + 4</code>.
                </li>
                <li>
                  <strong className="text-[#e5e7eb]">Ciclo de Fin:</strong> Guarda todas las variables con <code className="text-[var(--accent)]">SW</code> y termina en <code className="text-[#fa3abf]">fin: BEQ $zero, $zero, fin</code> (<code className="text-[#d9f07c]">0x1000ffff</code>).
                </li>
              </>
            )}
            {arch === 'arm' && (
              <>
                <li>
                  <strong className="text-[#e5e7eb]">Puntero Base RAM (R12):</strong> Como ARM32 no tiene registro cero fijo, <code className="text-[#e5e7eb]">R12</code> se inicializa con <code className="text-[var(--accent)]">MOV R12, #0</code> al inicio para direccionar <code className="text-[var(--accent)]">LDR/STR [R12, #dir]</code>.
                </li>
                <li>
                  <strong className="text-[#e5e7eb]">Inmediatos Rotados y Banderas CPSR:</strong> Soporta constantes codificables en 8 bits rotados (con <code className="text-[var(--accent)]">MOV</code> o <code className="text-[var(--accent)]">MVN</code>). Las comparaciones actualizan las banderas <code className="text-[#d9f07c]">N, Z, C, V</code> vía <code className="text-[var(--accent)]">CMP</code> antes de los saltos <code className="text-[#fa3abf]">B&#123;cond&#125;</code> relativos a <code className="text-[#e5e7eb]">PC + 8</code>.
                </li>
                <li>
                  <strong className="text-[#e5e7eb]">Ciclo de Fin:</strong> Guarda todas las variables con <code className="text-[var(--accent)]">STR</code> y termina en <code className="text-[#fa3abf]">fin: B fin</code> (<code className="text-[#d9f07c]">0xeafffffe</code>).
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Supported ISA Grid */}
      <div className="space-y-4">
        <h2 className="font-display font-medium text-[24px] text-[#e5e7eb] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
          <span>Set de Instrucciones de {meta.name} ({isaCatalog.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[12px]">
          {isaCatalog.map((s) => (
            <div
              key={s.mnemonic}
              className="p-3 rounded-[4px] bg-[#121317] border border-[#272a2e] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--accent)]">{s.mnemonic}</span>
                <span className="px-1.5 py-0.2 rounded-[4px] bg-[#1c1e21] text-[11px] text-[#878c99] border border-[#272a2e]">
                  Tipo {s.tipo}
                </span>
              </div>
              <p className="text-[12px] text-[#878c99] font-sans mt-1">
                {s.descripcion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Cpu, BookOpen, Layers, Sparkles, Terminal, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUPPORTED_ISA, SUPPORTED_MNEMONICS } from '../compiler/riscv/isa';

interface DocsViewProps {
  onGoToCompiler: () => void;
  onGoToSimulator: () => void;
}

export const DocsView: React.FC<DocsViewProps> = ({ onGoToCompiler, onGoToSimulator }) => {
  return (
    <div className="max-w-[1000px] mx-auto py-8 px-4 sm:px-6 space-y-10 font-sans text-[#e5e7eb]">
      {/* Hero Header */}
      <div className="space-y-3 border-b border-[#272a2e] pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121317] border border-[#272a2e] text-[12px] font-mono text-[#a8ff53]">
          <span className="w-2 h-2 rounded-full bg-[#a8ff53] shadow-[0_0_8px_rgba(168,255,83,0.8)]" />
          Documentación & Arquitectura
        </div>
        <h1 className="font-display font-medium text-[36px] sm:text-[44px] leading-tight tracking-[0.03em] text-[#e5e7eb]">
          Compilador C → RISC-V & Síntesis VHDL
        </h1>
        <p className="text-[16px] text-[#878c99] leading-relaxed max-w-[760px]">
          Plataforma web diseñada para traducir un subconjunto estricto de código en C a ensamblador RISC-V RV32I, generar la memoria de instrucciones en formato VHDL para simulación en <strong>Active-HDL</strong> y verificar la ejecución en hardware mediante un modelo ciclo a ciclo.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onGoToCompiler}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#a8ff53] text-[#121317] font-medium text-[14px] hover:bg-[#a8ff53]/90 transition-all shadow-[inset_0_0_0_1px_rgba(168,255,83,0.2)]"
          >
            <span>Ir al Compilador</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#121317]" />
          </button>
          <button
            onClick={onGoToSimulator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#121317] border border-[#272a2e] text-[#d7d9dd] hover:text-[#e5e7eb] hover:border-[#3b3e45] text-[14px] font-medium transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-[#a8ff53]" />
            <span>Abrir Simulador</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-2">
          <div className="flex items-center gap-2 text-[#a8ff53]">
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
            <h3 className="font-mono text-[14px] font-semibold text-[#e5e7eb]">27 Instrucciones</h3>
          </div>
          <p className="text-[14px] text-[#878c99] leading-relaxed">
            Emisión pura de tipos R, I, L, S y B. Sin instrucciones tipo J ni LUI; los saltos incondicionales se resuelven como <code className="text-[#d9f07c]">BEQ x0, x0, etiqueta</code>.
          </p>
        </div>

        <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-2">
          <div className="flex items-center gap-2 text-[#fa3abf]">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-mono text-[14px] font-semibold text-[#e5e7eb]">Active-HDL Ready</h3>
          </div>
          <p className="text-[14px] text-[#878c99] leading-relaxed">
            Exporta directamente el archivo <code className="text-[#a8ff53]">instruction_memory.vhdl</code> con entidad, lectura combinacional desfasada y archivo complementario <code className="text-[#a8ff53]">programa.txt</code>.
          </p>
        </div>
      </div>

      {/* Detailed Architecture Section */}
      <div className="space-y-4">
        <h2 className="font-display font-medium text-[24px] text-[#e5e7eb] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#a8ff53]" />
          <span>Mapeo de Hardware: Registros y Memoria</span>
        </h2>
        <div className="p-5 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-4 text-[14px] leading-relaxed text-[#b5b8c0]">
          <p>
            El procesador cuenta con un <strong>Banco de Registros</strong> de 32 palabras (<code className="text-[#e5e7eb]">x0..x31</code>) y una <strong>Memoria de Datos (RAM)</strong> direccionable en múltiplos de 4 bytes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#878c99]">
            <li>
              <strong className="text-[#e5e7eb]">Variables C (x10 .. x27):</strong> Se asignan en orden estricto de declaración. Soportan hasta 18 variables simultáneas con dirección fija en RAM (<code className="text-[#d9f07c]">0, 4, 8, ...</code>).
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Variables de Entrada:</strong> Declaradas sin inicializar (<code className="text-[#9c9af2]">int n;</code>), se cargan automáticamente desde RAM con <code className="text-[#a8ff53]">LW x10, 0(x0)</code> al arrancar el programa.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Registros Temporales:</strong> El compilador reserva <code className="text-[#e5e7eb]">x5, x6, x7, x28, x29, x30, x31</code> para evaluar expresiones aritméticas intermedias.
            </li>
            <li>
              <strong className="text-[#e5e7eb]">Epílogo y Ciclo de Fin:</strong> Antes de detenerse, el programa escribe el valor final de cada variable en su dirección de RAM mediante <code className="text-[#a8ff53]">SW</code> y entra en el bucle final <code className="text-[#fa3abf]">fin: BEQ x0, x0, fin</code>.
            </li>
          </ul>
        </div>
      </div>

      {/* Supported ISA Grid */}
      <div className="space-y-4">
        <h2 className="font-display font-medium text-[24px] text-[#e5e7eb] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#a8ff53]" />
          <span>Set de Instrucciones Soportadas ({SUPPORTED_MNEMONICS.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[12px]">
          {SUPPORTED_MNEMONICS.map((m) => {
            const s = SUPPORTED_ISA[m];
            return (
              <div
                key={m}
                className="p-3 rounded-[4px] bg-[#121317] border border-[#272a2e] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#a8ff53]">{s.mnemonic}</span>
                  <span className="px-1.5 py-0.2 rounded-[4px] bg-[#1c1e21] text-[11px] text-[#878c99] border border-[#272a2e]">
                    Tipo {s.tipo}
                  </span>
                </div>
                <p className="text-[12px] text-[#878c99] font-sans mt-1">
                  {s.descripcion}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Binary,
  FileCode2,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Play,
  Github,
  Cpu,
  Code2,
  SlidersHorizontal,
} from 'lucide-react';
import { compile, getBackend } from './compiler/compile';
import { RomDepth } from './compiler/output/vhdl';
import type { MipsArithmeticMode, TargetArch } from './compiler/types';
import { EXAMPLES } from './examples';
import { Editor } from './ui/Editor';
import { ErrorPanel } from './ui/ErrorPanel';
import { ListingTable } from './ui/ListingTable';
import { FieldView } from './ui/FieldView';
import { VhdlPanel } from './ui/VhdlPanel';
import { SimulatorPanel } from './ui/SimulatorPanel';
import { DocsView } from './ui/DocsView';

type NavigationPage = 'compiler' | 'simulator' | 'docs';
type OutputTab = 'listing' | 'fields' | 'vhdl' | 'isa';

const ARCH_OPTIONS: { id: TargetArch; label: string; colorDot: string }[] = [
  { id: 'riscv', label: 'RISC-V (32b)', colorDot: '#a8ff53' },
  { id: 'mips', label: 'MIPS (32b)', colorDot: '#38bdf8' },
  { id: 'arm', label: 'ARM (32b)', colorDot: '#c084fc' },
];

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('compiler');
  const [arch, setArch] = useState<TargetArch>('riscv');
  const [mipsArithmeticMode, setMipsArithmeticMode] =
    useState<MipsArithmeticMode>('signed');
  const [selectedExampleId, setSelectedExampleId] = useState<string>(EXAMPLES[0].id);
  const [code, setCode] = useState<string>(EXAMPLES[0].codigo);
  const [romDepth, setRomDepth] = useState<RomDepth>(32);
  const [activeTab, setActiveTab] = useState<OutputTab>('listing');
  const [hoveredCLine, setHoveredCLine] = useState<number | undefined>(undefined);

  // Sync dynamic theme attribute across the document
  useEffect(() => {
    document.documentElement.dataset.arch = arch;
  }, [arch]);

  const activeExample = useMemo(
    () => EXAMPLES.find((e) => e.id === selectedExampleId) ?? EXAMPLES[0],
    [selectedExampleId]
  );

  const backend = useMemo(() => getBackend(arch), [arch]);
  const archMeta = backend.meta;
  const isaCatalog = backend.isaCatalog;

  const outcome = useMemo(
    () => compile(code, { arch, romDepth, mipsArithmeticMode }),
    [code, arch, romDepth, mipsArithmeticMode]
  );

  const handleSelectExample = (id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) {
      setSelectedExampleId(ex.id);
      setCode(ex.codigo);
    }
  };

  return (
    <div
      data-arch={arch}
      className="min-h-screen flex flex-col bg-[#1c1e21] text-[#e5e7eb] font-sans transition-colors duration-200"
    >
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#272a2e] bg-[#1c1e21]/95 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('compiler')}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-[4px] bg-[var(--accent-soft)] text-[var(--accent)] transition-colors">
                <Play className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              </span>
              <span className="font-display font-semibold text-[20px] text-[#e5e7eb] tracking-tight">
                Compiler<span className="text-[var(--accent)] transition-colors">.dev</span>
              </span>
            </button>
          </div>

          {/* Nav Navigation Links & Repo Link */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentPage('compiler')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                currentPage === 'compiler'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#9c9af2]" />
              <span>Compilador</span>
            </button>

            <button
              onClick={() => setCurrentPage('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                currentPage === 'simulator'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Simulador</span>
              {outcome.ok && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-0.5 shadow-[0_0_6px_var(--accent-glow)]" />
              )}
            </button>

            <button
              onClick={() => setCurrentPage('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                currentPage === 'docs'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#fa3abf]" />
              <span>Información</span>
            </button>

            {/* GitHub Repo Link */}
            <a
              href="https://github.com/JaimeVGA/Convertidor-C-a-Ensamblador-"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-transparent hover:border-[#272a2e] transition-colors ml-1"
            >
              <Github className="w-4 h-4 text-[#878c99]" />
              <span className="hidden sm:inline">Repositorio</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Page Routing */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* VIEW 1: DOCS & INFO */}
        {currentPage === 'docs' && (
          <DocsView
            arch={arch}
            onChangeArch={setArch}
            onGoToCompiler={() => setCurrentPage('compiler')}
            onGoToSimulator={() => setCurrentPage('simulator')}
          />
        )}

        {/* VIEW 2: SIMULATOR DEDICATED PAGE */}
        {currentPage === 'simulator' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#272a2e] pb-4">
              <div>
                <h1 className="font-display font-medium text-[28px] text-[#e5e7eb] flex items-center gap-2.5">
                  <Cpu className="w-6 h-6 text-[var(--accent)]" />
                  <span>Simulador de Hardware {archMeta.shortName}</span>
                </h1>
                <p className="text-[14px] text-[#878c99]">
                  Ejecuta el código máquina compilado ciclo a ciclo verificando los {archMeta.regCount} registros y la memoria de datos (RAM).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Architecture switcher in simulator */}
                <div className="flex items-center rounded-[4px] bg-[#121317] p-1 border border-[#272a2e] text-[12px] font-mono">
                  {ARCH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setArch(opt.id)}
                      className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center gap-1.5 ${
                        arch === opt.id
                          ? 'bg-[#1c1e21] text-[var(--accent)] border border-[#3b3e45] font-medium'
                          : 'text-[#878c99] hover:text-[#e5e7eb]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opt.colorDot }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {arch === 'mips' && (
                  <div className="flex items-center rounded-[4px] bg-[#121317] p-1 border border-[#272a2e] text-[12px] font-mono">
                    <button
                      onClick={() => setMipsArithmeticMode('signed')}
                      className={`px-2 py-1 rounded-[4px] transition-colors ${
                        mipsArithmeticMode === 'signed'
                          ? 'bg-[#1c1e21] text-[var(--accent)] border border-[#3b3e45] font-medium'
                          : 'text-[#878c99] hover:text-[#e5e7eb]'
                      }`}
                    >
                      ADD/ADDI
                    </button>
                    <button
                      onClick={() => setMipsArithmeticMode('unsigned')}
                      className={`px-2 py-1 rounded-[4px] transition-colors ${
                        mipsArithmeticMode === 'unsigned'
                          ? 'bg-[#1c1e21] text-[var(--accent)] border border-[#3b3e45] font-medium'
                          : 'text-[#878c99] hover:text-[#e5e7eb]'
                      }`}
                    >
                      ADDU/ADDIU
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setCurrentPage('compiler')}
                  className="px-3 py-1.5 rounded-[4px] bg-[#121317] border border-[#272a2e] text-[#d7d9dd] hover:text-[#e5e7eb] text-[14px] font-mono transition-colors"
                >
                  Editar Código C
                </button>
              </div>
            </div>

            {!outcome.ok ? (
              <div className="p-8 rounded-[4px] bg-[#121317] border border-[#f43f5e]/40 text-center space-y-3 font-mono">
                <p className="text-[#f43f5e] text-[15px] font-semibold">
                  El código en C actual tiene errores de compilación en {archMeta.shortName}.
                </p>
                <p className="text-[#878c99] text-[13px]">
                  {outcome.errores[0]?.mensaje ?? 'Regresa a la pestaña del Compilador para resolver los diagnósticos antes de simular.'}
                </p>
                <button
                  onClick={() => setCurrentPage('compiler')}
                  className="px-4 py-2 rounded-[4px] bg-[var(--accent)] text-[#121317] font-medium text-[14px]"
                >
                  Ir al Editor
                </button>
              </div>
            ) : (
              <SimulatorPanel
                arch={arch}
                archMeta={archMeta}
                listado={outcome.listado}
                variables={outcome.variables}
                defaultInputs={activeExample.entradasPorDefecto}
              />
            )}
          </div>
        )}

        {/* VIEW 3: COMPILER MAIN WORKSPACE */}
        {currentPage === 'compiler' && (
          <div className="space-y-6">
            {/* Headline Section */}
            <div className="py-2 text-center max-w-[820px] mx-auto space-y-2">
              <h2 className="font-display font-medium text-[32px] sm:text-[40px] leading-[1.1] tracking-[0.04em] text-[#e5e7eb]">
                Compila C a{' '}
                <span className="text-[var(--accent)] transition-colors">
                  {archMeta.shortName}
                </span>{' '}
                con emisión limpia a VHDL
              </h2>
              <p className="text-[15px] text-[#878c99] leading-relaxed max-w-[640px] mx-auto">
                Generador para procesadores de 32 bits (R, I, L, S, B). Codificación exacta en hexadecimal y memoria ROM compatible con simuladores Active-HDL.
              </p>
            </div>

            {/* Workspace Panels (Editor Left, Listing Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column: C Editor */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="flex-1 min-h-[460px]">
                  <Editor
                    code={code}
                    onChange={setCode}
                    errores={outcome.ok ? [] : outcome.errores}
                    variables={outcome.ok ? outcome.variables : []}
                    archMeta={archMeta}
                    highlightedLine={hoveredCLine}
                  />
                </div>

                <ErrorPanel errores={outcome.ok ? [] : outcome.errores} />
              </div>

              {/* Right Column: Tabbed Output */}
              <div className="lg:col-span-7 flex flex-col bg-[#1c1e21] border border-[#272a2e] rounded-[4px] overflow-hidden min-h-[460px]">
                {/* Tab Bar with hairlines */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#272a2e] bg-[#121317]">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setActiveTab('listing')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                        activeTab === 'listing'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-[#9c9af2]" />
                      Ensamblador + Hex
                    </button>

                    <button
                      onClick={() => setActiveTab('fields')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                        activeTab === 'fields'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <Binary className="w-3.5 h-3.5 text-[#fa3abf]" />
                      Campos (R/I/L/S/B)
                    </button>

                    <button
                      onClick={() => setActiveTab('vhdl')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                        activeTab === 'vhdl'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Memoria VHDL
                    </button>

                    <button
                      onClick={() => setActiveTab('isa')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans transition-colors ${
                        activeTab === 'isa'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#d9f07c]" />
                      ISA ({isaCatalog.length})
                    </button>
                  </div>

                  {outcome.ok && (
                    <div className="font-mono text-[12px] text-[#878c99] hidden sm:block">
                      <span className="text-[var(--accent)] font-medium">{outcome.listado.length}</span> / {romDepth} pal.
                    </div>
                  )}
                </div>

                {/* Tab Body */}
                <div className="flex-1 overflow-auto bg-[#121317]">
                  {!outcome.ok ? (
                    <div className="p-8 text-center space-y-2">
                      <p className="text-[14px] text-[#f43f5e] font-mono">
                        Corrige los diagnósticos del código C para generar las palabras binarias.
                      </p>
                      <p className="text-[12px] text-[#878c99] font-mono">
                        El compilador solo emite instrucciones del set soportado de {archMeta.shortName}.
                      </p>
                    </div>
                  ) : activeTab === 'listing' ? (
                    <ListingTable
                      listado={outcome.listado}
                      archName={archMeta.shortName}
                      isaCatalog={isaCatalog}
                      onHoverLine={setHoveredCLine}
                    />
                  ) : activeTab === 'fields' ? (
                    <FieldView
                      listado={outcome.listado}
                      arch={arch}
                      onHoverLine={setHoveredCLine}
                    />
                  ) : activeTab === 'vhdl' ? (
                    <VhdlPanel
                      vhdl={outcome.vhdl}
                      hexTxt={outcome.hexTxt}
                      romDepth={outcome.romDepth}
                      wordCount={outcome.listado.length}
                      archName={archMeta.name}
                    />
                  ) : (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[12px]">
                      {isaCatalog.map((s) => (
                        <div
                          key={s.mnemonic}
                          className="p-2.5 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[var(--accent)]">{s.mnemonic}</span>
                            <span className="px-1.5 py-0.2 rounded-[4px] bg-[#121317] text-[11px] text-[#878c99] border border-[#272a2e]">
                              Tipo {s.tipo}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#878c99] font-sans mt-1">
                            {s.descripcion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar: Architecture, MIPS Arithmetic Selector, ROM Depth, Test Examples */}
            <div className="p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[12px] font-mono text-[#878c99] uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Configuración de Arquitectura & Código de Prueba</span>
                </div>
                <span className="text-[11px] font-mono text-[#878c99]">
                  Tema activo:{' '}
                  <strong className="text-[var(--accent)]">
                    {arch === 'riscv' ? 'Verde (RISC-V)' : arch === 'mips' ? 'Azul (MIPS32)' : 'Morado (ARM32)'}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                {/* Left: Architecture, Conditional MIPS Mode & ROM Depth */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-[4px] bg-[#1c1e21] p-1 border border-[#272a2e] text-[12px] font-mono">
                    {ARCH_OPTIONS.map((opt) => {
                      const active = arch === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setArch(opt.id)}
                          className={`px-2.5 py-1 rounded-[4px] transition-colors flex items-center gap-1.5 ${
                            active
                              ? 'bg-[#121317] text-[var(--accent)] border border-[#3b3e45] font-medium'
                              : 'text-[#878c99] hover:text-[#e5e7eb]'
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full opacity-75"
                              style={{ backgroundColor: opt.colorDot }}
                            />
                          )}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Conditional MIPS Arithmetic Instruction Selector */}
                  {arch === 'mips' && (
                    <div className="flex items-center gap-2 bg-[#1c1e21] border border-[var(--accent-border)] rounded-[4px] px-2.5 py-1 text-[12px] font-mono">
                      <span className="text-[#878c99]">Aritmética MIPS:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMipsArithmeticMode('signed')}
                          className={`px-2 py-0.5 rounded-[4px] transition-colors ${
                            mipsArithmeticMode === 'signed'
                              ? 'bg-[var(--accent)] text-[#121317] font-semibold'
                              : 'text-[#d7d9dd] hover:bg-[#272a2e]'
                          }`}
                        >
                          ADD / SUB / ADDI
                        </button>
                        <button
                          onClick={() => setMipsArithmeticMode('unsigned')}
                          className={`px-2 py-0.5 rounded-[4px] transition-colors ${
                            mipsArithmeticMode === 'unsigned'
                              ? 'bg-[var(--accent)] text-[#121317] font-semibold'
                              : 'text-[#d7d9dd] hover:bg-[#272a2e]'
                          }`}
                        >
                          ADDU / SUBU / ADDIU
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 bg-[#1c1e21] border border-[#272a2e] rounded-[4px] px-3 py-1.5 text-[12px] font-mono">
                    <span className="text-[#878c99]">Tamaño de ROM VHDL:</span>
                    <select
                      value={romDepth}
                      onChange={(e) => setRomDepth(Number(e.target.value) as RomDepth)}
                      className="bg-transparent text-[var(--accent)] font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value={32} className="bg-[#121317]">32 palabras (addr 6..2)</option>
                      <option value={64} className="bg-[#121317]">64 palabras (addr 7..2)</option>
                      <option value={128} className="bg-[#121317]">128 palabras (addr 8..2)</option>
                      <option value={256} className="bg-[#121317]">256 palabras (addr 9..2)</option>
                    </select>
                  </div>
                </div>

                {/* Right: Test code selector */}
                <div className="flex items-center gap-2 bg-[#1c1e21] border border-[#272a2e] rounded-[4px] px-3 py-1.5 text-[14px]">
                  <BookOpen className="w-3.5 h-3.5 text-[#878c99]" />
                  <span className="text-[#878c99] text-[12px] font-mono">Cargar código de prueba:</span>
                  <select
                    value={selectedExampleId}
                    onChange={(e) => handleSelectExample(e.target.value)}
                    className="bg-transparent text-[#e5e7eb] font-medium focus:outline-none cursor-pointer text-[14px]"
                  >
                    {EXAMPLES.map((ex) => (
                      <option key={ex.id} value={ex.id} className="bg-[#121317] text-[#e5e7eb]">
                        {ex.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

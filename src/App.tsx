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
import { AnimatedBackground } from './ui/AnimatedBackground';

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
      className="relative min-h-screen flex flex-col bg-[#1c1e21] text-[#e5e7eb] font-sans transition-colors duration-200 overflow-x-hidden"
    >
      <AnimatedBackground arch={arch} />

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#272a2e] bg-[#1c1e21]/85 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo brand */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentPage('compiler')}
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-[4px] bg-[var(--accent-soft)] text-[var(--accent)] transition-colors">
                <Play className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent)]" />
              </span>
              <span className="font-display font-semibold text-[18px] sm:text-[20px] text-[#e5e7eb] tracking-wider">
                VG<span className="text-[var(--accent)] transition-colors">A</span>
              </span>
            </button>
          </div>

          {/* Nav Navigation Links & Repo Link */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCurrentPage('compiler')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans whitespace-nowrap transition-colors ${
                currentPage === 'compiler'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#9c9af2] shrink-0" />
              <span>Compilador</span>
            </button>

            <button
              onClick={() => setCurrentPage('simulator')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans whitespace-nowrap transition-colors ${
                currentPage === 'simulator'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span>Simulador</span>
              {outcome.ok && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-0.5 shadow-[0_0_6px_var(--accent-glow)] shrink-0" />
              )}
            </button>

            <button
              onClick={() => setCurrentPage('docs')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans whitespace-nowrap transition-colors ${
                currentPage === 'docs'
                  ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                  : 'text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#fa3abf] shrink-0" />
              <span>Info</span>
            </button>

            {/* GitHub Repo Link */}
            <a
              href="https://github.com/JaimeVGA/Convertidor-C-a-Ensamblador-"
              target="_blank"
              rel="noopener noreferrer"
              title="Repositorio en GitHub"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-transparent hover:border-[#272a2e] transition-colors shrink-0"
            >
              <Github className="w-4 h-4 text-[#878c99]" />
              <span className="hidden md:inline">Repositorio</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Page Routing */}
      <main className="relative z-10 flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
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
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#272a2e] pb-4">
              <div>
                <h1 className="font-display font-medium text-[22px] sm:text-[28px] text-[#e5e7eb] flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)] shrink-0" />
                  <span>Simulador de Hardware {archMeta.shortName}</span>
                </h1>
                <p className="text-[13px] sm:text-[14px] text-[#878c99] mt-1">
                  Ejecuta el código máquina compilado ciclo a ciclo verificando los {archMeta.regCount} registros y la memoria de datos (RAM).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* Architecture switcher in simulator */}
                <div className="flex flex-wrap items-center rounded-[4px] bg-[#121317] p-1 border border-[#272a2e] text-[12px] font-mono w-full sm:w-auto">
                  {ARCH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setArch(opt.id)}
                      className={`flex-1 sm:flex-initial justify-center px-2.5 py-1 rounded-[4px] transition-colors flex items-center gap-1.5 ${
                        arch === opt.id
                          ? 'bg-[#1c1e21] text-[var(--accent)] border border-[#3b3e45] font-medium'
                          : 'text-[#878c99] hover:text-[#e5e7eb]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
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
          <div className="space-y-5 sm:space-y-6">
            {/* Headline Section */}
            <div className="py-1 sm:py-2 text-center max-w-[820px] mx-auto space-y-2">
              <h2 className="font-display font-medium text-[24px] sm:text-[34px] md:text-[40px] leading-[1.15] tracking-[0.03em] sm:tracking-[0.04em] text-[#e5e7eb]">
                Compila C a{' '}
                <span className="text-[var(--accent)] transition-colors">
                  {archMeta.shortName}
                </span>{' '}
                con emisión limpia a VHDL
              </h2>
              <p className="text-[13px] sm:text-[15px] text-[#878c99] leading-relaxed max-w-[640px] mx-auto px-1">
                Generador para procesadores de 32 bits (R, I, L, S, B). Codificación exacta en hexadecimal y memoria ROM compatible con simuladores Active-HDL.
              </p>
            </div>

            {/* Workspace Panels (Editor Left, Listing Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
              {/* Left Column: C Editor */}
              <div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
                <div className="flex-1 min-h-[340px] lg:min-h-[460px]">
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
              <div className="lg:col-span-7 flex flex-col bg-[#1c1e21] border border-[#272a2e] rounded-[4px] overflow-hidden min-h-[360px] lg:min-h-[460px] min-w-0">
                {/* Tab Bar with hairlines */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 sm:px-3 py-2 border-b border-[#272a2e] bg-[#121317]">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => setActiveTab('listing')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans transition-colors ${
                        activeTab === 'listing'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-[#9c9af2] shrink-0" />
                      <span>Ensamblador + Hex</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('fields')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans transition-colors ${
                        activeTab === 'fields'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <Binary className="w-3.5 h-3.5 text-[#fa3abf] shrink-0" />
                      <span>Campos (R/I/L/S/B)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('vhdl')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans transition-colors ${
                        activeTab === 'vhdl'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span>Memoria VHDL</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('isa')}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans transition-colors ${
                        activeTab === 'isa'
                          ? 'bg-[#1c1e21] text-[#e5e7eb] border border-[#3b3e45]'
                          : 'text-[#878c99] hover:text-[#d7d9dd]'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#d9f07c] shrink-0" />
                      <span>ISA ({isaCatalog.length})</span>
                    </button>
                  </div>

                  {outcome.ok && (
                    <div className="font-mono text-[11px] sm:text-[12px] text-[#878c99] ml-auto">
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
            <div className="p-3 sm:p-4 rounded-[4px] bg-[#121317] border border-[#272a2e] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[11px] sm:text-[12px] font-mono text-[#878c99] uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span>Configuración de Arquitectura & Código de Prueba</span>
                </div>
                <span className="text-[11px] font-mono text-[#878c99]">
                  Tema activo:{' '}
                  <strong className="text-[var(--accent)]">
                    {arch === 'riscv' ? 'Verde (RISC-V)' : arch === 'mips' ? 'Azul (MIPS32)' : 'Morado (ARM32)'}
                  </strong>
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                {/* Left: Architecture, Conditional MIPS Mode & ROM Depth */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <div className="flex flex-wrap items-center rounded-[4px] bg-[#1c1e21] p-1 border border-[#272a2e] text-[12px] font-mono w-full sm:w-auto">
                    {ARCH_OPTIONS.map((opt) => {
                      const active = arch === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setArch(opt.id)}
                          className={`flex-1 sm:flex-initial justify-center px-2.5 py-1.5 sm:py-1 rounded-[4px] transition-colors flex items-center gap-1.5 ${
                            active
                              ? 'bg-[#121317] text-[var(--accent)] border border-[#3b3e45] font-medium'
                              : 'text-[#878c99] hover:text-[#e5e7eb]'
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 className="w-3 h-3 text-[var(--accent)] shrink-0" />
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full opacity-75 shrink-0"
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
                    <div className="flex flex-wrap items-center gap-2 bg-[#1c1e21] border border-[var(--accent-border)] rounded-[4px] px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[12px] font-mono w-full sm:w-auto">
                      <span className="text-[#878c99]">Aritmética MIPS:</span>
                      <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                        <button
                          onClick={() => setMipsArithmeticMode('signed')}
                          className={`flex-1 sm:flex-initial px-2 py-0.5 rounded-[4px] transition-colors ${
                            mipsArithmeticMode === 'signed'
                              ? 'bg-[var(--accent)] text-[#121317] font-semibold'
                              : 'text-[#d7d9dd] hover:bg-[#272a2e]'
                          }`}
                        >
                          ADD / SUB / ADDI
                        </button>
                        <button
                          onClick={() => setMipsArithmeticMode('unsigned')}
                          className={`flex-1 sm:flex-initial px-2 py-0.5 rounded-[4px] transition-colors ${
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

                  <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#1c1e21] border border-[#272a2e] rounded-[4px] px-3 py-1.5 text-[12px] font-mono w-full sm:w-auto">
                    <span className="text-[#878c99] shrink-0">ROM VHDL:</span>
                    <select
                      value={romDepth}
                      onChange={(e) => setRomDepth(Number(e.target.value) as RomDepth)}
                      className="bg-transparent text-[var(--accent)] font-semibold focus:outline-none cursor-pointer min-w-0 truncate"
                    >
                      <option value={32} className="bg-[#121317]">32 palabras (addr 6..2)</option>
                      <option value={64} className="bg-[#121317]">64 palabras (addr 7..2)</option>
                      <option value={128} className="bg-[#121317]">128 palabras (addr 8..2)</option>
                      <option value={256} className="bg-[#121317]">256 palabras (addr 9..2)</option>
                    </select>
                  </div>
                </div>

                {/* Right: Test code selector */}
                <div className="flex items-center gap-2 bg-[#1c1e21] border border-[#272a2e] rounded-[4px] px-3 py-1.5 text-[13px] sm:text-[14px] w-full lg:w-auto min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-[#878c99] shrink-0" />
                  <span className="text-[#878c99] text-[12px] font-mono shrink-0">Ejemplo:</span>
                  <select
                    value={selectedExampleId}
                    onChange={(e) => handleSelectExample(e.target.value)}
                    className="bg-transparent text-[#e5e7eb] font-medium focus:outline-none cursor-pointer text-[13px] sm:text-[14px] flex-1 min-w-0 truncate"
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

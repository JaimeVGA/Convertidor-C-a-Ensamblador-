import React, { useEffect, useState } from 'react';
import {
  Play,
  RotateCcw,
  Cpu,
  Database,
  CheckCircle2,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AssembledLine } from '../compiler/riscv/assembler';
import { VariableSymbol } from '../compiler/semantic';
import { runSimulation, SimulationStepResult } from '../compiler/riscv/simulator';

interface SimulatorPanelProps {
  listado: AssembledLine[];
  variables: VariableSymbol[];
  defaultInputs?: Record<string, number>;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  listado,
  variables,
  defaultInputs = {},
}) => {
  const inputVariables = variables.filter((v) => v.isInput);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<SimulationStepResult | null>(null);
  const [showAllRegs, setShowAllRegs] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const v of variables) {
      if (v.isInput) {
        const defVal = defaultInputs[v.name] ?? 5;
        next[v.name] = String(defVal);
      }
    }
    setInputs(next);
  }, [variables, defaultInputs]);

  useEffect(() => {
    if (listado.length === 0) {
      setSimResult(null);
      return;
    }
    const numericInputs: Record<string, number> = {};
    for (const [k, v] of Object.entries(inputs)) {
      const parsed = Number(v);
      numericInputs[k] = Number.isFinite(parsed) ? parsed | 0 : 0;
    }
    const result = runSimulation(listado, variables, numericInputs);
    setSimResult(result);
  }, [listado, variables, inputs]);

  const handleRunManual = () => {
    const numericInputs: Record<string, number> = {};
    for (const [k, v] of Object.entries(inputs)) {
      const parsed = Number(v);
      numericInputs[k] = Number.isFinite(parsed) ? parsed | 0 : 0;
    }
    setSimResult(runSimulation(listado, variables, numericInputs));
  };

  const handleResetInputs = () => {
    const reset: Record<string, string> = {};
    for (const v of inputVariables) {
      reset[v.name] = String(defaultInputs[v.name] ?? 5);
    }
    setInputs(reset);
  };

  return (
    <div className="bg-[#1c1e21] border border-[#272a2e] rounded-[4px] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#272a2e] bg-[#121317]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#a8ff53] shadow-[0_0_8px_rgba(168,255,83,0.5)]" />
          <Cpu className="w-4 h-4 text-[#878c99]" />
          <div>
            <h2 className="text-[14px] font-mono font-medium text-[#e5e7eb]">
              Simulador Integrado (Hardware Verification)
            </h2>
            <p className="text-[12px] text-[#878c99]">
              Valida en la Memoria de datos (RAM) y el Banco de registros antes de sintetizar en Active-HDL
            </p>
          </div>
        </div>

        {simResult && (
          <div className="flex items-center gap-2 text-[12px] font-mono">
            {simResult.halted ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1c1e21] text-[#a8ff53] border border-[#272a2e]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ciclo de fin alcanzado · {simResult.stepsExecuted} ciclos ejecutados
              </span>
            ) : simResult.infiniteLoopDetected ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1c1e21] text-[#d9f07c] border border-[#272a2e]">
                <AlertOctagon className="w-3.5 h-3.5" />
                &gt;100k instrucciones (posible bucle)
              </span>
            ) : simResult.error ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1c1e21] text-[#f43f5e] border border-[#272a2e]">
                <AlertOctagon className="w-3.5 h-3.5" />
                {simResult.error}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Grid Content */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: Inputs */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#878c99] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#d9f07c]" />
              RAM Inicial (Variables de Entrada)
            </span>
            {inputVariables.length > 0 && (
              <button
                onClick={handleResetInputs}
                className="flex items-center gap-1 text-[12px] text-[#878c99] hover:text-[#e5e7eb] transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar
              </button>
            )}
          </div>

          {inputVariables.length === 0 ? (
            <div className="p-3 rounded-[4px] bg-[#121317] border border-[#272a2e] text-[14px] text-[#878c99] font-mono">
              Todas las variables tienen inicializador fijo en C.
            </div>
          ) : (
            <div className="space-y-2">
              {inputVariables.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-[4px] bg-[#121317] border border-[#272a2e]"
                >
                  <div className="font-mono text-[14px]">
                    <span className="text-[#a8ff53] font-medium">{v.name}</span>
                    <span className="text-[#878c99] ml-1.5 text-[12px]">({v.varType})</span>
                    <div className="text-[11px] text-[#878c99]">
                      RAM[{v.ramAddr}] → x{v.reg}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={inputs[v.name] ?? '0'}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                    className="w-24 px-2 py-1 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] focus:border-[#3b3e45] focus:outline-none text-right font-mono text-[14px] text-[#e5e7eb]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Primary Signal Lime Filled Button */}
          <button
            onClick={handleRunManual}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-[4px] bg-[#a8ff53] text-[#121317] font-sans font-medium text-[14px] hover:bg-[#a8ff53]/90 transition-all shadow-[inset_0_0_0_1px_rgba(168,255,83,0.2)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Ejecutar Simulación
          </button>
        </div>

        {/* Right column: Results */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#878c99] block mb-2">
              Resultados en Memoria de Datos (RAM) tras epílogo
            </span>

            {simResult && simResult.variableResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {simResult.variableResults.map((vr) => (
                  <div
                    key={vr.name}
                    className="p-3 rounded-[4px] bg-[#121317] border border-[#272a2e] hover:border-[#3b3e45] transition-colors font-mono"
                  >
                    <div className="flex items-center justify-between text-[12px] text-[#878c99] mb-1">
                      <span>
                        <strong className="text-[#e5e7eb]">{vr.name}</strong> (x{vr.reg})
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[4px] bg-[#1c1e21] text-[#9c9af2] border border-[#272a2e]">
                        RAM[{vr.ramAddr}]
                      </span>
                    </div>
                    <div className="text-[20px] font-bold text-[#afec73] tracking-tight">
                      {vr.displayValue}
                    </div>
                    <div className="text-[12px] text-[#878c99] mt-0.5">{vr.hexValue}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-[4px] bg-[#121317] border border-[#272a2e] text-[14px] text-[#878c99]">
                Sin resultados.
              </div>
            )}
          </div>

          {/* Toggleable Register Bank */}
          {simResult && (
            <div className="pt-2 border-t border-[#272a2e]">
              <button
                onClick={() => setShowAllRegs((s) => !s)}
                className="flex items-center gap-1.5 text-[12px] font-mono text-[#878c99] hover:text-[#d7d9dd] transition-colors"
              >
                {showAllRegs ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Ocultar Banco de Registros (x0..x31)
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Ver Banco de Registros (x0..x31)
                  </>
                )}
              </button>

              {showAllRegs && (
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 font-mono text-[11px]">
                  {Array.from(simResult.registers).map((val, idx) => {
                    const isNonZero = val !== 0;
                    const isVarReg = idx >= 10 && idx <= 27;
                    return (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-[4px] border ${
                          isNonZero
                            ? 'bg-[#121317] border-[#3b3e45] text-[#a8ff53]'
                            : 'bg-[#121317] border-[#272a2e] text-[#878c99]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold">x{idx}</span>
                          {isVarReg && <span className="text-[#9c9af2]">var</span>}
                        </div>
                        <div className="font-semibold truncate mt-0.5">{val}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

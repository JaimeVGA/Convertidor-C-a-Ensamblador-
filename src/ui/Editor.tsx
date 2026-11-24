import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { CompileError } from '../compiler/errors';
import { VariableSymbol } from '../compiler/semantic';
import type { ArchMetadata } from '../compiler/types';
import { Terminal, Database } from 'lucide-react';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  errores: CompileError[];
  variables: VariableSymbol[];
  archMeta: ArchMetadata;
  highlightedLine?: number;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  errores,
  variables,
  archMeta,
  highlightedLine,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#1c1e21] border border-[#272a2e] rounded-[4px] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 border-b border-[#272a2e] bg-[#121317]">
        <div className="flex items-center gap-2">
          {/* Dynamic Signal LED */}
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] transition-colors shrink-0" />
          <Terminal className="w-3.5 h-3.5 text-[#878c99] shrink-0" />
          <span className="text-[13px] sm:text-[14px] font-mono font-medium text-[#d7d9dd]">
            main.c
          </span>
          <span className="text-[11px] sm:text-[12px] font-mono px-2 py-0.5 rounded-full bg-[#272a2e] text-[#878c99] border border-[#3b3e45] whitespace-nowrap">
            {archMeta.badge}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[12px] sm:text-[14px] font-mono">
          {highlightedLine !== undefined && (
            <span className="text-[var(--accent)] text-[11px] sm:text-[12px] bg-[var(--accent-soft)] px-2 py-0.5 rounded-[4px] border border-[var(--accent-border)]">
              Línea C #{highlightedLine}
            </span>
          )}
          {errores.length === 0 ? (
            <span className="flex items-center gap-1.5 text-[var(--accent)] text-[12px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Sintaxis válida
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[#f43f5e] text-[12px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
              {errores.length} {errores.length === 1 ? 'error' : 'errores'}
            </span>
          )}
        </div>
      </div>

      {/* CodeMirror Workspace (Ink Well #121317 surface) */}
      <div className="relative flex-1 min-h-[240px] sm:min-h-[320px] bg-[#121317] overflow-auto">
        <CodeMirror
          value={code}
          height="100%"
          theme={tokyoNight}
          extensions={[cpp()]}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            autocompletion: true,
            bracketMatching: true,
          }}
          className="h-full text-[14px]"
        />
      </div>

      {/* Symbol Table Mapping in Inset Pane */}
      <div className="px-3.5 py-2.5 bg-[#121317] border-t border-[#272a2e]">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-[#878c99]">
            <Database className="w-3.5 h-3.5 text-[#9c9af2]" />
            Registros & RAM (Mapeo de Símbolos)
          </span>
          <span className="text-[12px] font-mono text-[#878c99]">
            {variables.length}/{archMeta.maxVariables} vars ({archMeta.varRegRangeLabel})
          </span>
        </div>

        {variables.length === 0 ? (
          <p className="text-[14px] text-[#878c99] font-mono">
            Declara variables con <code className="text-[#9c9af2]">int</code> o{' '}
            <code className="text-[#9c9af2]">unsigned</code> para inspeccionar su registro asignado.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <div
                key={v.name}
                className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] text-[12px] font-mono"
              >
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-medium ${
                    v.isInput
                      ? 'bg-[#fa3abf]/15 text-[#fa3abf]'
                      : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  }`}
                >
                  {v.isInput ? 'ENTRADA' : 'VAR'}
                </span>
                <span className="text-[#e5e7eb] font-semibold">{v.name}</span>
                <span className="text-[#878c99]">({v.varType})</span>
                <span className="text-[#d9f07c]">→ {v.regName ?? `x${v.reg}`}</span>
                <span className="text-[#9c9af2]">@RAM[{v.ramAddr}]</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

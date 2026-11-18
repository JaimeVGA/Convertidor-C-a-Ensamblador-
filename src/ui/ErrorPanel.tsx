import React from 'react';
import { AlertCircle } from 'lucide-react';
import { CompileError } from '../compiler/errors';

interface ErrorPanelProps {
  errores: CompileError[];
  onSelectError?: (linea: number) => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ errores, onSelectError }) => {
  if (errores.length === 0) return null;

  return (
    <div className="bg-[#121317] border border-[#f43f5e]/40 rounded-[4px] p-3">
      <div className="flex items-center gap-2 text-[#f43f5e] font-mono text-[12px] uppercase tracking-wider mb-2">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Diagnósticos del Compilador ({errores.length})</span>
      </div>
      <ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
        {errores.map((err, i) => (
          <li
            key={`${err.linea}-${err.columna}-${i}`}
            onClick={() => onSelectError?.(err.linea)}
            className="flex items-start gap-2 text-[14px] font-mono p-1.5 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] hover:border-[#3b3e45] cursor-pointer transition-colors"
          >
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#f43f5e]/15 text-[#f43f5e] font-semibold text-[12px] shrink-0">
              L{err.linea}:{err.columna}
            </span>
            <span className="text-[#e5e7eb] leading-snug">{err.mensaje}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { AssembledLine, InstrCategory, IsaCatalogEntry } from '../compiler/types';

interface ListingTableProps {
  listado: AssembledLine[];
  archName: string;
  isaCatalog: IsaCatalogEntry[];
  onHoverLine?: (cLine?: number) => void;
}

const BADGE_STYLE: Record<InstrCategory, string> = {
  R: 'text-[#9c9af2] border-[#9c9af2]/30 bg-[#9c9af2]/10',
  I: 'text-[#afec73] border-[#afec73]/30 bg-[#afec73]/10',
  L: 'text-[#d9f07c] border-[#d9f07c]/30 bg-[#d9f07c]/10',
  S: 'text-[#e888f8] border-[#e888f8]/30 bg-[#e888f8]/10',
  B: 'text-[#fa3abf] border-[#fa3abf]/30 bg-[#fa3abf]/10',
};

export const ListingTable: React.FC<ListingTableProps> = ({
  listado,
  archName,
  isaCatalog,
  onHoverLine,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const descByMnemonic = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of isaCatalog) {
      map.set(item.mnemonic, item.descripcion);
    }
    return map;
  }, [isaCatalog]);

  const handleCopyHex = (hex: string, index: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1400);
  };

  return (
    <div className="bg-[#121317]">
      {/* Mobile card list (zero horizontal overflow on phones) */}
      <div className="sm:hidden divide-y divide-[#272a2e] font-mono">
        {listado.map((line) => {
          const descripcion = descByMnemonic.get(line.mnemonic) ?? line.mnemonic;
          return (
            <div
              key={line.index}
              className="p-3 space-y-2 hover:bg-[#1c1e21] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#878c99]">#{line.index}</span>
                  <span className="text-[#b5b8c0]">{line.pcHex}</span>
                  <span
                    title={descripcion}
                    className={`inline-block px-1.5 py-0.2 rounded-[4px] border text-[10px] font-semibold ${BADGE_STYLE[line.tipo]}`}
                  >
                    {line.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyHex(line.hex, line.index)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] text-[var(--accent)] text-[12px] font-medium"
                  >
                    <span>0x{line.hex}</span>
                    {copiedIndex === line.index ? (
                      <Check className="w-3 h-3 text-[var(--accent)]" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#878c99]" />
                    )}
                  </button>
                  {line.cLine !== undefined ? (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#272a2e] text-[#b5b8c0] text-[11px]">
                      L{line.cLine}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#878c99]">epílogo</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                {line.labels.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-[4px] bg-[#272a2e] text-[#d9f07c] border border-[#3b3e45] text-[11px]">
                    {line.labels.join(', ')}:
                  </span>
                )}
                <span className="text-[#e5e7eb] font-medium">{line.asmText}</span>
              </div>
              {line.comment && (
                <p className="text-[11px] text-[#878c99]">// {line.comment}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop & tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-[14px]">
          <thead>
            <tr className="border-b border-[#272a2e] bg-[#1c1e21] text-[12px] uppercase tracking-wider text-[#878c99]">
              <th className="py-2.5 px-3">ROM #</th>
              <th className="py-2.5 px-3">PC</th>
              <th className="py-2.5 px-3">Palabra Hex (32b)</th>
              <th className="py-2.5 px-3 text-center">Tipo</th>
              <th className="py-2.5 px-3">Etiqueta</th>
              <th className="py-2.5 px-3">Instrucción {archName}</th>
              <th className="py-2.5 px-3 text-right">Línea C</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#272a2e]">
            {listado.map((line) => {
              const descripcion = descByMnemonic.get(line.mnemonic) ?? line.mnemonic;
              return (
                <tr
                  key={line.index}
                  onMouseEnter={() => onHoverLine?.(line.cLine)}
                  onMouseLeave={() => onHoverLine?.(undefined)}
                  className="group hover:bg-[#1c1e21] transition-colors"
                >
                  <td className="py-2 px-3 text-[#878c99]">{line.index}</td>
                  <td className="py-2 px-3 text-[#b5b8c0]">{line.pcHex}</td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleCopyHex(line.hex, line.index)}
                      title="Copiar hexadecimal"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] group-hover:border-[#3b3e45] text-[var(--accent)] font-medium tracking-wider hover:bg-[#272a2e] transition-colors"
                    >
                      <span>0x{line.hex}</span>
                      {copiedIndex === line.index ? (
                        <Check className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#878c99] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      title={descripcion}
                      className={`inline-block px-2 py-0.5 rounded-[4px] border text-[11px] font-semibold ${BADGE_STYLE[line.tipo]}`}
                    >
                      {line.tipo}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {line.labels.length > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#272a2e] text-[#d9f07c] border border-[#3b3e45]">
                        {line.labels.join(', ')}:
                      </span>
                    ) : (
                      <span className="text-[#3b3e45]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e5e7eb]">{line.asmText}</span>
                      {line.comment && (
                        <span className="text-[12px] text-[#878c99] hidden xl:inline">
                          // {line.comment}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {line.cLine !== undefined ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#272a2e] text-[#b5b8c0] text-[12px]">
                        L{line.cLine}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#878c99]">epílogo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

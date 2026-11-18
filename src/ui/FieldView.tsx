import React from 'react';
import { AssembledLine } from '../compiler/riscv/assembler';
import { BitFieldSegment } from '../compiler/riscv/encoder';

interface FieldViewProps {
  listado: AssembledLine[];
  onHoverLine?: (cLine?: number) => void;
}

// Trigger.dev syntax highlighting colors for roles
const ROLE_COLOR: Record<BitFieldSegment['role'], string> = {
  opcode: 'bg-[#9c9af2]/10 border-[#9c9af2]/30 text-[#9c9af2]',
  rd: 'bg-[#afec73]/10 border-[#afec73]/30 text-[#afec73]',
  funct3: 'bg-[#d9f07c]/10 border-[#d9f07c]/30 text-[#d9f07c]',
  rs1: 'bg-[#7655fd]/15 border-[#7655fd]/40 text-[#9c9af2]',
  rs2: 'bg-[#e888f8]/10 border-[#e888f8]/30 text-[#e888f8]',
  funct7: 'bg-[#fa3abf]/10 border-[#fa3abf]/30 text-[#fa3abf]',
  imm: 'bg-[#a8ff53]/10 border-[#a8ff53]/30 text-[#a8ff53]',
};

export const FieldView: React.FC<FieldViewProps> = ({ listado, onHoverLine }) => {
  return (
    <div className="p-4 space-y-3 bg-[#121317]">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-[#272a2e] text-[12px] font-mono">
        <span className="text-[#878c99] mr-1">Campos de 32 bits:</span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#a8ff53]/10 border-[#a8ff53]/30 text-[#a8ff53]">
          imm / shamt / offset
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#fa3abf]/10 border-[#fa3abf]/30 text-[#fa3abf]">
          funct7
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#e888f8]/10 border-[#e888f8]/30 text-[#e888f8]">
          rs2
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#7655fd]/15 border-[#7655fd]/40 text-[#9c9af2]">
          rs1
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#d9f07c]/10 border-[#d9f07c]/30 text-[#d9f07c]">
          funct3
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#afec73]/10 border-[#afec73]/30 text-[#afec73]">
          rd
        </span>
        <span className="px-2 py-0.5 rounded-[4px] border bg-[#9c9af2]/10 border-[#9c9af2]/30 text-[#9c9af2]">
          opcode
        </span>
      </div>

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {listado.map((line) => (
          <div
            key={line.index}
            onMouseEnter={() => onHoverLine?.(line.cLine)}
            onMouseLeave={() => onHoverLine?.(undefined)}
            className="p-3 rounded-[4px] bg-[#1c1e21] border border-[#272a2e] hover:border-[#3b3e45] transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[14px]">
              <div className="flex items-center gap-2">
                <span className="text-[#878c99]">#{line.index}</span>
                <span className="text-[#b5b8c0]">({line.pcHex})</span>
                <span className="px-1.5 py-0.2 rounded-[4px] bg-[#121317] text-[#a8ff53] font-medium border border-[#272a2e]">
                  0x{line.hex}
                </span>
                <span className="text-[#878c99]">Tipo {line.tipo}</span>
                <span className="text-[#e5e7eb] font-semibold">{line.asmText}</span>
              </div>
              {line.cLine !== undefined && (
                <span className="text-[12px] text-[#878c99]">C línea {line.cLine}</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
              {line.decoded.segments.map((seg, sIdx) => (
                <div
                  key={sIdx}
                  className={`flex flex-col justify-between p-2 rounded-[4px] border min-w-0 overflow-hidden ${ROLE_COLOR[seg.role]}`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-80 gap-1">
                    <span className="font-semibold truncate">{seg.label}</span>
                    <span className="text-[10px] text-[#878c99] shrink-0 font-normal">[{seg.range}]</span>
                  </div>
                  <div className="text-[11px] sm:text-[12px] font-bold tracking-wider my-1 text-center truncate">
                    {seg.bits}
                  </div>
                  <div className="text-[10px] text-center opacity-90 truncate">
                    {seg.meaning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

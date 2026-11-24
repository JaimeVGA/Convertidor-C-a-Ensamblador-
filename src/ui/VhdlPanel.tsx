import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, FileText } from 'lucide-react';
import { RomDepth } from '../compiler/output/vhdl';

interface VhdlPanelProps {
  vhdl: string;
  hexTxt: string;
  romDepth: RomDepth;
  wordCount: number;
  archName: string;
}

export const VhdlPanel: React.FC<VhdlPanelProps> = ({
  vhdl,
  hexTxt,
  romDepth,
  wordCount,
  archName,
}) => {
  const [subTab, setSubTab] = useState<'vhdl' | 'txt'>('vhdl');
  const [copied, setCopied] = useState(false);

  const activeContent = subTab === 'vhdl' ? vhdl : hexTxt;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#121317]">
      {/* Hairline Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 bg-[#1c1e21] border-b border-[#272a2e]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTab('vhdl')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-mono transition-colors ${
              subTab === 'vhdl'
                ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                : 'text-[#878c99] hover:text-[#d7d9dd]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#9c9af2] shrink-0" />
            <span className="truncate">instruction_memory.vhdl</span>
          </button>
          <button
            onClick={() => setSubTab('txt')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-mono transition-colors ${
              subTab === 'txt'
                ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                : 'text-[#878c99] hover:text-[#d7d9dd]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#afec73] shrink-0" />
            <span>programa.txt ({wordCount})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Secondary Ghost Button */}
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-[#272a2e] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-[var(--accent)]">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#878c99]" />
                <span>Copiar</span>
              </>
            )}
          </button>

          {/* Primary Accent Filled CTA Button */}
          <button
            onClick={() => downloadFile(vhdl, 'instruction_memory.vhdl')}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans font-medium bg-[var(--accent)] text-[#121317] hover:bg-[var(--accent-hover)] transition-all shadow-[inset_0_0_0_1px_var(--accent-border)] whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#121317]" />
            <span>.vhdl</span>
          </button>

          <button
            onClick={() => downloadFile(hexTxt, 'programa.txt')}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[12px] sm:text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-[#272a2e] transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#878c99]" />
            <span>.txt</span>
          </button>
        </div>
      </div>

      {/* Info Status Bar */}
      <div className="px-3 sm:px-4 py-2 bg-[#121317] border-b border-[#272a2e] flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-[12px] font-mono text-[#878c99]">
        <span>
          Entidad: <strong className="text-[#e5e7eb]">instruction_memory</strong> · ISA:{' '}
          <strong className="text-[var(--accent)]">{archName}</strong> · Puertos:{' '}
          <code className="text-[#b5b8c0]">addr(31..0)</code> →{' '}
          <code className="text-[#b5b8c0]">data(31..0)</code>
        </span>
        <span>
          Ocupación: <strong className="text-[var(--accent)]">{wordCount}</strong> / {romDepth} pal.
        </span>
      </div>

      {/* Recessed Inset Terminal Code */}
      <pre className="p-3 sm:p-4 text-[12px] sm:text-[14px] font-mono text-[#e5e7eb] overflow-auto max-h-[360px] sm:max-h-[460px] leading-relaxed select-all bg-[#121317]">
        {activeContent}
      </pre>
    </div>
  );
};

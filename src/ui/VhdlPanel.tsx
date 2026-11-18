import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, FileText } from 'lucide-react';
import { RomDepth } from '../compiler/output/vhdl';

interface VhdlPanelProps {
  vhdl: string;
  hexTxt: string;
  romDepth: RomDepth;
  wordCount: number;
}

export const VhdlPanel: React.FC<VhdlPanelProps> = ({
  vhdl,
  hexTxt,
  romDepth,
  wordCount,
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
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#1c1e21] border-b border-[#272a2e]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSubTab('vhdl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-mono transition-colors ${
              subTab === 'vhdl'
                ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                : 'text-[#878c99] hover:text-[#d7d9dd]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#9c9af2]" />
            instruction_memory.vhdl
          </button>
          <button
            onClick={() => setSubTab('txt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-mono transition-colors ${
              subTab === 'txt'
                ? 'bg-[#121317] text-[#e5e7eb] border border-[#3b3e45]'
                : 'text-[#878c99] hover:text-[#d7d9dd]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#afec73]" />
            programa.txt ({wordCount} líneas)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Secondary Ghost Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-[#272a2e] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#a8ff53]" />
                <span className="text-[#a8ff53]">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#878c99]" />
                <span>Copiar</span>
              </>
            )}
          </button>

          {/* Primary Signal Lime Filled CTA Button */}
          <button
            onClick={() => downloadFile(vhdl, 'instruction_memory.vhdl')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-[14px] font-sans font-medium bg-[#a8ff53] text-[#121317] hover:bg-[#a8ff53]/90 transition-all shadow-[inset_0_0_0_1px_rgba(168,255,83,0.2)]"
          >
            <Download className="w-3.5 h-3.5 text-[#121317]" />
            <span>Descargar .vhdl</span>
          </button>

          <button
            onClick={() => downloadFile(hexTxt, 'programa.txt')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[14px] font-sans text-[#d7d9dd] hover:text-[#e5e7eb] hover:bg-[#272a2e] border border-[#272a2e] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#878c99]" />
            <span>Descargar .txt</span>
          </button>
        </div>
      </div>

      {/* Info Status Bar */}
      <div className="px-4 py-2 bg-[#121317] border-b border-[#272a2e] flex items-center justify-between text-[12px] font-mono text-[#878c99]">
        <span>
          Entidad: <strong className="text-[#e5e7eb]">instruction_memory</strong> · Puertos:{' '}
          <code className="text-[#b5b8c0]">addr(31 downto 0)</code> →{' '}
          <code className="text-[#b5b8c0]">data(31 downto 0)</code>
        </span>
        <span>
          Ocupación: <strong className="text-[#a8ff53]">{wordCount}</strong> / {romDepth} palabras
        </span>
      </div>

      {/* Recessed Inset Terminal Code */}
      <pre className="p-4 text-[14px] font-mono text-[#e5e7eb] overflow-auto max-h-[460px] leading-relaxed select-all bg-[#121317]">
        {activeContent}
      </pre>
    </div>
  );
};

import React, { useState } from "react";
import { X, Copy, Check, GitCompare, ArrowRight } from "lucide-react";
import { computeLineDiff } from "../utils/diffUtils";
import { zenAudio } from "../utils/zenAudio";

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldCode: string;
  newCode: string;
  title?: string;
  onApplyNewCode?: (newCode: string) => void;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  oldCode,
  newCode,
  title = "Visual Code Diff Comparison",
  onApplyNewCode,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const diffLines = computeLineDiff(oldCode, newCode);

  const handleCopyNew = () => {
    navigator.clipboard.writeText(newCode);
    setCopied(true);
    zenAudio.playCopyChime();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-zinc-950 border border-zinc-700 rounded-none shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-none bg-zinc-800 border border-zinc-700 text-zinc-300">
              <GitCompare className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-sans">{title}</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Red: Deletions | Green: Additions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy New Code</span>
            </button>

            {onApplyNewCode && (
              <button
                onClick={() => {
                  onApplyNewCode(newCode);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors border border-white"
              >
                <span>Apply Changes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-none border border-transparent hover:border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Content List */}
        <div className="flex-1 overflow-auto p-4 bg-zinc-950 font-mono text-xs leading-relaxed">
          <div className="space-y-0.5 border border-zinc-800 rounded-none overflow-hidden">
            {diffLines.map((line, idx) => {
              let bgClass = "bg-transparent text-zinc-300";
              let prefix = " ";

              if (line.type === "add") {
                bgClass = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500";
                prefix = "+";
              } else if (line.type === "delete") {
                bgClass = "bg-red-950/40 text-red-300 border-l-2 border-red-500";
                prefix = "-";
              }

              return (
                <div key={idx} className={`flex items-start px-3 py-0.5 ${bgClass}`}>
                  <span className="w-8 shrink-0 text-zinc-600 select-none text-right pr-2">
                    {line.oldLineNumber || ""}
                  </span>
                  <span className="w-8 shrink-0 text-zinc-600 select-none text-right pr-3">
                    {line.newLineNumber || ""}
                  </span>
                  <span className="w-4 shrink-0 font-bold select-none">{prefix}</span>
                  <span className="whitespace-pre-wrap break-all flex-1">{line.content}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

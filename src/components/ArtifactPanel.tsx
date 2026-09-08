import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { 
  Eye, 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  X, 
  Sparkles, 
  Edit3,
  ShieldCheck
} from "lucide-react";
import { ArtifactItem } from "../types";
import { zenAudio } from "../utils/zenAudio";

interface ArtifactPanelProps {
  artifact: ArtifactItem | null;
  isOpen: boolean;
  onClose: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isStreaming?: boolean;
  onSendToChat?: (prompt: string) => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  isOpen,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  isStreaming = false,
}) => {
  if (!isOpen || !artifact) return null;

  const isMarkdown = ["md", "markdown"].includes(artifact.extension.toLowerCase());
  const isHtmlVisual = ["html", "svg", "jsx", "tsx"].includes(artifact.extension.toLowerCase());
  const canPreview = isMarkdown || isHtmlVisual;

  const [viewMode, setViewMode] = useState<"preview" | "code">(canPreview ? "preview" : "code");
  const [copied, setCopied] = useState(false);
  const [customFilename, setCustomFilename] = useState(artifact.filename);
  const [isEditingFilename, setIsEditingFilename] = useState(false);

  // Keep custom filename in sync when switching artifacts
  useEffect(() => {
    setCustomFilename(artifact.filename);
    if (!canPreview) {
      setViewMode("code");
    }
  }, [artifact.id, artifact.filename, canPreview]);

  // Auto-scroll to bottom while streaming if in code mode
  const codeContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [artifact.content, isStreaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    zenAudio.playCopyChime();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    zenAudio.playSoftClick();
    const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = customFilename || artifact.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isSvg = artifact.extension.toLowerCase() === "svg" || artifact.content.trim().startsWith("<svg");

  const sanitizedVisualContent = isSvg
    ? DOMPurify.sanitize(artifact.content, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "meta"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
      })
    : DOMPurify.sanitize(artifact.content, {
        ADD_TAGS: ["style", "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td", "button", "input", "label", "form", "section", "article", "nav", "header", "footer", "main", "img", "svg", "path", "circle", "rect", "line", "polyline", "polygon"],
        ADD_ATTR: ["class", "id", "style", "src", "alt", "href", "target", "rel", "type", "value", "placeholder", "d", "viewBox", "fill", "stroke", "stroke-width", "width", "height"],
        FORBID_TAGS: ["script", "iframe", "object", "embed", "applet", "base", "meta", "link"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onkeydown", "onkeyup", "onkeypress", "onsubmit", "formaction"],
      });

  const visualSrcDoc = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https: blob:; media-src data:; connect-src 'none'; frame-ancestors 'none';">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #ffffff;
      color: #09090b;
      margin: 0;
      padding: 1.25rem;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${isSvg ? `<div style="display:flex;justify-content:center;align-items:center;min-height:80vh;">${sanitizedVisualContent}</div>` : `<div id="root">${sanitizedVisualContent}</div>`}
</body>
</html>
  `;

  const lines = artifact.content.split("\n");
  const lineCount = lines.length;

  return (
    <div
      className={`h-full flex flex-col bg-white border-l border-zinc-200 transition-all duration-200 z-30 ${
        isFullscreen ? "fixed inset-0 w-full z-50 bg-white" : "w-full h-full"
      }`}
    >
      {/* Top Header Bar */}
      <div className="h-14 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: View Mode Toggle & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Preview / Code Toggle Buttons */}
          <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode("preview");
                zenAudio.playSoftClick();
              }}
              title="ดูพรีวิวเอกสาร/หน้าเว็บ"
              disabled={!canPreview}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "preview"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : canPreview
                  ? "text-zinc-600 hover:text-zinc-900"
                  : "text-zinc-400 opacity-40 cursor-not-allowed"
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("code");
                zenAudio.playSoftClick();
              }}
              title="ดูโค้ด / ข้อความดิบ"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "code"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Extension Badge */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingFilename ? (
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                onBlur={() => setIsEditingFilename(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditingFilename(false);
                  }
                }}
                autoFocus
                className="bg-white text-zinc-950 px-2 py-0.5 rounded-md border border-zinc-300 font-mono text-xs focus:outline-none w-36 sm:w-48"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingFilename(true)}
                className="flex items-center gap-1.5 font-sans font-semibold text-sm sm:text-[15px] text-zinc-900 hover:text-indigo-600 truncate cursor-pointer tracking-tight"
                title="คลิกเพื่อแก้ไขชื่อไฟล์"
              >
                <span className="truncate">{artifact.title || customFilename}</span>
                <span className="text-xs font-mono text-zinc-400 font-normal uppercase">
                  · {artifact.extension}
                </span>
                <Edit3 className="w-3 h-3 text-zinc-400 hover:text-zinc-700 shrink-0 ml-1" />
              </button>
            )}

            {/* Live Streaming Badge */}
            {isStreaming && (
              <span className="inline-flex items-center gap-1 text-[11px] font-thai text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0 animate-pulse font-medium">
                <Sparkles className="w-3 h-3 animate-spin text-indigo-600" /> กำลังเขียนสด...
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Copy, Download, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "คัดลอกแล้ว!" : "คัดลอก"}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-sans font-medium transition-all cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copy</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            title={`ดาวน์โหลด ${customFilename}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-sans font-medium transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
              className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="ปิดหน้าต่างไฟล์"
            className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-auto relative bg-white p-4 sm:p-6 text-zinc-900">
        {viewMode === "preview" && isMarkdown ? (
          /* Rendered Markdown Preview */
          <div className="max-w-3xl mx-auto font-thai text-zinc-900 space-y-4 leading-[1.8]">
            <ReactMarkdown
              components={{
                h1({ children }) {
                  return (
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 mb-4 mt-2 pb-2 border-b border-zinc-200">
                      {children}
                    </h1>
                  );
                },
                h2({ children }) {
                  return (
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 mb-3 mt-6 pb-1 border-b border-zinc-200">
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 className="text-lg sm:text-xl font-semibold text-zinc-950 mb-2 mt-4">
                      {children}
                    </h3>
                  );
                },
                p({ children }) {
                  return <p className="text-[15.5px] leading-relaxed text-zinc-900 mb-3">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc pl-6 space-y-1.5 text-zinc-900 mb-4">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-6 space-y-1.5 text-zinc-900 mb-4">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>;
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-sm border-collapse">{children}</table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-950 font-semibold">{children}</thead>;
                },
                th({ children }) {
                  return <th className="p-2.5 border-r border-zinc-200 last:border-r-0 font-semibold">{children}</th>;
                },
                td({ children }) {
                  return <td className="p-2.5 border-b border-r border-zinc-100 last:border-r-0 text-zinc-800">{children}</td>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/40 pl-4 py-2 italic text-zinc-800 my-4 rounded-r-xl border-y border-r border-zinc-200/80">
                      {children}
                    </blockquote>
                  );
                },
                a({ href, children }) {
                  if (!href) return <span>{children}</span>;
                  try {
                    const parsedUrl = new URL(href, window.location.href);
                    if (["http:", "https:", "mailto:"].includes(parsedUrl.protocol)) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                        >
                          {children}
                        </a>
                      );
                    }
                  } catch {}
                  return <span className="text-zinc-600">{children}</span>;
                },
                code({ inline, className, children, ...props }: any) {
                  if (inline) {
                    return (
                      <code className="bg-zinc-100 px-1.5 py-0.5 rounded-md font-mono text-[13px] text-indigo-700 border border-zinc-200/80">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <div className="my-3 overflow-x-auto bg-zinc-50 p-3 rounded-xl border border-zinc-200 font-mono text-[13px] text-zinc-900">
                      <code>{children}</code>
                    </div>
                  );
                },
              }}
            >
              {artifact.content}
            </ReactMarkdown>

            {/* Live Typing Indicator in Preview */}
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 pt-2 animate-pulse font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>กำลังพิมพ์เนื้อหาแบบสด...</span>
              </div>
            )}
          </div>
        ) : viewMode === "preview" && isHtmlVisual ? (
          /* Sanitized HTML / SVG Live Sandbox Preview */
          <div className="w-full h-full min-h-[500px] border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <iframe
              title="Artifact Preview"
              srcDoc={visualSrcDoc}
              sandbox=""
              className="w-full h-full min-h-[500px] border-0"
            />
          </div>
        ) : (
          /* Raw Code View with Line Numbers & Monospace Font */
          <div ref={codeContainerRef} className="h-full overflow-auto font-mono text-xs sm:text-[13px] leading-relaxed">
            <div className="min-w-full inline-block pb-10">
              {lines.map((line, idx) => (
                <div key={idx} className="flex hover:bg-indigo-50/40 group py-0.5">
                  <span className="w-12 shrink-0 select-none text-right pr-4 text-zinc-400 font-mono text-xs group-hover:text-zinc-600">
                    {idx + 1}
                  </span>
                  <span className="flex-1 whitespace-pre pr-4 text-zinc-900 selection:bg-indigo-100">
                    {line || " "}
                  </span>
                </div>
              ))}

              {isStreaming && (
                <div className="flex items-center py-1 pl-12 text-indigo-600 animate-pulse font-medium">
                  <span className="inline-block w-2 h-4 bg-indigo-600 mr-2 rounded-xs" />
                  <span className="text-xs font-mono">กำลังเขียนบรรทัดถัดไป...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="h-9 px-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>{lineCount} บรรทัด</span>
          <span>•</span>
          <span>{artifact.content.length} ตัวอักษร</span>
          <span>•</span>
          <span className="uppercase font-semibold text-zinc-700">{artifact.extension}</span>
        </div>
        <div>
          {isStreaming ? (
            <span className="text-indigo-600 flex items-center gap-1.5 font-thai font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              กำลังประมวลผลและเขียนไฟล์...
            </span>
          ) : (
            <span className="text-emerald-700 font-thai font-medium">สร้างสำเร็จ พร้อมใช้งาน</span>
          )}
        </div>
      </div>
    </div>
  );
};

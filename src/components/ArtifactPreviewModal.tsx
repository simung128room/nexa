import React, { useState } from "react";
import DOMPurify from "dompurify";
import { X, RefreshCw, Code, Monitor, Smartphone, ShieldCheck } from "lucide-react";

interface ArtifactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  title?: string;
  language?: string;
}

export const ArtifactPreviewModal: React.FC<ArtifactPreviewModalProps> = ({
  isOpen,
  onClose,
  code,
  title = "Interactive Artifact Preview",
  language = "html",
}) => {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isOpen) return null;

  // Sanitize the HTML/SVG content with DOMPurify to prevent XSS attacks
  const isSvg = language.toLowerCase() === "svg" || code.trim().startsWith("<svg");
  
  const sanitizedContent = isSvg
    ? DOMPurify.sanitize(code, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ["script", "iframe", "object", "embed", "link", "meta"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
      })
    : DOMPurify.sanitize(code, {
        ADD_TAGS: ["style", "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td", "button", "input", "label", "form", "section", "article", "nav", "header", "footer", "main", "img", "svg", "path", "circle", "rect", "line", "polyline", "polygon"],
        ADD_ATTR: ["class", "id", "style", "src", "alt", "href", "target", "rel", "type", "value", "placeholder", "d", "viewBox", "fill", "stroke", "stroke-width", "width", "height"],
        FORBID_TAGS: ["script", "iframe", "object", "embed", "applet", "base", "meta", "link"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onkeydown", "onkeyup", "onkeypress", "onsubmit", "formaction"],
      });

  // Build sandboxed preview document with strict Content-Security-Policy
  const srcDoc = `
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
      background-color: #09090b;
      color: #f4f4f5;
      margin: 0;
      padding: 1.25rem;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${isSvg ? `<div style="display:flex;justify-content:center;align-items:center;min-height:80vh;">${sanitizedContent}</div>` : `<div id="root">${sanitizedContent}</div>`}
</body>
</html>
  `;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300">
              <Code className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 font-sans">{title}</h3>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  <ShieldCheck className="w-3 h-3" /> Sanitized
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">Render Mode: {language.toUpperCase()}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Device Toggle */}
            <div className="flex items-center p-0.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setDeviceMode("desktop")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  deviceMode === "desktop" ? "bg-zinc-800 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  deviceMode === "mobile" ? "bg-zinc-800 text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="p-2 rounded-xl border border-transparent hover:border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Refresh Preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-transparent hover:border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sandbox Content Container */}
        <div className="flex-1 bg-[#09090b] p-4 flex items-center justify-center overflow-auto">
          <div
            className={`h-full transition-all duration-300 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-inner ${
              deviceMode === "mobile" ? "w-[380px] my-auto h-[680px]" : "w-full"
            }`}
          >
            <iframe
              key={refreshKey}
              srcDoc={srcDoc}
              title="Artifact Live Render"
              className="w-full h-full border-0"
              sandbox=""
            />
          </div>
        </div>
      </div>
    </div>
  );
};

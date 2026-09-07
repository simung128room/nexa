import React from "react";
import { motion } from "motion/react";
import { ArtifactItem, ZenThemeConfig } from "../types";
import { zenAudio } from "../utils/zenAudio";

interface ArtifactCardProps {
  artifact: ArtifactItem;
  onOpen: (artifact: ArtifactItem) => void;
  isStreaming?: boolean;
  onDownloadDirect?: (artifact: ArtifactItem) => void;
  theme?: ZenThemeConfig;
}

/**
 * Minimalist Document & Code Glyph matching picture 2
 */
const DocumentGlyph: React.FC<{ className?: string; category?: string }> = ({
  className = "w-4.5 h-4.5",
  category,
}) => {
  if (category === "Web" || category === "Component") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="10 13 8 15 10 17" />
        <polyline points="14 13 16 15 14 17" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2l1.5 2 2-3 1.5 1h1" />
    </svg>
  );
};

export const ArtifactCard: React.FC<ArtifactCardProps> = ({
  artifact,
  onOpen,
  isStreaming = false,
  onDownloadDirect,
  theme,
}) => {
  const isDark = theme?.isDark ?? false;

  const handleCardClick = () => {
    zenAudio.playSoftClick();
    onOpen(artifact);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    zenAudio.playSoftClick();
    if (onDownloadDirect) {
      onDownloadDirect(artifact);
    } else {
      const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = artifact.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // 1. Skeleton Loading State while streaming / writing
  if (isStreaming) {
    return (
      <div
        onClick={handleCardClick}
        className={`my-3 w-full max-w-xl group cursor-pointer select-none rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3.5 text-left transition-all duration-200 border ${
          isDark
            ? "bg-zinc-900/90 border-zinc-800 text-white"
            : "bg-[#f4f4f5] border-zinc-200/90 text-zinc-900"
        }`}
      >
        {/* Left: Stable Icon Box with distinct background */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center border shadow-xs transition-all ${
            isDark
              ? "bg-zinc-800/90 border-zinc-700/80 text-zinc-300"
              : "bg-white border-zinc-200/90 text-zinc-600"
          }`}
        >
          <DocumentGlyph
            category={artifact.category}
            className="w-5 h-5 text-zinc-500"
          />
        </div>

        {/* Middle: Shimmering Title and Subtitle */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {artifact.title ? (
            <div className="flex items-center gap-2">
              <h4
                className={`text-[14px] sm:text-[15px] font-medium font-sans truncate tracking-tight ${
                  isDark ? "text-zinc-200" : "text-zinc-900"
                }`}
              >
                {artifact.title}
              </h4>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0" />
            </div>
          ) : (
            <div
              className={`h-4 rounded-md w-36 animate-pulse ${
                isDark ? "bg-zinc-800" : "bg-zinc-300/80"
              }`}
            />
          )}

          <div className="flex items-center gap-2">
            <span
              className={`text-[12px] font-sans truncate ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              {artifact.subtitle || `${artifact.category} · ${(artifact.extension || "").toUpperCase()}`}
            </span>
            <span
              className={`text-[11px] font-mono ${
                isDark ? "text-zinc-500" : "text-zinc-400"
              }`}
            >
              • กำลังเขียน...
            </span>
          </div>
        </div>

        {/* Right: Skeleton Download Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-xs sm:text-[13px] font-normal transition-all shadow-2xs select-none ${
              isDark
                ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                : "bg-white border-zinc-200/90 text-zinc-400"
            }`}
          >
            Download
          </div>
        </div>
      </div>
    );
  }

  // 2. Ready Minimalist State matching Screenshot 2
  return (
    <div
      onClick={handleCardClick}
      className={`my-3 w-full max-w-xl group cursor-pointer select-none rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3.5 text-left transition-all duration-200 border ${
        isDark
          ? "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-white"
          : "bg-[#f4f4f5] border-zinc-200/90 hover:border-zinc-300 hover:bg-[#ededef] text-zinc-900"
      }`}
    >
      {/* Left: Icon Box + Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Icon Square (White rounded card inside with subtle border matching screenshot 2) */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center border shadow-xs transition-colors ${
            isDark
              ? "bg-zinc-800 border-zinc-700 text-zinc-200 shadow-zinc-950/20"
              : "bg-white border-zinc-200/90 text-zinc-600 shadow-zinc-950/5"
          }`}
        >
          <DocumentGlyph
            category={artifact.category}
            className="w-5 h-5"
          />
        </div>

        {/* Title and Subtitle */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-[14px] sm:text-[15px] font-medium font-sans truncate tracking-tight ${
              isDark ? "text-zinc-100" : "text-zinc-900"
            }`}
          >
            {artifact.title || artifact.filename}
          </h4>
          <p
            className={`text-[12px] font-sans truncate mt-0.5 ${
              isDark ? "text-zinc-400" : "text-zinc-500"
            }`}
          >
            {artifact.subtitle || `${artifact.category} · ${(artifact.extension || "").toUpperCase()}`}
          </p>
        </div>
      </div>

      {/* Right: Clean Download Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDownloadClick}
          title={`ดาวน์โหลด ${artifact.filename}`}
          className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border text-xs sm:text-[13px] font-normal transition-all active:scale-95 cursor-pointer shadow-2xs ${
            isDark
              ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700"
              : "bg-white border-zinc-200/90 text-zinc-800 hover:text-zinc-950 hover:bg-zinc-50"
          }`}
        >
          Download
        </button>
      </div>
    </div>
  );
};

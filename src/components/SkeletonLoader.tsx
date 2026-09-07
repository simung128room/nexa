import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, FileCode, FileText, Image as ImageIcon, File, Brain, Cpu, FileSpreadsheet, Music, Film, Archive, Terminal } from "lucide-react";

/**
 * MessageSkeleton: Displayed when the AI is thinking / waiting for the first streaming chunk.
 */
export const MessageSkeleton: React.FC = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-3xl py-2 space-y-4 select-none"
    >
      {/* Dynamic Thinking Badge */}
      <div className="flex items-center gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-medium shadow-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-3.5 h-3.5 flex items-center justify-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          </motion.div>
          
          <span className="font-thai font-medium flex items-center gap-1 text-zinc-200">
            กำลังคิด
            <span className="inline-flex">
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              >
                .
              </motion.span>
            </span>
          </span>

          <span className="text-[10px] text-zinc-400 font-mono pl-1 border-l border-zinc-700">
            {seconds > 0 ? `${seconds}s` : "กำลังเริ่ม"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Brain className="w-3.5 h-3.5 animate-pulse text-zinc-400" />
          <span className="font-thai text-zinc-400 hidden sm:inline">กำลังประมวลผลและเตรียมคำตอบ</span>
        </div>
      </div>

      {/* Shimmering Response Preview */}
      <div className="space-y-3 pt-1">
        <div className="h-4 bg-zinc-800 rounded-none w-[85%] animate-pulse" />
        <div className="h-4 bg-zinc-800 rounded-none w-[95%] animate-pulse" />
        <div className="h-4 bg-zinc-800 rounded-none w-[68%] animate-pulse" />
      </div>

      {/* Code Block Skeleton */}
      <div className="rounded-none border border-zinc-700 bg-[#0e0e11] p-4 space-y-3 overflow-hidden relative">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-none bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-none bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-none bg-emerald-500/70" />
            <div className="h-3 w-16 bg-zinc-800 rounded-none ml-2 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <Cpu className="w-3 h-3 text-zinc-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span className="font-mono">Generating Output...</span>
          </div>
        </div>
        <div className="space-y-2 pt-1 font-mono text-xs">
          <div className="h-3 bg-zinc-800 rounded-none w-[38%] animate-pulse" />
          <div className="h-3 bg-zinc-800/80 rounded-none w-[72%] pl-4 animate-pulse" />
          <div className="h-3 bg-zinc-800/80 rounded-none w-[58%] pl-4 animate-pulse" />
          <div className="h-3 bg-zinc-800 rounded-none w-[22%] animate-pulse" />
        </div>
      </div>

      {/* Paragraph 2 lines */}
      <div className="space-y-2 pt-1">
        <div className="h-4 bg-zinc-800 rounded-none w-[78%] animate-pulse" />
        <div className="h-4 bg-zinc-800 rounded-none w-[45%] animate-pulse" />
      </div>
    </motion.div>
  );
};

/**
 * FileSkeleton: Shimmer placeholder while a file is being read/parsed in dark theme.
 */
export const FileSkeleton: React.FC<{ name?: string }> = ({ name }) => {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-[#121215] border border-zinc-700 rounded-none animate-pulse min-w-[180px] max-w-xs shadow-none">
      <div className="w-8 h-8 rounded-none bg-zinc-800 flex items-center justify-center shrink-0">
        <File className="w-4 h-4 text-zinc-400 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3 bg-zinc-700 rounded-none w-[75%]" />
        <div className="h-2 bg-zinc-800 rounded-none w-[45%]" />
      </div>
    </div>
  );
};

/**
 * Helper to get icon for file type
 */
export const getFileIcon = (extension: string, type: string) => {
  const ext = (extension || "").toLowerCase();
  const mime = (type || "").toLowerCase();

  // 1. PDF
  if (ext === "pdf" || mime === "application/pdf") {
    return <FileText className="w-4 h-4 text-red-400" />;
  }
  // 2. Images
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "avif"].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-400" />;
  }
  // 3. Audio
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "wma"].includes(ext)) {
    return <Music className="w-4 h-4 text-amber-400" />;
  }
  // 4. Video
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv", "avi"].includes(ext)) {
    return <Film className="w-4 h-4 text-violet-400" />;
  }
  // 5. Spreadsheets / Tabular Data
  if (["csv", "tsv", "xlsx", "xls", "ods"].includes(ext) || mime.includes("spreadsheet") || mime.includes("csv")) {
    return <FileSpreadsheet className="w-4 h-4 text-teal-400" />;
  }
  // 6. Archives
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext) || mime.includes("zip") || mime.includes("compressed")) {
    return <Archive className="w-4 h-4 text-orange-400" />;
  }
  // 7. Shell / Scripts / Command files
  if (["sh", "bash", "zsh", "ps1", "bat", "cmd"].includes(ext)) {
    return <Terminal className="w-4 h-4 text-amber-300" />;
  }
  // 8. Programming code & configs
  if (
    ["js", "ts", "tsx", "jsx", "py", "html", "css", "scss", "json", "sql", "rs", "go", "cpp", "c", "h", "java", "php", "yaml", "yml", "xml", "kt", "swift", "rb", "r", "dart", "lua", "toml", "ini", "dockerfile"].includes(ext)
  ) {
    return <FileCode className="w-4 h-4 text-cyan-400" />;
  }
  // 9. Document & text
  if (["txt", "md", "log", "doc", "docx", "rtf", "odt", "tex"].includes(ext) || mime.startsWith("text/")) {
    return <FileText className="w-4 h-4 text-sky-400" />;
  }
  return <File className="w-4 h-4 text-zinc-300" />;
};

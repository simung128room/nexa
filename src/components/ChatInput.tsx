import React, { useState, useRef, useEffect } from "react";
import { 
  Plus,
  Camera,
  Image as ImageIcon,
  Paperclip,
  Brain,
  ArrowUp, 
  Square, 
  X,
  UploadCloud,
  Check,
  AlertTriangle, Globe
} from "lucide-react";
import { FileAttachment, ZenThemeConfig } from "../types";
import { JOM_MODELS } from "../data/presets";
import { zenAudio } from "../utils/zenAudio";
import { motion, AnimatePresence } from "motion/react";
import { FileSkeleton, getFileIcon } from "./SkeletonLoader";
import { VoiceInputButton } from "./VoiceInputButton";

interface ChatInputProps {
  onSendMessage: (text: string, attachments?: FileAttachment[]) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  theme?: ZenThemeConfig;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onClearChat?: () => void;
  isHeroMode?: boolean;
  currentModelId?: string;
  onSelectModel?: (modelId: string) => void;
}

const TYPEWRITER_SUGGESTIONS = [
  "Design a multi-step agent workflow with tool calls...",
  "พิมพ์คำถาม ปรึกษาไอเดีย หรือสั่งเขียนโค้ด...",
  "เขียนโค้ด React + Tailwind หรือช่วยแก้บั๊ก...",
  "Analyze this codebase and outline an architecture...",
  "สรุปเนื้อหาจากเอกสารและจัดโครงสร้างข้อมูล...",
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  isHeroMode = false,
  currentModelId = "JOM-AGENT",
  onSelectModel,
}) => {
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<{ id: string; name: string }[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [fileErrorWarning, setFileErrorWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  const currentModel = JOM_MODELS.find(m => m.id === currentModelId) || JOM_MODELS[0];

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(event.target as Node)
      ) {
        setIsPlusMenuOpen(false);
      }
    };

    if (isPlusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPlusMenuOpen]);

  // Typewriter effect in pure Thai
  useEffect(() => {
    if (input) return;
    const currentFullText = TYPEWRITER_SUGGESTIONS[placeholderIndex];
    const typingSpeed = isDeleting ? 30 : 65;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length + 1));
        if (placeholderText.length + 1 >= currentFullText.length) {
          setTimeout(() => setIsDeleting(true), 2800);
        }
      } else {
        setPlaceholderText(currentFullText.substring(0, placeholderText.length - 1));
        if (placeholderText.length <= 0) {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % TYPEWRITER_SUGGESTIONS.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, placeholderIndex, input]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    zenAudio.playSoftClick();

    let finalText = input.trim();
    if (isDeepThinking) {
      finalText = `[โหมด: คิดให้รอบคอบขึ้น (Deep Reasoning)]\n${finalText}`;
    }
    if (isWebSearch) {
      finalText = `[โหมด: ค้นหาเว็บ (Web Search)]\n${finalText}`;
    }

    onSendMessage(finalText, attachments);
    setInput("");
    setAttachments([]);
    setIsPlusMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFiles(e.clipboardData.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Universal File Processor with size & count safety limits
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    zenAudio.playSoftClick();
    setFileErrorWarning(null);

    // Max 5 attachments total
    const remainingSlots = 5 - attachments.length;
    if (remainingSlots <= 0) {
      setFileErrorWarning("แนบไฟล์ได้สูงสุด 5 ไฟล์ต่อหนึ่งข้อความ");
      return;
    }

    const filesToProcess = fileArray.slice(0, remainingSlots);
    if (fileArray.length > remainingSlots) {
      setFileErrorWarning(`จำกัดแนบไฟล์สูงสุด 5 ไฟล์ (ข้าม ${fileArray.length - remainingSlots} ไฟล์ที่เกิน)`);
    }

    const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB per file

    filesToProcess.forEach((file) => {
      const rawExt = file.name.split(".").pop() || "";
      const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
      const mime = (file.type || "").toLowerCase();

      // Validate file size (up to 8MB)
      if (file.size > MAX_FILE_BYTES) {
        setFileErrorWarning(`ไฟล์ "${file.name}" มีขนาดเกิน 8 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
        return;
      }

      const tempId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const safeName = file.name.replace(/[^\w\s.-]/g, "_").slice(0, 100);

      // Show skeleton loading state
      setLoadingFiles((prev) => [...prev, { id: tempId, name: safeName }]);

      const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "avif"].includes(ext);
      const isPdf = mime === "application/pdf" || ext === "pdf";
      const isAudio = mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm", "wma"].includes(ext);
      const isVideo = mime.startsWith("video/") || ["mp4", "mov", "mkv"].includes(ext);
      const isKnownText =
        mime.startsWith("text/") ||
        mime.includes("json") ||
        mime.includes("xml") ||
        mime.includes("yaml") ||
        mime.includes("csv") ||
        [
          "txt", "md", "csv", "tsv", "json", "js", "ts", "tsx", "jsx", "py", "html", "css",
          "scss", "sass", "less", "sql", "rs", "go", "cpp", "c", "h", "hpp", "java", "php",
          "sh", "bash", "zsh", "ps1", "bat", "cmd", "yaml", "yml", "xml", "log", "env",
          "toml", "ini", "rb", "swift", "kt", "r", "dart", "lua", "dockerfile", "makefile",
          "graphql", "proto", "prisma", "asm", "tex", "rst", "conf", "cfg", "patch", "diff",
          "properties", "v", "sv", "sol"
        ].includes(ext);

      if (isImage || isPdf || isAudio || isVideo) {
        // Read as Data URL for multimedia and PDF
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = (event.target?.result as string) || "";
          setAttachments((prev) => [
            ...prev,
            {
              id: tempId,
              name: safeName,
              size: file.size,
              type: file.type || (isPdf ? "application/pdf" : isImage ? "image/jpeg" : isAudio ? "audio/mpeg" : "video/mp4"),
              extension: ext,
              dataUrl: dataUrl,
              isImage: isImage,
              isPdf: isPdf,
              isAudio: isAudio,
              isVideo: isVideo,
              isText: false,
            },
          ]);
          setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        };
        reader.onerror = () => {
          setFileErrorWarning(`ไม่สามารถอ่านไฟล์ "${safeName}" ได้`);
          setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        };
        reader.readAsDataURL(file);
      } else if (isKnownText) {
        // Read as text
        const reader = new FileReader();
        reader.onload = (event) => {
          const textContent = (event.target?.result as string) || "";
          setAttachments((prev) => [
            ...prev,
            {
              id: tempId,
              name: safeName,
              size: file.size,
              type: file.type || "text/plain",
              extension: ext,
              content: textContent.slice(0, 100000),
              isImage: false,
              isText: true,
            },
          ]);
          setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        };
        reader.onerror = () => {
          setFileErrorWarning(`ไม่สามารถอ่านไฟล์ข้อความ "${safeName}" ได้`);
          setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        };
        reader.readAsText(file);
      } else {
        // Universal fallback for any document, archive, or unknown binary file:
        // Try reading as text first; if it has text content, send text. Otherwise attach dataUrl and metadata!
        const textReader = new FileReader();
        textReader.onload = (textEvent) => {
          const rawText = (textEvent.target?.result as string) || "";
          // Check if largely text (less than 2% null bytes)
          const nullCount = (rawText.slice(0, 1000).match(/\x00/g) || []).length;
          if (nullCount < 3 && rawText.length > 0) {
            setAttachments((prev) => [
              ...prev,
              {
                id: tempId,
                name: safeName,
                size: file.size,
                type: file.type || "text/plain",
                extension: ext,
                content: rawText.slice(0, 100000),
                isImage: false,
                isText: true,
              },
            ]);
            setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
          } else {
            // Binary format (e.g. .docx, .xlsx, .zip, .bin, .dat)
            const binaryReader = new FileReader();
            binaryReader.onload = (binEvent) => {
              const dataUrl = (binEvent.target?.result as string) || "";
              setAttachments((prev) => [
                ...prev,
                {
                  id: tempId,
                  name: safeName,
                  size: file.size,
                  type: file.type || "application/octet-stream",
                  extension: ext,
                  dataUrl: dataUrl,
                  content: `[ไฟล์ ${safeName} ประเภท ${file.type || ext} ขนาด ${file.size} bytes]`,
                  isImage: false,
                  isText: false,
                },
              ]);
              setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
            };
            binaryReader.readAsDataURL(file);
          }
        };
        textReader.onerror = () => {
          setFileErrorWarning(`ไม่สามารถประมวลผลไฟล์ "${safeName}" ได้`);
          setLoadingFiles((prev) => prev.filter((f) => f.id !== tempId));
        };
        textReader.readAsText(file);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    zenAudio.playSoftClick();
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const hasTextOrFiles = Boolean(input.trim() || attachments.length > 0);

  return (
    <div
      className="w-full relative transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Inputs for Camera, Image Gallery, and Documents */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
      />
      <input
        ref={cameraInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
        capture="environment"
      />

      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-50 bg-indigo-950/20 backdrop-blur-xs border-2 border-dashed border-indigo-400 rounded-3xl flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-2xl text-sm font-bold text-zinc-950">
              <UploadCloud className="w-5 h-5 animate-bounce text-indigo-600" />
              <span>วางไฟล์ที่นี่เพื่ออัปโหลด</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Size / Count Safety Warning Banner */}
      <AnimatePresence>
        {fileErrorWarning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-thai shadow-xs"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{fileErrorWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileErrorWarning(null)}
              className="p-1 hover:bg-amber-100 rounded-full text-amber-700 transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments & Skeleton Loaders Row */}
      {(attachments.length > 0 || loadingFiles.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-2 px-1 max-h-36 overflow-y-auto">
          {loadingFiles.map((f) => (
            <FileSkeleton key={f.id} name={f.name} />
          ))}

          {attachments.map((att) => (
            <motion.div
              key={att.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-zinc-200/90 rounded-xl shadow-2xs group text-xs text-zinc-900 transition-all"
            >
              {att.isImage && att.dataUrl ? (
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="w-7 h-7 rounded-lg object-cover border border-zinc-200"
                />
              ) : (
                <div className="p-1 rounded-lg bg-indigo-50 border border-indigo-100 shrink-0 text-indigo-600">
                  {getFileIcon(att.extension, att.type)}
                </div>
              )}

              <div className="max-w-[120px] sm:max-w-[140px] truncate">
                <p className="font-medium text-zinc-900 truncate" title={att.name}>
                  {att.name}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {formatFileSize(att.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
                title="ลบไฟล์"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Active Feature Pills (Deep Thinking, Web Search) */}
      {(isDeepThinking || isWebSearch) && (
        <div className="flex items-center gap-2 mb-2 px-3">
          {isDeepThinking && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-thai font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>คิดให้รอบคอบขึ้น</span>
              <button
                type="button"
                onClick={() => setIsDeepThinking(false)}
                className="hover:text-indigo-900 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {isWebSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-thai font-medium bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>ค้นหาเว็บ</span>
              <button
                type="button"
                onClick={() => setIsWebSearch(false)}
                className="hover:text-blue-900 cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Pop-up Menu matching Screenshot (Paperclip attachment trigger) */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+8px)] left-2 z-50 w-60 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-1.5 shadow-xl font-thai text-left"
          >
            <div className="flex flex-col gap-0.5">
              {/* 1. กล้อง */}
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  cameraInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-zinc-100 active:bg-zinc-200/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 transition-colors group-hover:bg-white">
                  <Camera className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-[14px] font-thai font-medium text-zinc-900 tracking-tight">
                  กล้อง
                </span>
              </button>

              {/* 2. รูปภาพ */}
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  imageInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-zinc-100 active:bg-zinc-200/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 transition-colors group-hover:bg-white">
                  <ImageIcon className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-[14px] font-thai font-medium text-zinc-900 tracking-tight">
                  รูปภาพ
                </span>
              </button>

              {/* 3. ไฟล์ */}
              <button
                type="button"
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-zinc-100 active:bg-zinc-200/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 transition-colors group-hover:bg-white">
                  <Paperclip className="w-4 h-4 -rotate-45 stroke-[1.8]" />
                </div>
                <span className="text-[14px] font-thai font-medium text-zinc-900 tracking-tight">
                  ไฟล์
                </span>
              </button>

              <div className="my-1 border-t border-zinc-100" />

              {/* 4. คิดให้รอบคอบขึ้น */}
              <button
                type="button"
                onClick={() => {
                  setIsDeepThinking(!isDeepThinking);
                  setIsPlusMenuOpen(false);
                  zenAudio.playSoftClick();
                }}
                className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-zinc-100 active:bg-zinc-200/70 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border ${
                      isDeepThinking
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-zinc-100 border-zinc-200 text-zinc-700 group-hover:bg-white"
                    }`}
                  >
                    <Brain className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[14px] font-thai font-medium text-zinc-900 tracking-tight">
                    คิดให้รอบคอบขึ้น
                  </span>
                </div>
                {isDeepThinking && (
                  <Check className="w-4 h-4 text-indigo-600 mr-1" />
                )}
              </button>

              {/* 5. ค้นหาเว็บ */}
              <button
                type="button"
                onClick={() => {
                  setIsWebSearch(!isWebSearch);
                  setIsPlusMenuOpen(false);
                  zenAudio.playSoftClick();
                }}
                className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-zinc-100 active:bg-zinc-200/70 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border ${
                      isWebSearch
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-zinc-100 border-zinc-200 text-zinc-700 group-hover:bg-white"
                    }`}
                  >
                    <Globe className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <span className="text-[14px] font-thai font-medium text-zinc-900 tracking-tight">
                    ค้นหาเว็บ
                  </span>
                </div>
                {isWebSearch && (
                  <Check className="w-4 h-4 text-blue-600 mr-1" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Capsule / Pill Input Container (Exact Match to Screenshot) */}
      <motion.div
        layout
        transition={{ duration: 0.15 }}
        className={`relative flex items-center bg-[#f4f4f5] focus-within:bg-white border border-zinc-200/90 focus-within:border-zinc-300 rounded-full px-2.5 sm:px-3 py-1 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.05)] ${
          isHeroMode ? "min-h-[44px] sm:min-h-[46px]" : "min-h-[40px] sm:min-h-[42px]"
        }`}
      >
        {/* Left: Paperclip Button */}
        <div className="flex items-center shrink-0">
          <button
            ref={plusButtonRef}
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(!isPlusMenuOpen);
              zenAudio.playSoftClick();
            }}
            title="แนบไฟล์ หรือเลือกความสามารถเสริม"
            className={`w-7 h-7 rounded-full transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center ${
              isPlusMenuOpen || isDeepThinking || isWebSearch
                ? "bg-indigo-50 text-indigo-600"
                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
            }`}
          >
            <Paperclip className="w-4 h-4 -rotate-45 stroke-[1.8]" />
          </button>
        </div>

        {/* Center: Input / Textarea */}
        <div className="relative flex-1 flex items-center min-w-0 mx-1.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isHeroMode ? (placeholderText || "Design a multi-step agent workflow with tool calls...") : "พิมพ์ข้อความ หรือถามคำถาม..."}
            rows={1}
            className="font-thai w-full bg-transparent text-[14px] sm:text-[14.5px] text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed py-0.5 px-1 font-normal"
            style={{ minHeight: "22px", maxHeight: "120px" }}
          />
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-0.5">
          <VoiceInputButton
            onTranscript={(speechText) => {
              setInput((prev) => (prev ? `${prev} ${speechText}` : speechText));
              zenAudio.playSoftClick();
            }}
          />

          {isStreaming ? (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              type="button"
              onClick={onStopStreaming}
              title="หยุดการสร้างคำตอบ"
              className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-black active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <Square className="w-3 h-3 fill-white text-white" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!hasTextOrFiles}
              title="ส่งข้อความ"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                hasTextOrFiles
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer active:scale-95 shadow-sm"
                  : "bg-zinc-200/90 text-zinc-400 cursor-default"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.3]" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Disclaimer in Thai */}
      <div className="text-center mt-2 mb-0.5">
        <p className="font-thai text-[11px] text-zinc-400 font-normal">
          NEXA อาจแสดงข้อมูลคลาดเคลื่อนได้ กรุณาตรวจสอบข้อมูลสำคัญ
        </p>
      </div>
    </div>
  );
};

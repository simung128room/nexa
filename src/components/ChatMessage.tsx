import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Message, ZenThemeConfig, ArtifactItem } from "../types";
import { CodeBlock } from "./CodeBlock";
import { ArtifactCard } from "./ArtifactCard";
import { extractArtifactMeta } from "../utils/artifactParser";
import { ClaudeQuestionSheet, QuestionData } from "./ClaudeQuestionSheet";
import { 
  Copy, 
  Check, 
  RotateCcw, 
  Edit3, 
  ThumbsUp, 
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Globe,
  ExternalLink,
  X,
  Lightbulb
} from "lucide-react";
import { zenAudio } from "../utils/zenAudio";
import { motion } from "motion/react";
import { getFileIcon } from "./SkeletonLoader";

interface ChatMessageProps {
  message: Message;
  theme?: ZenThemeConfig;
  onSendToChat?: (prompt: string) => void;
  onSendToScratchpad?: (code: string, lang: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEditAndResend?: (content: string, messageId?: string) => void;
  onOpenArtifact?: (artifact: ArtifactItem) => void;
}

// Dynamic Thinking Counter Component
const ThinkingTimer: React.FC<{ startTimestamp?: number }> = ({ startTimestamp }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startTime = startTimestamp || Date.now();
    const calculateDiff = () => Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    
    setSeconds(calculateDiff());

    const interval = setInterval(() => {
      setSeconds(calculateDiff());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimestamp]);

  return (
    <div className="py-2 select-none">
      <span className="text-zinc-600 font-medium text-[15px] tracking-wide animate-pulse font-sans">
        {seconds > 4 ? `Thinking for ${seconds}s...` : "Thinking..."}
      </span>
    </div>
  );
};

// Lightweight Inline Thought Process Accordion (No Bottom Sheet / No Modal)
const ThoughtProcessModal: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content || !content.trim()) return null;

  // Split content into points / steps
  const rawLines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const steps = rawLines.map(line => line.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean);

  const displaySteps = steps.length > 0 ? steps : [content.trim()];
  const latestStep = displaySteps[displaySteps.length - 1];

  return (
    <div className="mb-3">
      {/* Inline Thought Process Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900 transition-colors select-none cursor-pointer py-1.5 px-3 rounded-full bg-zinc-100/80 hover:bg-zinc-200/70 border border-zinc-200/80"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 group-hover:bg-zinc-800 transition-colors shrink-0" />
        <span className="font-thai truncate max-w-sm sm:max-w-md font-medium text-zinc-700">
          {displaySteps.length > 1 ? latestStep : "Thought process"}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {/* Inline Expandable View */}
      {isOpen && (
        <div className="mt-2 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2 text-xs text-zinc-800 font-thai shadow-2xs">
          {displaySteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
              <p className="leading-relaxed text-zinc-800">{step}</p>
            </div>
          ))}

          {isStreaming && (
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse mt-1.5 shrink-0" />
              <p className="text-zinc-500 italic">Thinking...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper to extract <thinking> tags and question data (Claude style)
export interface ParsedMessageData {
  thinking: string;
  main: string;
  questionData: QuestionData | null;
}

export const extractThinkingMainAndQuestion = (content: string): ParsedMessageData => {
  let thinking = "";
  let main = content || "";

  // 1. Extract <thinking> tags
  if (main.includes("<thinking>")) {
    const parts = main.split("<thinking>");
    const afterThinking = parts[1] || "";
    if (afterThinking.includes("</thinking>")) {
      const thinkingParts = afterThinking.split("</thinking>");
      thinking = thinkingParts[0].trim();
      main = (parts[0] + thinkingParts.slice(1).join("</thinking>")).trim();
    } else {
      // Still streaming inside thinking tag
      thinking = afterThinking.trim();
      main = parts[0].trim();
    }
  }

  let questionData: QuestionData | null = null;

  // 2. Extract explicit <question title="..."> <option>...</option> </question>
  const questionTagRegex = /<question(?:\s+title=(?:["']([^"']*)["']|([^>\s]+)))?\s*>([\s\S]*?)<\/question>/i;
  const qMatch = questionTagRegex.exec(main);
  if (qMatch) {
    const title = (qMatch[1] || qMatch[2] || "").trim() || "เลือกขั้นตอนถัดไป";
    const inner = qMatch[3];
    const optionRegex = /<option>([\s\S]*?)<\/option>/gi;
    const options: string[] = [];
    let optMatch;
    while ((optMatch = optionRegex.exec(inner)) !== null) {
      const text = optMatch[1].trim();
      if (text) options.push(text);
    }
    if (options.length > 0) {
      questionData = { title, options };
      main = main.replace(questionTagRegex, "").trim();
    }
  } else if (main.includes("<question")) {
    // If stream is in progress or unclosed question tag, hide it from visible markdown until closed
    const qIdx = main.indexOf("<question");
    main = main.slice(0, qIdx).trim();
  }

  return { thinking, main, questionData };
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme,
  onSendToChat,
  onSendToScratchpad,
  onRegenerate,
  onEditAndResend,
  onOpenArtifact,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [liked, setLiked] = useState<boolean | null>(null);

  const isAssistant = message.role === "assistant";
  const isThinking = isAssistant && (!message.content || message.content.trim() === "");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    zenAudio.playCopyChime();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEditAndResend) {
      onEditAndResend(editContent.trim(), message.id);
      setIsEditing(false);
    }
  };

  // 1. Assistant Message
  if (isAssistant) {
    const { thinking, main, questionData } = extractThinkingMainAndQuestion(message.content);

    return (
      <motion.div
        id={`msg-${message.id}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex w-full justify-start items-start my-5 group"
      >
        <div className="flex-1 max-w-3xl min-w-0">
          {/* Thought Process Modal Trigger if CoT present */}
          {thinking && <ThoughtProcessModal content={thinking} isStreaming={isThinking} />}

          {/* Thinking State */}
          {isThinking ? (
            <ThinkingTimer startTimestamp={message.timestamp} />
          ) : (
            <div className="text-[16px] leading-[1.8] text-zinc-900 font-normal">
              <ReactMarkdown
                components={{
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (match) {
                      const lines = codeString.split("\n");
                      const isOver15Lines = lines.length > 15;

                      // If over 15 lines, render as Claude-style Artifact Card with live view capability
                      if (isOver15Lines && onOpenArtifact) {
                        const artifactMeta = extractArtifactMeta(codeString, match[1]);
                        const artifact: ArtifactItem = {
                          id: `artifact-${message.id}-${artifactMeta.filename}`,
                          messageId: message.id,
                          title: artifactMeta.title,
                          filename: artifactMeta.filename,
                          language: match[1],
                          extension: artifactMeta.extension,
                          category: artifactMeta.category,
                          subtitle: artifactMeta.subtitle,
                          content: codeString,
                          lineCount: lines.length,
                          isStreaming: message.isStreaming,
                        };

                        return (
                          <ArtifactCard
                            artifact={artifact}
                            onOpen={onOpenArtifact}
                            isStreaming={message.isStreaming}
                            theme={theme}
                          />
                        );
                      }

                      return (
                        <CodeBlock
                          language={match[1]}
                          value={codeString}
                          onSendToChat={onSendToChat}
                          onSendToScratchpad={onSendToScratchpad}
                        />
                      );
                    }

                    return (
                      <code
                        className="bg-zinc-100 px-2 py-0.5 rounded-md text-[13.5px] font-mono text-indigo-700 border border-zinc-200/80"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="font-thai mb-4 leading-[1.8] last:mb-0 text-zinc-900 font-normal text-[15.5px] sm:text-[16px]">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="font-thai list-disc pl-5 mb-4 space-y-2 text-zinc-900 text-[15.5px] sm:text-[16px]">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="font-thai list-decimal pl-5 mb-4 space-y-2 text-zinc-900 text-[15.5px] sm:text-[16px]">{children}</ol>;
                  },
                  li({ children }) {
                    return (
                      <li className="font-thai leading-[1.8] text-zinc-900">
                        {children}
                      </li>
                    );
                  },
                  a({ href, children }: any) {
                    if (href?.startsWith("#prompt=")) {
                      return null;
                    }
                    if (href === "#send" && onSendToChat) {
                      const promptText = typeof children === "string" ? children : String(children);
                      return (
                        <button
                          type="button"
                          onClick={() => onSendToChat(promptText)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 transition-all text-sm font-medium cursor-pointer active:scale-95"
                        >
                          <span>{children}</span>
                          <span className="text-xs text-indigo-600">↵</span>
                        </button>
                      );
                    }
                    // Validate href against javascript:, data:, and malicious protocol handlers
                    const isSafeLink = typeof href === "string" && /^(https?:\/\/|mailto:|\/|#)/i.test(href);
                    if (!isSafeLink) {
                      return <span className="text-zinc-500 font-mono text-sm">{children}</span>;
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline underline-offset-4 decoration-indigo-300 font-medium"
                      >
                        {children}
                      </a>
                    );
                  },
                  img({ src, alt }: any) {
                    const isSafeImg = typeof src === "string" && /^(https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(src);
                    if (!isSafeImg) return null;
                    return (
                      <img
                        src={src}
                        alt={alt || "Image"}
                        loading="lazy"
                        className="rounded-2xl max-w-full my-3 border border-zinc-200 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    );
                  },
                  h1({ children }) {
                    return <h1 className="font-prompt text-[24px] sm:text-[26px] font-bold text-zinc-950 mt-6 mb-3 tracking-tight">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="font-prompt text-[20px] sm:text-[21px] font-bold text-zinc-950 mt-5 mb-2.5 tracking-tight">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="font-prompt text-[17px] sm:text-[18px] font-semibold text-zinc-950 mt-4 mb-2 tracking-tight">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="font-thai border-l-4 border-zinc-300 pl-4 my-3 italic text-zinc-800 bg-zinc-50/70 py-2.5 rounded-r-xl border-y border-r border-zinc-200/60">
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-4 py-2.5 bg-zinc-50 font-semibold text-zinc-950 text-left border-b border-zinc-200">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-4 py-2.5 border-t border-zinc-100 text-zinc-800">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {main}
              </ReactMarkdown>
            </div>
          )}

          {/* Follow-up Choice Chips */}
          {!isThinking && !message.isStreaming && questionData && questionData.options && questionData.options.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-zinc-200/80 flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-zinc-600 font-thai flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                <span>{questionData.title || "เลือกขั้นตอนถัดไป:"}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {questionData.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => onSendToChat && onSendToChat(opt)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-xs sm:text-[13.5px] text-zinc-800 hover:text-zinc-950 transition-all cursor-pointer active:scale-95 text-left font-thai group shadow-2xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-zinc-100 group-hover:bg-zinc-800 text-[10px] flex items-center justify-center text-zinc-600 group-hover:text-white font-mono shrink-0 transition-colors">
                      {optIdx + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Google Search Grounding Sources */}
          {message.searchSources && message.searchSources.length > 0 && (
            <div className="mt-3.5 p-3.5 bg-zinc-50 border border-zinc-200/90 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-800 font-semibold">
                <Globe className="w-3.5 h-3.5 text-zinc-700" />
                <span>Google Search Sources ({message.searchSources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {message.searchSources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-[11.5px] text-zinc-800 hover:text-zinc-950 transition-colors shadow-2xs"
                  >
                    <span className="truncate max-w-[180px]">{src.title || src.url}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Assistant Actions Bar */}
          {!isThinking && message.content && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 mt-3 pt-1 text-zinc-400 text-xs"
            >
              {/* Copy */}
              <button
                onClick={handleCopy}
                title="คัดลอกข้อความ"
                className="p-1.5 rounded-full border border-transparent hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Thumbs Up */}
              <button
                onClick={() => {
                  setLiked(liked === true ? null : true);
                  zenAudio.playSoftClick();
                }}
                title="คำตอบมีประโยชน์"
                className={`p-1.5 rounded-full border border-transparent transition-colors cursor-pointer ${
                  liked === true ? "text-zinc-900 bg-zinc-100 border-zinc-300" : "hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              {/* Thumbs Down */}
              <button
                onClick={() => {
                  setLiked(liked === false ? null : false);
                  zenAudio.playSoftClick();
                }}
                title="คำตอบยังไม่ดีพอ"
                className={`p-1.5 rounded-full border border-transparent transition-colors cursor-pointer ${
                  liked === false ? "text-red-600 bg-red-50 border-red-200" : "hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              {/* Regenerate */}
              {onRegenerate && !message.isStreaming && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  title="สร้างคำตอบใหม่"
                  className="p-1.5 rounded-full border border-transparent hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // 2. User Message: Balanced Modern Bubble
  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex w-full justify-end items-start my-4 group"
    >
      <div className="flex flex-col items-end max-w-xl">
        {/* Attached Files */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5 justify-end">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2.5 px-3 py-2 bg-white border border-zinc-200/90 rounded-xl shadow-2xs text-xs text-zinc-900"
              >
                {att.isImage && att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-8 h-8 rounded-lg object-cover border border-zinc-200"
                  />
                ) : (
                  <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                    {getFileIcon(att.extension, att.type)}
                  </div>
                )}
                <div className="max-w-[150px] truncate text-left">
                  <p className="font-medium truncate text-zinc-900" title={att.name}>
                    {att.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {formatFileSize(att.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Capsule Bubble or Edit Box Container */}
        {isEditing ? (
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-4 shadow-xl text-zinc-950">
            <div className="flex items-start justify-between gap-2 mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                autoFocus
                className="font-thai w-full bg-transparent text-[15px] sm:text-[16px] text-zinc-950 focus:outline-none resize-none leading-relaxed placeholder:text-zinc-400"
              />
              <div className="p-1.5 rounded-full bg-zinc-100 text-zinc-600 shrink-0">
                <Edit3 className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="font-inter px-3 py-1.5 text-sm text-zinc-600 hover:text-black transition-colors cursor-pointer rounded-full"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="font-inter px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
              >
                บันทึก & ส่งใหม่
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group/bubble flex items-center justify-end w-fit">
            <div className="w-fit max-w-full px-5 py-2.5 sm:px-5.5 sm:py-3 bg-zinc-100 border border-zinc-200/80 text-zinc-900 rounded-2xl sm:rounded-[20px] text-[15px] sm:text-[15.5px] font-normal leading-relaxed transition-all shadow-2xs flex items-center gap-2">
              <div className="font-thai text-zinc-900 flex items-center justify-between gap-3 w-fit">
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
                {onEditAndResend && (
                  <button
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(true);
                    }}
                    title="แก้ไขข้อความ"
                    className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-800 cursor-pointer shrink-0 -mr-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Copy button below */}
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            title="คัดลอก"
            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

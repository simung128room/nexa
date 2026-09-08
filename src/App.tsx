import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChatSession, Message, ZenThemeId, FileAttachment, ArtifactItem } from "./types";
import { ZEN_THEMES } from "./data/presets";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage, extractThinkingMainAndQuestion } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { ClaudeQuestionSheet } from "./components/ClaudeQuestionSheet";
import { SettingsModal } from "./components/SettingsModal";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { extractCodeBlocksFromMarkdown } from "./utils/artifactParser";
import { zenAudio } from "./utils/zenAudio";
import { ArrowDown, ShieldCheck } from "lucide-react";
import { DynamicGreeting } from "./components/DynamicGreeting";
import { DiscordPromoPopup } from "./components/DiscordPromoPopup";
import { AnimatedMenuButton } from "./components/AnimatedMenuButton";
import { CloudflareTurnstile } from "./components/CloudflareTurnstile";
import { initApiSession, authFetch } from "./utils/apiClient";

const STORAGE_KEY_SESSIONS = "opencode_zen_sessions_v2";
const STORAGE_KEY_THEME = "opencode_zen_theme_v2";
const STORAGE_KEY_ACTIVE_ID = "opencode_zen_active_id_v2";

const DEFAULT_SESSION: ChatSession = {
  id: "session-initial",
  title: "บทสนทนาใหม่",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
  model: "NEXA",
  temperature: 0.7,
  scratchpadCode: `// กระดานทดลองโค้ด - ทดสอบโค้ดของคุณที่นี่\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n\nconsole.log(add(10, 25));`,
  scratchpadLang: "typescript",
};

export default function App() {
  // Theme State
  const [themeId, setThemeId] = useState<ZenThemeId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as ZenThemeId;
      if (saved && ZEN_THEMES[saved]) return saved;
    }
    return "geometric-balance";
  });

  // Sessions State (Default to NEXA Super-Intelligence)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((s: ChatSession) => ({
              ...s,
              model: s.model?.includes("Z") || s.model?.includes("z") || s.model?.includes("JOM") || !s.model ? "NEXA" : s.model,
            }));
          }
        }
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }
    return [DEFAULT_SESSION];
  });

  // Active Session Id
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (savedId) return savedId;
    }
    return DEFAULT_SESSION.id;
  });

  // UI Panels State (Sidebar open by default on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active Artifact Split-view Panel State (Claude Artifacts)
  const [activeArtifact, setActiveArtifact] = useState<ArtifactItem | null>(null);
  const [isArtifactFullscreen, setIsArtifactFullscreen] = useState(false);
  const [isTurnstileModalOpen, setIsTurnstileModalOpen] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentTheme = ZEN_THEMES[themeId] || ZEN_THEMES["geometric-balance"];

  // Active session helper
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSION;

  // Active question extracted from the latest assistant message (Claude style)
  const latestMessage = activeSession.messages[activeSession.messages.length - 1];
  const latestParsed =
    latestMessage?.role === "assistant" && !isStreaming
      ? extractThinkingMainAndQuestion(latestMessage.content)
      : null;
  const activeQuestion =
    latestMessage && !dismissedQuestionIds.has(latestMessage.id)
      ? latestParsed?.questionData
      : null;

  // Save to localStorage with quota protection & session pruning to prevent storage DoS
  useEffect(() => {
    try {
      // Keep max 30 sessions and cap stored messages to prevent QuotaExceededError
      const prunedSessions = sessions.slice(0, 30).map((s) => ({
        ...s,
        messages: s.messages.slice(-50), // Keep latest 50 messages per session
      }));
      const serialized = JSON.stringify(prunedSessions);

      // If payload exceeds 3MB, prune heavy image base64 attachments from saved storage
      if (serialized.length > 3 * 1024 * 1024) {
        const leanSessions = prunedSessions.slice(0, 15).map((s) => ({
          ...s,
          messages: s.messages.slice(-25).map((m) => ({
            ...m,
            attachments: m.attachments?.map((a) => ({ ...a, dataUrl: undefined })),
          })),
        }));
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(leanSessions));
      } else {
        localStorage.setItem(STORAGE_KEY_SESSIONS, serialized);
      }
    } catch (e) {
      console.warn("LocalStorage quota protected or storage restricted:", e);
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeSessionId);
  }, [activeSessionId]);

  // Scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeSessionId, activeSession?.messages?.length]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N for new chat
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handleNewSession();
      }
      // Alt+S for Scratchpad
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setIsScratchpadOpen((prev) => !prev);
      }
      // Alt+F for Focus Mode
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions]);

  // Initialize Server Session on mount to secure API
  useEffect(() => {
    initApiSession().catch(console.error);
  }, []);

  // Send message to Gemini / Model
  const handleSendMessage = async (
    text: string, 
    attachments?: FileAttachment[], 
    overrideBaseMessages?: Message[]
  ) => {
    const cleanText = text.trim();
    if (!cleanText && (!attachments || attachments.length === 0)) return;
    if (isStreaming) return;

    // Format message prompt including any file content
    let apiPrompt = cleanText;
    if (attachments && attachments.length > 0) {
      const attachmentsContext = attachments
        .map((a) => {
          if (a.isText && a.content) {
            return `[ไฟล์แนบ: ${a.name}]\n\`\`\`${a.extension || ""}\n${a.content}\n\`\`\``;
          }
          return `[ไฟล์แนบ: ${a.name} (${(a.size / 1024).toFixed(1)} KB, ประเภท: ${a.type})]`;
        })
        .join("\n\n");

      if (cleanText) {
        apiPrompt = `${cleanText}\n\n${attachmentsContext}`;
      } else {
        apiPrompt = `ช่วยวิเคราะห์และให้คำแนะนำเกี่ยวกับไฟล์ที่แนบมานี้อย่างละเอียด:\n\n${attachmentsContext}`;
      }
    }

    const displayContent = cleanText || (attachments && attachments.length > 0 ? `แนบไฟล์: ${attachments.map((a) => a.name).join(", ")}` : "");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayContent,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      timestamp: Date.now(),
    };

    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      model: activeSession.model || "NEXA",
      isStreaming: true,
    };

    const baseHistory = overrideBaseMessages ?? activeSession.messages;

    // Auto generate session title if first user message
    let updatedTitle = activeSession.title;
    if (baseHistory.length === 0 || activeSession.title === "New Chat" || activeSession.title === "บทสนทนาใหม่") {
      const titleSeed = cleanText || (attachments?.[0]?.name ?? "แชทใหม่");
      updatedTitle = titleSeed.slice(0, 32) + (titleSeed.length > 32 ? "..." : "");
    }

    const updatedMessages = [...baseHistory, userMessage, assistantPlaceholder];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              title: updatedTitle,
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setIsStreaming(true);
    zenAudio.playZenChime();

    // Prepare API history from clean base history
    const historyPayload = baseHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: apiPrompt,
          attachments: attachments,
          history: historyPayload,
          model: activeSession.model || "NEXA",
          temperature: activeSession.temperature ?? 0.7,
          customSystemPrompt: activeSession.customSystemPrompt,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMessage = `Server status ${response.status}`;
        let errCode = "";
        try {
          const errData = await response.json();
          if (errData?.error) {
            errMessage = errData.error;
          }
          if (errData?.code) {
            errCode = errData.code;
          }
        } catch {
          // ignore parse error
        }
        if (errCode === "TURNSTILE_REQUIRED" || response.status === 403) {
          setIsTurnstileModalOpen(true);
        }
        throw new Error(errMessage);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let isCompleted = false;
      let lastAudioTick = 0;

      // 144FPS Ultra-smooth High-Refresh RAF Text Buffer for zero-lag streaming
      let rafPending = false;

      const scheduleFlush = () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const currentText = accumulatedText;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: currentText, isStreaming: !isCompleted }
                        : m
                    ),
                  }
                : s
            )
          );

          // Synchronize activeArtifact content live while writing/streaming
          setActiveArtifact((prev) => {
            if (!prev || prev.messageId !== assistantMessageId) return prev;
            const blocks = extractCodeBlocksFromMarkdown(currentText);
            if (blocks.length > 0) {
              const latestBlock = blocks[blocks.length - 1];
              return {
                ...prev,
                content: latestBlock.code,
                lineCount: latestBlock.code.split("\n").length,
                isStreaming: !isCompleted,
              };
            }
            return prev;
          });
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                accumulatedText += data.text;
                
                const now = Date.now();
                if (now - lastAudioTick > 120) {
                  zenAudio.playSoftClick();
                  lastAudioTick = now;
                }

                scheduleFlush();
              }
              if (data.error) {
                accumulatedText += `\n\n*Error: ${data.error}*`;
                scheduleFlush();
              }
            } catch {
              // ignore parse errors in stream chunks
            }
          }
        }
      }

      isCompleted = true;

      // Finalize activeArtifact streaming state
      setActiveArtifact((prev) =>
        prev && prev.messageId === assistantMessageId
          ? { ...prev, isStreaming: false }
          : prev
      );

      // Finalize message
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: accumulatedText || "No response received.", isStreaming: false }
                    : m
                ),
              }
            : s
        )
      );

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream stopped by user");
      } else {
        console.error("Chat error:", err);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSession.id
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: (m.content || "") + `\n\n⚠️ **Connection issue**: ${err.message || "Failed to reach AI service"}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : s
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Regenerate message (replaces the assistant message cleanly without duplication)
  const handleRegenerate = (messageId: string) => {
    const msgIndex = activeSession.messages.findIndex((m) => m.id === messageId);
    if (msgIndex <= 0) return;

    const previousUserMsg = activeSession.messages[msgIndex - 1];
    if (previousUserMsg && previousUserMsg.role === "user") {
      const truncatedMessages = activeSession.messages.slice(0, msgIndex - 1);
      handleSendMessage(previousUserMsg.content, previousUserMsg.attachments, truncatedMessages);
    }
  };

  // Edit user message and resend (truncates history from that point and resends)
  const handleEditAndResend = (newContent: string, messageId?: string) => {
    if (messageId) {
      const msgIndex = activeSession.messages.findIndex((m) => m.id === messageId);
      const truncated = msgIndex >= 0 ? activeSession.messages.slice(0, msgIndex) : activeSession.messages;
      handleSendMessage(newContent, undefined, truncated);
    } else {
      handleSendMessage(newContent);
    }
  };

  // Create new session
  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "บทสนทนาใหม่",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model: "NEXA",
      temperature: 0.7,
      scratchpadCode: activeSession.scratchpadCode || "",
      scratchpadLang: activeSession.scratchpadLang || "typescript",
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    zenAudio.playCopyChime();
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) {
      handleNewSession();
      return;
    }
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Toggle Pin
  const handleTogglePinSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  // Scratchpad handler
  const handleSendToScratchpad = (code: string, lang: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, scratchpadCode: code, scratchpadLang: lang }
          : s
      )
    );
    setIsScratchpadOpen(true);
  };

  // Export session to Markdown
  const handleExportMarkdown = () => {
    const lines = [
      `# ${activeSession.title}`,
      `*Exported on ${new Date().toLocaleString()}*`,
      "",
      "---",
      "",
    ];

    activeSession.messages.forEach((m) => {
      lines.push(`### ${m.role === "user" ? "👤 User" : "🤖 OpenCode Zen"}`);
      lines.push(m.content);
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession.title.toLowerCase().replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    zenAudio.playCopyChime();
  };

  // Export all sessions to JSON
  const handleExportJSON = () => {
    const data = {
      sessions,
      themeId,
      version: 2,
      exportedAt: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opencode_zen_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    zenAudio.playCopyChime();
  };

  // Import sessions from JSON with strict schema validation
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        if (!raw || typeof raw !== "string") {
          showToast("ไฟล์ว่างเปล่าหรืออ่านข้อมูลไม่สำเร็จ", "error");
          return;
        }

        const parsed = JSON.parse(raw, (key, value) => {
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            return undefined;
          }
          return value;
        });
        if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          // Validate and sanitize each session structure
          const sanitizeString = (val: any, maxLen: number, fallback = ""): string => {
            if (typeof val !== "string") return fallback;
            return val.slice(0, maxLen);
          };

          const validatedSessions: ChatSession[] = parsed.sessions
            .filter((s: any) => s && typeof s.id === "string")
            .map((s: any) => ({
              id: sanitizeString(s.id, 100, `sess-${Date.now()}`),
              title: sanitizeString(s.title, 150, "บทสนทนา"),
              messages: Array.isArray(s.messages)
                ? s.messages
                    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
                    .map((m: any) => ({
                      id: sanitizeString(m.id, 100, `msg-${Date.now()}`),
                      role: m.role,
                      content: sanitizeString(m.content, 50000, ""),
                      timestamp: typeof m.timestamp === "number" && !isNaN(m.timestamp) ? m.timestamp : Date.now(),
                      model: typeof m.model === "string" ? sanitizeString(m.model, 50) : undefined,
                      attachments: Array.isArray(m.attachments)
                        ? m.attachments
                            .filter((a: any) => a && typeof a.name === "string")
                            .map((a: any) => ({
                              id: sanitizeString(a.id, 100, `att-${Date.now()}`),
                              name: sanitizeString(a.name, 100, "attachment"),
                              size: typeof a.size === "number" ? a.size : 0,
                              type: sanitizeString(a.type, 50, "text/plain"),
                              content: typeof a.content === "string" ? a.content.slice(0, 100000) : undefined,
                              dataUrl: typeof a.dataUrl === "string" && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(a.dataUrl) ? a.dataUrl.slice(0, 2000000) : undefined,
                            }))
                        : undefined,
                    }))
                : [],
              updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Date.now(),
              model: typeof s.model === "string" ? sanitizeString(s.model, 50, "NEXA") : "NEXA",
              isPinned: Boolean(s.isPinned),
              temperature: typeof s.temperature === "number" && !isNaN(s.temperature) ? Math.max(0, Math.min(1, s.temperature)) : 0.7,
              customSystemPrompt: typeof s.customSystemPrompt === "string" ? sanitizeString(s.customSystemPrompt, 2000) : undefined,
              scratchpadCode: typeof s.scratchpadCode === "string" ? sanitizeString(s.scratchpadCode, 50000) : undefined,
              scratchpadLang: typeof s.scratchpadLang === "string" ? sanitizeString(s.scratchpadLang, 50) : undefined,
            }));

          if (validatedSessions.length > 0) {
            setSessions(validatedSessions);
            setActiveSessionId(validatedSessions[0].id);
            if (parsed.themeId && ZEN_THEMES[parsed.themeId as ZenThemeId]) {
              setThemeId(parsed.themeId as ZenThemeId);
            }
            showToast(`นำเข้าประวัติสนทนา ${validatedSessions.length} รายการสำเร็จ!`, "success");
            zenAudio.playCopyChime();
          } else {
            showToast("ไม่พบข้อมูลแชตที่ถูกต้องในไฟล์ JSON", "error");
          }
        } else {
          showToast("รูปแบบไฟล์ JSON ไม่ถูกต้อง", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการแปลงไฟล์ JSON", "error");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleResetAllData = () => {
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    setSessions([DEFAULT_SESSION]);
    setActiveSessionId(DEFAULT_SESSION.id);
  };

  const scratchpadLineCount = (activeSession.scratchpadCode || "").split("\n").length;
  const isChatEmpty = !activeSession.messages || activeSession.messages.length === 0;

  return (
    <div className="flex h-[100dvh] w-full bg-white text-zinc-950 font-sans overflow-hidden antialiased relative selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar with Smooth AnimatePresence */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onTogglePinSession={handleTogglePinSession}
            currentTheme={currentTheme}
            onSelectTheme={setThemeId}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onExportAll={handleExportJSON}
            onImport={handleImportJSON}
          />
        )}
      </AnimatePresence>

      {/* Main Column */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden bg-white bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(99,102,241,0.07),rgba(255,255,255,0))] z-10">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 bg-white/95 border border-zinc-200 text-zinc-900">
            <span
              className={`w-2 h-2 rounded-full ${
                toastMessage.type === "success" ? "bg-indigo-600" : "bg-red-500"
              }`}
            />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Top Header Controls: Sidebar (Frameless Animated Hamburger) */}
        <div className="absolute top-3.5 left-3.5 z-30 flex items-center pointer-events-none">
          <AnimatedMenuButton
            isOpen={isSidebarOpen}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            theme={currentTheme}
            className="pointer-events-auto"
          />
        </div>

        {/* Content View: Hero / Active Chat */}
        {isChatEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 relative">
            <div className="w-full max-w-xl text-center space-y-4 sm:space-y-6 -mt-8 animate-in fade-in duration-300">
              {/* Dynamic Alternating Greeting Banner */}
              <div className="mb-2">
                <DynamicGreeting />
              </div>

              {/* Centered Modern Capsule Input */}
              <ChatInput
                onSendMessage={handleSendMessage}
                onStopStreaming={handleStopStreaming}
                isStreaming={isStreaming}
                theme={currentTheme}
                isFocusMode={isFocusMode}
                onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                isHeroMode={true}
                currentModelId={activeSession.model || "NEXA"}
                onSelectModel={(model) => {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSession.id ? { ...s, model } : s))
                  );
                }}
              />
            </div>
          </div>
        ) : (

          /* Active Chat Messages Stream & Artifact Panel Split Screen */
          <div className="flex-1 flex w-full h-full min-w-0 relative overflow-hidden">
            {/* Left Chat Stream Column */}
            <div
              className={`flex flex-col h-full min-w-0 transition-all duration-200 relative ${
                activeArtifact && !isArtifactFullscreen ? "w-full lg:w-1/2 xl:w-1/2 border-r border-zinc-300" : "w-full"
              }`}
            >
              <div
                ref={chatScrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pt-16 pb-4 space-y-4"
              >
                <div className={`w-full ${activeArtifact ? "max-w-lg" : "max-w-xl"} mx-auto`}>
                  {activeSession.messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      theme={currentTheme}
                      onSendToChat={handleSendMessage}
                      onSendToScratchpad={handleSendToScratchpad}
                      onRegenerate={handleRegenerate}
                      onEditAndResend={handleEditAndResend}
                      onOpenArtifact={(art) => {
                        setActiveArtifact(art);
                        setIsArtifactFullscreen(false);
                      }}
                    />
                  ))}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>

              {/* Floating Scroll to Bottom Button */}
              {showScrollBottom && (
                <button
                  onClick={() => scrollToBottom(true)}
                  title="เลื่อนลงล่างสุด"
                  className="absolute bottom-24 right-8 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 shadow-md transition-all cursor-pointer active:scale-90"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              )}

              {/* Bottom Docked Input / Claude Question Sheet */}
              <div className={`w-full ${activeArtifact ? "max-w-lg" : "max-w-xl"} mx-auto px-4 sm:px-6 pb-2`}>
                <AnimatePresence mode="wait">
                  {activeQuestion ? (
                    <ClaudeQuestionSheet
                      key={`q-${latestMessage?.id || "active"}`}
                      question={activeQuestion}
                      onSelectOption={(answer) => {
                        handleSendMessage(answer);
                      }}
                      onDismiss={() => {
                        if (latestMessage) {
                          setDismissedQuestionIds((prev) => new Set(prev).add(latestMessage.id));
                        }
                      }}
                    />
                  ) : (
                    <motion.div
                      key="chat-input-bar"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <ChatInput
                        onSendMessage={handleSendMessage}
                        onStopStreaming={handleStopStreaming}
                        isStreaming={isStreaming}
                        theme={currentTheme}
                        isFocusMode={isFocusMode}
                        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                        isHeroMode={false}
                        currentModelId={activeSession.model || "NEXA"}
                        onSelectModel={(model) => {
                          setSessions((prev) =>
                            prev.map((s) => (s.id === activeSession.id ? { ...s, model } : s))
                          );
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Side: Desktop Split Artifact Panel (Claude Style) */}
            {activeArtifact && !isArtifactFullscreen && (
              <div className="hidden lg:block lg:w-1/2 xl:w-1/2 shrink-0 h-full">
                <ArtifactPanel
                  artifact={activeArtifact}
                  isOpen={Boolean(activeArtifact)}
                  onClose={() => setActiveArtifact(null)}
                  isFullscreen={isArtifactFullscreen}
                  onToggleFullscreen={() => setIsArtifactFullscreen(true)}
                  isStreaming={Boolean(isStreaming && activeArtifact.isStreaming)}
                  onSendToChat={handleSendMessage}
                />
              </div>
            )}

            {/* Mobile or Fullscreen View for Artifact Panel */}
            {activeArtifact && (
              <div className={isArtifactFullscreen ? "block" : "lg:hidden block fixed inset-0 z-50 bg-[#050505]"}>
                <ArtifactPanel
                  artifact={activeArtifact}
                  isOpen={Boolean(activeArtifact)}
                  onClose={() => {
                    setActiveArtifact(null);
                    setIsArtifactFullscreen(false);
                  }}
                  isFullscreen={isArtifactFullscreen}
                  onToggleFullscreen={() => setIsArtifactFullscreen((prev) => !prev)}
                  isStreaming={Boolean(isStreaming && activeArtifact.isStreaming)}
                  onSendToChat={handleSendMessage}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={currentTheme}
        onSelectTheme={setThemeId}
        session={activeSession}
        onUpdateSessionSettings={(settings) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSession.id
                ? {
                    ...s,
                    ...settings,
                  }
                : s
            )
          );
          showToast("บันทึกการตั้งค่าแล้ว", "success");
        }}
        onExportMarkdown={handleExportMarkdown}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onResetAllData={handleResetAllData}
      />

      {/* Turnstile Human Verification Modal */}
      {isTurnstileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-all ${
              currentTheme.isDark
                ? "bg-[#121316] border-zinc-800 text-zinc-100"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-thai font-semibold text-base">ยืนยันความปลอดภัย (Human Verification)</h3>
                <p className="font-thai text-xs text-zinc-500 dark:text-zinc-400">
                  ระบบต้องการการยืนยันตัวตนเพื่อป้องกันบอทและคุ้มครองทรัพยากร AI
                </p>
              </div>
            </div>

            <div className="py-2">
              <CloudflareTurnstile
                theme={currentTheme}
                onVerify={() => {
                  setIsTurnstileModalOpen(false);
                  showToast("ยืนยันตัวตนสำเร็จแล้ว! คุณสามารถเริ่มแชทได้ทันที", "success");
                }}
                onError={() => {
                  showToast("การยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTurnstileModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discord Periodic Community Promo Popup */}
      <DiscordPromoPopup currentTheme={currentTheme} />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg font-thai text-sm text-white ${
              toastMessage.type === "error" ? "bg-red-600" : "bg-zinc-900"
            }`}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Settings, 
  Pin, 
  Trash2, 
  Download, 
  Upload,
  ShieldCheck
} from "lucide-react";
import { ChatSession, ZenThemeConfig, ZenThemeId } from "../types";
import { zenAudio } from "../utils/zenAudio";
import { NexaLogo } from "./ZeroworkLogo";
import { AnimatedMenuButton } from "./AnimatedMenuButton";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession: (id: string) => void;
  currentTheme: ZenThemeConfig;
  onSelectTheme: (themeId: ZenThemeId) => void;
  onOpenSettings: () => void;
  onExportAll: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onTogglePinSession,
  currentTheme,
  onOpenSettings,
  onExportAll,
  onImport,
}) => {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_WEEK = 7 * ONE_DAY;

  const isDark = currentTheme?.isDark ?? false;
  const pinnedSessions = sessions.filter((s) => s.pinned || s.isPinned);
  const unpinnedSessions = sessions.filter((s) => !s.pinned && !s.isPinned);

  const todaySessions = unpinnedSessions.filter((s) => now - s.updatedAt < ONE_DAY);
  const weekSessions = unpinnedSessions.filter(
    (s) => now - s.updatedAt >= ONE_DAY && now - s.updatedAt < ONE_WEEK
  );
  const previousSessions = unpinnedSessions.filter((s) => now - s.updatedAt >= ONE_WEEK);

  const renderSessionGroup = (title: string, groupSessions: ChatSession[]) => {
    if (groupSessions.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <div className={`font-inter px-1 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
          isDark ? currentTheme.textMuted : "text-zinc-500"
        }`}>
          {title}
        </div>
        <div className="space-y-1">
          {groupSessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isPinned = s.pinned || s.isPinned;
            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id);
                  zenAudio.playSoftClick();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`group px-3 py-2 text-[13.5px] flex items-center justify-between transition-all cursor-pointer rounded-xl ${
                  isActive
                    ? isDark
                      ? "bg-white/10 text-white font-medium"
                      : "bg-indigo-50 text-indigo-900 font-medium"
                    : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-center min-w-0 pr-2 gap-2 flex-1">
                  {isPinned && (
                    <Pin className={`w-3 h-3 shrink-0 ${
                      isDark ? "text-indigo-400 fill-indigo-400" : "text-indigo-600 fill-indigo-600"
                    }`} />
                  )}
                  <span className="font-thai truncate">{s.title || "แชทใหม่"}</span>
                </div>

                {/* Pin & Delete Action Group */}
                <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinSession(s.id);
                      zenAudio.playSoftClick();
                    }}
                    title={isPinned ? "เลิกปักหมุด" : "ปักหมุดการสนทนา"}
                    className={`p-1 transition-colors cursor-pointer ${
                      isDark
                        ? "text-zinc-400 hover:text-indigo-400"
                        : "text-zinc-400 hover:text-indigo-600"
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? (isDark ? "fill-indigo-400 text-indigo-400" : "fill-indigo-600 text-indigo-600") : ""}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                      zenAudio.playSoftClick();
                    }}
                    title="ลบการสนทนา"
                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop with smooth fade */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Smooth Animated Sidebar Panel */}
      <motion.aside
        initial={{ x: "-100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "-100%", opacity: 0.9 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 34,
          mass: 0.85,
        }}
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] border-r flex flex-col shrink-0 select-none shadow-2xl lg:shadow-none overflow-hidden h-full transition-colors duration-200 ${
          isDark
            ? `${currentTheme.cardBg} ${currentTheme.cardBorder} ${currentTheme.textColor}`
            : "bg-white border-zinc-200/90 text-zinc-950"
        }`}
      >
        {/* Top Header: NEXA Logo + Close Button */}
        <div className={`h-16 px-5 pt-safe flex items-center justify-between border-b ${
          isDark ? currentTheme.cardBorder : "border-zinc-100"
        }`}>
          <div 
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 1024) onClose();
            }} 
            className="flex items-center cursor-pointer hover:opacity-85 transition-opacity py-1 flex-1 min-w-0 pr-2"
            title="NEXA"
          >
            <NexaLogo height={36} className="max-w-[180px]" color={isDark ? "#ffffff" : "#000000"} />
          </div>

          {/* Close Sidebar button (Frameless Animated Hamburger/X) */}
          <AnimatedMenuButton
            isOpen={true}
            onClick={onClose}
            theme={currentTheme}
            className="shrink-0 -mr-1"
          />
        </div>

        {/* New Chat Primary Button */}
        <div className="px-4 pt-3.5 pb-2">
          <button
            onClick={() => {
              zenAudio.playSoftClick();
              onNewSession();
              if (window.innerWidth < 1024) onClose();
            }}
            className={`font-inter w-full h-9.5 active:scale-[0.98] text-[13.5px] font-medium tracking-normal rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            <span>แชทใหม่</span>
          </button>
        </div>

        {/* Chat Sessions List Grouped by Pin & Date */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {sessions.length === 0 ? (
            <div className={`font-thai px-1 text-xs py-4 text-center ${
              isDark ? currentTheme.textMuted : "text-zinc-400"
            }`}>
              ยังไม่มีการสนทนา
            </div>
          ) : (
            <>
              {pinnedSessions.length > 0 && renderSessionGroup("ที่ปักหมุดไว้", pinnedSessions)}
              {renderSessionGroup("วันนี้", todaySessions)}
              {renderSessionGroup("สัปดาห์นี้", weekSessions)}
              {renderSessionGroup("ก่อนหน้านี้", previousSessions)}
            </>
          )}
        </div>

        {/* Sidebar Footer: Discord & Settings */}
        <div className={`px-4 py-3 mt-auto border-t space-y-1.5 transition-colors ${
          currentTheme.isDark
            ? `${currentTheme.cardBorder} bg-black/20`
            : "border-zinc-100 bg-zinc-50/50"
        }`}>
          <a
            href="https://discord.gg/ZTU7MdUzz"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => zenAudio.playSoftClick()}
            className={`font-inter flex items-center gap-2.5 px-3 py-2 border rounded-xl text-[13px] transition-all cursor-pointer w-full text-left group ${
              currentTheme.isDark
                ? "bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border-[#5865F2]/30 text-[#8ea1e1] hover:text-white"
                : "bg-[#5865F2]/10 hover:bg-[#5865F2]/15 border-[#5865F2]/20 text-[#5865F2] hover:text-[#4752c4]"
            }`}
          >
            <svg
              className="w-4 h-4 fill-current shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span className="font-thai flex-1 font-medium text-[12.5px]">เข้าร่วม Discord</span>
            <span className="text-[10px] bg-[#5865F2] text-white px-1.5 py-0.5 rounded-full font-sans font-bold">
              JOIN
            </span>
          </a>

          {/* Cloudflare Turnstile Security Pill */}
          <button
            type="button"
            onClick={() => {
              zenAudio.playSoftClick();
              onOpenSettings();
            }}
            title="Cloudflare Turnstile ป้องกันบอท"
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[11.5px] transition-all cursor-pointer w-full text-left select-none ${
              currentTheme.isDark
                ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40"
                : "bg-emerald-50/70 border-emerald-200/80 text-emerald-700 hover:border-emerald-300"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span className="font-thai truncate flex-1 font-medium">Cloudflare Bot Shield</span>
            <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </button>

          <button
            onClick={() => {
              zenAudio.playSoftClick();
              onOpenSettings();
            }}
            className={`font-inter flex items-center gap-2.5 px-3 py-2 border rounded-xl text-[13px] transition-all cursor-pointer w-full text-left shadow-2xs ${
              currentTheme.isDark
                ? `${currentTheme.cardBg} ${currentTheme.cardBorder} ${currentTheme.textColor} hover:brightness-110`
                : "bg-white hover:bg-zinc-100 border-zinc-200/80 text-zinc-700 hover:text-zinc-950"
            }`}
          >
            <Settings className={`w-4 h-4 ${currentTheme.isDark ? currentTheme.textMuted : "text-zinc-500"}`} />
            <span className="font-thai flex-1 font-medium">การตั้งค่าระบบ</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

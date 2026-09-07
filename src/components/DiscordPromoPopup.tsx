import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Megaphone, Handshake } from "lucide-react";
import { zenAudio } from "../utils/zenAudio";
import { ZenThemeConfig } from "../types";

const DISCORD_INVITE_URL = "https://discord.gg/ZTU7MdUzz";
const INITIAL_DELAY_MS = 60000; // 1 minute after opening
const SNOOZE_DURATION_MS = 900000; // Snooze for 15 minutes when dismissed
const STORAGE_KEY_DISMISSED = "nexa_discord_popup_dismissed_at";

interface DiscordPromoPopupProps {
  currentTheme?: ZenThemeConfig;
}

export const DiscordPromoPopup: React.FC<DiscordPromoPopupProps> = ({ currentTheme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const isDark = currentTheme?.isDark ?? true;

  useEffect(() => {
    // Check if dismissed recently
    const checkCanShow = () => {
      try {
        const lastDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
        if (lastDismissed) {
          const elapsed = Date.now() - parseInt(lastDismissed, 10);
          if (elapsed < SNOOZE_DURATION_MS) {
            return false;
          }
        }
      } catch {}
      return true;
    };

    // Initial delayed popup check
    const initialTimer = setTimeout(() => {
      if (checkCanShow()) {
        setIsVisible(true);
      }
    }, INITIAL_DELAY_MS);

    // Periodic check every 5 minutes (will only show if snooze period passed)
    const intervalTimer = setInterval(() => {
      if (checkCanShow()) {
        setIsVisible((prev) => {
          if (!prev) return true;
          return prev;
        });
      }
    }, 300000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const handleDismiss = (dontShowToday = false) => {
    setIsVisible(false);
    try {
      const snoozeTime = dontShowToday ? Date.now() + 24 * 60 * 60 * 1000 - SNOOZE_DURATION_MS : Date.now();
      localStorage.setItem(STORAGE_KEY_DISMISSED, snoozeTime.toString());
    } catch {}
    zenAudio.playSoftClick();
  };

  const handleJoin = () => {
    zenAudio.playCopyChime();
    window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    setIsVisible(false);
    try {
      // Don't show again for 24 hours after joining
      localStorage.setItem(STORAGE_KEY_DISMISSED, (Date.now() + 24 * 60 * 60 * 1000 - SNOOZE_DURATION_MS).toString());
    } catch {}
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="fixed bottom-20 right-4 sm:right-6 z-50 max-w-[340px] sm:max-w-[360px] w-full"
        >
          <div
            className={`rounded-3xl border shadow-2xl p-4 sm:p-5 overflow-hidden relative group transition-colors duration-200 ${
              isDark
                ? `${currentTheme?.cardBg || "bg-zinc-900"} ${currentTheme?.cardBorder || "border-zinc-700/80"} text-white backdrop-blur-md`
                : "bg-white/95 border-zinc-200/90 text-zinc-900 shadow-zinc-950/10 backdrop-blur-md"
            }`}
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5865F2] via-indigo-400 to-[#5865F2]" />

            {/* Close Button */}
            <button
              onClick={() => handleDismiss(false)}
              className={`absolute top-3.5 right-3.5 p-1.5 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? "text-zinc-400 hover:text-white hover:bg-white/10"
                  : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
              }`}
              title="ปิดการแจ้งเตือน"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content Container */}
            <div className="flex items-start gap-3.5 pt-1">
              {/* Discord Animated Icon Badge */}
              <div className="w-11 h-11 rounded-2xl bg-[#5865F2] flex items-center justify-center shrink-0 shadow-md shadow-[#5865F2]/25 relative">
                {/* SVG Discord Official Logo */}
                <svg
                  className="w-6 h-6 fill-white"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 rounded-full animate-pulse ${
                    isDark ? "border-zinc-900" : "border-white"
                  }`}
                />
              </div>

              {/* Text Info */}
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`font-thai font-semibold text-[14px] tracking-wide ${
                      isDark ? currentTheme?.textColor || "text-white" : "text-zinc-900"
                    }`}
                  >
                    เข้าร่วม Discord ของเรา
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      isDark
                        ? "bg-[#5865F2]/25 text-[#8ea1e1] border-[#5865F2]/40"
                        : "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/25"
                    }`}
                  >
                    Official
                  </span>
                </div>

                <p
                  className={`font-thai text-[12.5px] leading-relaxed mb-2.5 ${
                    isDark ? currentTheme?.textMuted || "text-zinc-300" : "text-zinc-600"
                  }`}
                >
                  ติดตามข่าวสาร อัปเดตฟีเจอร์ใหม่ก่อนใคร พูดคุยกับคอมมูนิตี้
                </p>

                {/* Tags: Partner & Ads (Pill Badges) */}
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-thai border ${
                      isDark
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    <Handshake className="w-3 h-3" />
                    <span>รับพาร์ทเนอร์</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-thai border ${
                      isDark
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>รับลงโฆษณา</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleJoin}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.98] text-white font-thai text-[12.5px] font-medium py-2 px-3.5 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <span>เข้าร่วม Discord</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                  <button
                    onClick={() => handleDismiss(false)}
                    className={`px-3 py-2 font-thai text-[12px] rounded-xl transition-colors cursor-pointer ${
                      isDark
                        ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    }`}
                  >
                    ไว้คราวหลัง
                  </button>
                </div>
                <div className="mt-2.5 text-right">
                  <button
                    onClick={() => handleDismiss(true)}
                    className={`text-[11px] font-thai transition-colors cursor-pointer rounded-full px-2 py-0.5 ${
                      isDark ? "text-zinc-500 hover:text-zinc-400 hover:bg-white/5" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    ไม่แสดงอีกในวันนี้
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

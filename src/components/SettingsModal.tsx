import React, { useState } from "react";
import { X, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { ChatSession, ZenThemeConfig, ZenThemeId } from "../types";
import { CloudflareTurnstile } from "./CloudflareTurnstile";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ZenThemeConfig;
  onSelectTheme?: (themeId: ZenThemeId) => void;
  session?: ChatSession;
  onUpdateSessionSettings?: (settings: Partial<ChatSession>) => void;
  onExportMarkdown?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onResetAllData,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDark = theme?.isDark ?? false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div 
        className={`w-full max-w-[480px] border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDark
            ? "bg-[#141416] border-[#27272a] text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4.5 border-b ${
          isDark ? "border-zinc-800/80 bg-[#18181b]/60" : "border-zinc-100 bg-zinc-50/70"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
            }`}>
              <ShieldCheck className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight font-thai">
                การตั้งค่าระบบ & ความปลอดภัย
              </h2>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                ความปลอดภัย, การตรวจสอบบอท และข้อมูลระบบ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer border shadow-2xs ${
              isDark
                ? "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                : "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Cloudflare Turnstile Bot Protection Section */}
          <div className="space-y-2">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-thai ${
              isDark ? "text-zinc-400" : "text-zinc-500"
            }`}>
              การตรวจสอบและป้องกันบอท (Bot Verification)
            </h3>
            <CloudflareTurnstile theme={theme} />
          </div>

          {/* Data Management Section */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-thai ${
              isDark ? "text-zinc-400" : "text-zinc-500"
            }`}>
              การจัดการข้อมูล (Data Management)
            </h3>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm font-medium border shadow-2xs ${
                  isDark
                    ? "bg-[#18181b] hover:bg-red-950/30 text-zinc-300 hover:text-red-400 border-zinc-800 hover:border-red-900/50"
                    : "bg-white hover:bg-red-50/50 text-zinc-700 hover:text-red-600 border-zinc-200 hover:border-red-200"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                ล้างประวัติการสนทนาทั้งหมด
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    setConfirmDelete(false);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer text-sm font-medium shadow-xs"
                >
                  ยืนยันการล้างข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className={`px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${
                    isDark
                      ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


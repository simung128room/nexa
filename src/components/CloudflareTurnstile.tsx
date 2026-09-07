import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw, Lock, Sparkles, ExternalLink } from "lucide-react";
import { ZenThemeConfig } from "../types";
import { authFetch } from "../utils/apiClient";

interface CloudflareTurnstileProps {
  onVerify?: (token: string) => void;
  onError?: () => void;
  theme?: ZenThemeConfig;
  className?: string;
  compact?: boolean;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

// Cloudflare Turnstile Sitekey (Configurable via environment variable)
const TURNSTILE_SITE_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> })?.env?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "1x00000000000000000000AA";

export const CloudflareTurnstile: React.FC<CloudflareTurnstileProps> = ({
  onVerify,
  onError,
  theme,
  className = "",
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return sessionStorage.getItem("nex_turnstile_verified") === "true";
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const isDark = theme?.isDark ?? false;

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;

    const initTurnstile = () => {
      if (!containerRef.current || !window.turnstile) return;

      // Clean up previous widget
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      setIsVerifying(true);
      setHasError(false);

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: isDark ? "dark" : "light",
          size: compact ? "compact" : "flexible",
          callback: async (token: string) => {
            setIsVerifying(true);
            try {
              const res = await authFetch("/api/verify-turnstile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const data = await res.json().catch(() => null);

              if (res.ok && data?.success) {
                setIsVerifying(false);
                setIsVerified(true);
                setHasError(false);
                sessionStorage.setItem("nex_turnstile_verified", "true");
                if (onVerify) onVerify(token);
              } else {
                setIsVerifying(false);
                setIsVerified(false);
                setHasError(true);
                sessionStorage.removeItem("nex_turnstile_verified");
                if (onError) onError();
              }
            } catch {
              setIsVerifying(false);
              setIsVerified(false);
              setHasError(true);
              sessionStorage.removeItem("nex_turnstile_verified");
              if (onError) onError();
            }
          },
          "error-callback": () => {
            setIsVerifying(false);
            setIsVerified(false);
            setHasError(true);
            sessionStorage.removeItem("nex_turnstile_verified");
            if (onError) onError();
          },
          "expired-callback": () => {
            setIsVerified(false);
            sessionStorage.removeItem("nex_turnstile_verified");
          },
        });
      } catch (err) {
        console.error("Turnstile initialization failed:", err);
        setIsVerifying(false);
        setIsVerified(false);
        setHasError(true);
        if (onError) onError();
      }
    };

    if (window.turnstile) {
      initTurnstile();
    } else {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (window.turnstile) {
          if (checkInterval) clearInterval(checkInterval);
          initTurnstile();
        } else if (attempts > 15) {
          if (checkInterval) clearInterval(checkInterval);
          setIsVerifying(false);
          setHasError(true);
          if (onError) onError();
        }
      }, 300);

      return () => {
        if (checkInterval) clearInterval(checkInterval);
      };
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [isDark, compact, onVerify, onError]);

  const handleManualReverify = () => {
    setIsVerified(false);
    setIsVerifying(true);
    setHasError(false);
    sessionStorage.removeItem("nex_turnstile_verified");
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all select-none ${className} ${
      isDark ? "bg-[#18181b]/90 border-zinc-800 text-zinc-200" : "bg-white border-zinc-200/90 text-zinc-900"
    }`}>
      {/* Cloudflare Shield Header */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
            isVerified 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : isVerifying
              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
              : isDark
              ? "bg-zinc-800 border-zinc-700 text-zinc-300"
              : "bg-zinc-100 border-zinc-200 text-zinc-700"
          }`}>
            {isVerified ? (
              <ShieldCheck className="w-4.5 h-4.5" />
            ) : isVerifying ? (
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
            ) : hasError ? (
              <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
            ) : (
              <Lock className="w-4.5 h-4.5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold tracking-tight font-thai">
                Cloudflare Turnstile Bot Protection
              </span>
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium border ${
                isVerified
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : isVerifying
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}>
                {isVerified ? "ยืนยันเป็นมนุษย์แล้ว" : isVerifying ? "กำลังตรวจสอบบอท..." : "รอการตรวจสอบ"}
              </span>
            </div>
            <p className={`text-[11.5px] font-thai truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              ระบบตรวจจับและสกัดกั้นบอท / ป้องกันการสแปมอัตโนมัติด้วย Cloudflare
            </p>
          </div>
        </div>

        {/* Refresh / Re-check button */}
        <button
          type="button"
          onClick={handleManualReverify}
          title="ตรวจสอบบอทใหม่อีกครั้ง"
          className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
            isDark
              ? "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
              : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Cloudflare Turnstile Container */}
      <div className={`px-3.5 pb-3.5 sm:px-4 sm:pb-4 border-t pt-3 flex flex-col items-center justify-center ${
        isDark ? "border-zinc-800/60 bg-[#141416]/50" : "border-zinc-100 bg-zinc-50/50"
      }`}>
        <div ref={containerRef} className="my-1 flex justify-center min-h-[65px] w-full" />
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>คุ้มครองความปลอดภัยระดับชั้นนำโดย Cloudflare Turnstile & Web Shield</span>
        </div>
      </div>
    </div>
  );
};

import React from "react";

interface JomcodeBannerLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const JomcodeBannerLogo: React.FC<JomcodeBannerLogoProps> = ({
  className = "",
  width = "100%",
  height = "auto",
}) => {
  return (
    <div className={`flex items-center justify-center select-none py-2 ${className}`}>
      <svg
        viewBox="0 0 680 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[480px] sm:max-w-[560px] md:max-w-[620px] h-auto drop-shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
        style={{ width: width === "100%" ? "100%" : width, height }}
        aria-label="JOM CODE"
      >
        <defs>
          {/* Subtle gradient for 3D retro font */}
          <linearGradient id="retroTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5f2eb" />
            <stop offset="60%" stopColor="#e1dcd3" />
            <stop offset="100%" stopColor="#c9c4ba" />
          </linearGradient>

          {/* CRT Screen Glow */}
          <linearGradient id="crtScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#081017" />
            <stop offset="100%" stopColor="#04080d" />
          </linearGradient>

          {/* Cyan Glow for J1 */}
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Monitor Chassis Gradient */}
          <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ebe7df" />
            <stop offset="100%" stopColor="#c8c4bc" />
          </linearGradient>
          
          <linearGradient id="chassisSideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d5d1c8" />
            <stop offset="100%" stopColor="#aba79f" />
          </linearGradient>
        </defs>

        {/* ==================== LEFT TEXT: J O M ==================== */}
        <g transform="translate(40, 50)">
          {/* 3D Depth Shadow behind JOM */}
          <text
            x="0"
            y="95"
            fill="#a19c92"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="105"
            letterSpacing="2"
          >
            JOM
          </text>
          {/* Front Face JOM */}
          <text
            x="-2"
            y="92"
            fill="url(#retroTextGrad)"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="105"
            letterSpacing="2"
          >
            JOM
          </text>
        </g>

        {/* ==================== CENTER RETRO CRT PC ==================== */}
        <g transform="translate(255, 30)">
          {/* Computer Case Shadow */}
          <rect x="0" y="152" width="160" height="12" rx="3" fill="#050505" opacity="0.6" />

          {/* --- Bottom PC Chassis (Desktop Box) --- */}
          {/* Top Surface of Case */}
          <path d="M 5 110 L 155 110 L 155 116 L 5 116 Z" fill="#d8d4cb" />
          {/* Front Face of Case */}
          <rect x="5" y="116" width="150" height="34" rx="4" fill="url(#chassisGrad)" stroke="#b5b1a8" strokeWidth="1" />
          {/* Left Vent Slots */}
          <rect x="15" y="123" width="28" height="3" fill="#8e8a82" rx="1" />
          <rect x="15" y="128" width="28" height="3" fill="#8e8a82" rx="1" />
          <rect x="15" y="133" width="28" height="3" fill="#8e8a82" rx="1" />
          {/* Floppy Disk Drive Slot */}
          <rect x="65" y="125" width="75" height="15" rx="2" fill="#a8a49c" stroke="#8e8a82" strokeWidth="1" />
          <rect x="70" y="131" width="45" height="3" fill="#4a4843" rx="0.5" />
          {/* Eject Button & Light */}
          <rect x="122" y="131" width="10" height="5" fill="#605d57" rx="1" />
          <circle cx="120" cy="128" r="1.5" fill="#22c55e" />

          {/* --- Monitor Stand / Neck --- */}
          <rect x="62" y="100" width="36" height="12" fill="#c4c0b8" rx="2" />

          {/* --- CRT Monitor Body --- */}
          {/* Monitor Outer Shell 3D Side */}
          <path d="M 15 15 L 25 10 L 140 10 L 140 105 L 15 105 Z" fill="url(#chassisSideGrad)" />
          {/* Monitor Outer Shell Front */}
          <rect x="22" y="10" width="116" height="92" rx="12" fill="url(#chassisGrad)" stroke="#b8b4ab" strokeWidth="1.5" />
          
          {/* Inner Bezel Frame */}
          <rect x="32" y="18" width="96" height="70" rx="7" fill="#bcbaa0" stroke="#9a9880" strokeWidth="1" />

          {/* --- CRT Screen (Dark Glass) --- */}
          <rect x="36" y="22" width="88" height="62" rx="5" fill="url(#crtScreenGrad)" stroke="#111827" strokeWidth="2" />

          {/* Monitor Controls (Power Button & Knobs) */}
          <circle cx="114" cy="94" r="2.5" fill="#ef4444" />
          <circle cx="122" cy="94" r="2.5" fill="#3b82f6" />

          {/* --- J1 Pixel Code Display on Screen --- */}
          <g filter="url(#cyanGlow)">
            {/* 'J' in pixel lines */}
            <rect x="47" y="32" width="22" height="5" fill="#38bdf8" />
            <rect x="56" y="37" width="6" height="24" fill="#38bdf8" />
            <rect x="45" y="56" width="14" height="5" fill="#38bdf8" />
            <rect x="45" y="49" width="6" height="10" fill="#38bdf8" />

            {/* '1' in pixel lines */}
            <rect x="78" y="32" width="18" height="5" fill="#38bdf8" />
            <rect x="84" y="37" width="6" height="24" fill="#38bdf8" />
            <rect x="76" y="56" width="22" height="5" fill="#38bdf8" />
            <rect x="78" y="37" width="6" height="5" fill="#38bdf8" />
          </g>

          {/* --- Keyboard in Front --- */}
          <g transform="translate(9, 148)">
            {/* Keyboard Base */}
            <path d="M 0 6 L 120 6 L 115 16 L -5 16 Z" fill="#d0ccc4" stroke="#adaba3" strokeWidth="0.8" />
            {/* Key Rows Texture */}
            <line x1="5" y1="9" x2="110" y2="9" stroke="#9e9c94" strokeWidth="1.5" strokeDasharray="3 1.5" />
            <line x1="2" y1="13" x2="107" y2="13" stroke="#9e9c94" strokeWidth="1.5" strokeDasharray="4 1.5" />
          </g>

          {/* --- Mouse to the Right --- */}
          <g transform="translate(132, 150)">
            <ellipse cx="8" cy="7" rx="6" ry="4" fill="#d0ccc4" stroke="#adaba3" strokeWidth="0.8" />
            <line x1="8" y1="3" x2="8" y2="7" stroke="#9e9c94" strokeWidth="0.8" />
          </g>
        </g>

        {/* ==================== RIGHT TEXT: C O D E ==================== */}
        <g transform="translate(425, 50)">
          {/* 3D Depth Shadow behind CODE */}
          <text
            x="0"
            y="95"
            fill="#a19c92"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="105"
            letterSpacing="2"
          >
            CODE
          </text>
          {/* Front Face CODE */}
          <text
            x="-2"
            y="92"
            fill="url(#retroTextGrad)"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="105"
            letterSpacing="2"
          >
            CODE
          </text>
        </g>
      </svg>
    </div>
  );
};

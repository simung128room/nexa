import React from "react";
import { motion } from "motion/react";
import { zenAudio } from "../utils/zenAudio";
import { ZenThemeConfig } from "../types";

interface AnimatedMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  theme?: ZenThemeConfig;
}

export const AnimatedMenuButton: React.FC<AnimatedMenuButtonProps> = ({
  isOpen,
  onClick,
  className = "",
  theme,
}) => {
  const isDark = theme?.isDark ?? false;

  const handleClick = () => {
    zenAudio.playSoftClick();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      title={isOpen ? "ปิดเมนู (Sidebar)" : "เปิดเมนู (Sidebar)"}
      aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
      className={`relative w-10 h-10 flex flex-col items-center justify-center gap-[5px] p-2 rounded-xl transition-all duration-200 cursor-pointer group active:scale-95 select-none focus:outline-hidden ${
        isDark
          ? "hover:bg-white/10 active:bg-white/15"
          : "hover:bg-zinc-100/90 active:bg-zinc-200/80"
      } ${className}`}
    >
      {/* Top Bar */}
      <motion.span
        className={`w-[18px] h-[2px] rounded-full origin-center transition-colors duration-200 ${
          isDark ? "bg-zinc-100" : "bg-zinc-800 group-hover:bg-zinc-950"
        }`}
        animate={
          isOpen
            ? { rotate: 45, y: 7 }
            : { rotate: 0, y: 0 }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 26,
          mass: 0.8,
        }}
      />

      {/* Middle Bar */}
      <motion.span
        className={`w-[18px] h-[2px] rounded-full origin-center transition-colors duration-200 ${
          isDark ? "bg-zinc-100" : "bg-zinc-800 group-hover:bg-zinc-950"
        }`}
        animate={
          isOpen
            ? { opacity: 0, scaleX: 0 }
            : { opacity: 1, scaleX: 1 }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 26,
          mass: 0.8,
        }}
      />

      {/* Bottom Bar */}
      <motion.span
        className={`w-[18px] h-[2px] rounded-full origin-center transition-colors duration-200 ${
          isDark ? "bg-zinc-100" : "bg-zinc-800 group-hover:bg-zinc-950"
        }`}
        animate={
          isOpen
            ? { rotate: -45, y: -7 }
            : { rotate: 0, y: 0 }
        }
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 26,
          mass: 0.8,
        }}
      />
    </button>
  );
};

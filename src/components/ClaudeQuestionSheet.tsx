import React, { useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface QuestionData {
  title: string;
  options: string[];
}

interface ClaudeQuestionSheetProps {
  question: QuestionData;
  onSelectOption: (option: string) => void;
  onDismiss?: () => void;
}

export const ClaudeQuestionSheet: React.FC<ClaudeQuestionSheetProps> = ({
  question,
  onSelectOption,
  onDismiss,
}) => {
  const [customAnswer, setCustomAnswer] = useState("");

  if (!question.options || question.options.length === 0) {
    return null;
  }

  const handleSelect = (option: string) => {
    onSelectOption(option);
  };

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customAnswer.trim()) {
      onSelectOption(customAnswer.trim());
      setCustomAnswer("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 380, 
        damping: 28,
        mass: 0.8
      }}
      className="w-full bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xl font-thai text-left overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-zinc-100">
        <motion.h3 
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
          className="text-[16px] sm:text-[17px] font-semibold text-zinc-950 font-thai tracking-tight"
        >
          {question.title || "เลือกขั้นตอนถัดไป"}
        </motion.h3>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer active:scale-95"
            title="ปิดหน้าต่างสอบถามเพื่อกลับไปใช้ช่องพิมพ์ปกติ"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-1.5 pt-2">
        {question.options.map((option, idx) => (
          <motion.button
            key={idx}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + idx * 0.04, duration: 0.2 }}
            onClick={() => handleSelect(option)}
            className="w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-zinc-50/70 hover:bg-indigo-50/50 border border-zinc-200/70 hover:border-indigo-200 active:bg-indigo-50 transition-all text-left cursor-pointer group shadow-2xs"
          >
            {/* Numbered badge */}
            <div className="w-6 h-6 rounded-lg bg-white group-hover:bg-indigo-600 border border-zinc-200 group-hover:border-indigo-600 text-zinc-700 group-hover:text-white font-semibold text-xs flex items-center justify-center shrink-0 transition-all font-mono shadow-2xs">
              {idx + 1}
            </div>
            {/* Option text */}
            <span className="text-[14px] sm:text-[14.5px] text-zinc-800 group-hover:text-indigo-900 font-thai leading-snug flex-1 transition-colors">
              {option}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Bottom custom answer input */}
      <form
        onSubmit={handleCustomSubmit}
        className="mt-3.5 pt-3 flex items-center gap-2 border-t border-zinc-100"
      >
        <input
          type="text"
          value={customAnswer}
          onChange={(e) => setCustomAnswer(e.target.value)}
          placeholder="พิมพ์คำตอบของคุณเอง หรือเลือกตัวเลือกด้านบน..."
          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 font-thai"
          autoFocus={false}
        />
        <button
          type="submit"
          disabled={!customAnswer.trim()}
          title="ส่งคำตอบ"
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            customAnswer.trim()
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-95 font-semibold"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          }`}
        >
          <ArrowUp className="w-4 h-4 stroke-[2.3]" />
        </button>
      </form>
    </motion.div>
  );
};

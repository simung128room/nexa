import React, { useState, useEffect } from "react";

interface GreetingItem {
  prefix: string;
  highlight: string;
}

export const DynamicGreeting: React.FC = () => {
  const greetings: GreetingItem[] = [
    { prefix: "What can ", highlight: "I help you with?" },
    { prefix: "มีอะไรให้ ", highlight: "NEXA ช่วยคุณบ้าง?" },
    { prefix: "Design, code or ", highlight: "explore any idea" },
    { prefix: "วันนี้อยากให้ ", highlight: "NEXA ช่วยคิดเรื่องอะไร?" },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % greetings.length);
        setIsFading(false);
      }, 300); // 300ms fade
    }, 5500); // cycle every 5.5s

    return () => clearInterval(interval);
  }, [greetings.length]);

  const current = greetings[currentIndex];

  return (
    <div className="min-h-[72px] sm:min-h-[88px] flex items-center justify-center px-2 select-none">
      <h1
        className={`font-sans text-3xl sm:text-4xl md:text-[46px] font-semibold tracking-[-0.03em] leading-tight text-center transition-all duration-300 transform ${
          isFading ? "opacity-0 scale-[0.98] translate-y-1" : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        <span className="text-zinc-900">{current.prefix}</span>
        <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
          {current.highlight}
        </span>
      </h1>
    </div>
  );
};


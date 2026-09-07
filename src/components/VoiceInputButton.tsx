import React, { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = navigator.language || "th-TH"; // Automatic browser locale / universal input

        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            onTranscript(text);
          }
          setIsListening(false);
        };

        rec.onerror = (err: any) => {
          console.warn("Speech recognition error:", err);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, [onTranscript]);

  const [notSupported, setNotSupported] = useState(false);

  const toggleListening = () => {
    if (!recognition) {
      setNotSupported(true);
      setTimeout(() => setNotSupported(false), 3000);
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {notSupported && (
        <span className="absolute -top-8 right-0 whitespace-nowrap px-2 py-1 text-[11px] bg-zinc-900 border border-amber-500/40 text-amber-300 rounded-none shadow-lg pointer-events-none z-50">
          เบราว์เซอร์นี้ไม่รองรับ Speech Recognition
        </span>
      )}
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? "กำลังฟังเสียงของคุณ... (กดเพื่อหยุด)" : "พิมพ์ด้วยเสียง (Voice Input)"}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
          isListening
            ? "bg-red-50 text-red-500 border border-red-200 animate-pulse"
            : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-3.5 h-3.5 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          </>
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};

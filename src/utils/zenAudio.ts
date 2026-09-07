// Web Audio API based Zen Sound Synthesizer (No external assets required)

class ZenAudioService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = false;

  constructor() {
    // sound off by default or restored from localStorage
    if (typeof window !== "undefined") {
      this.soundEnabled = localStorage.getItem("zen_sound_enabled") === "true";
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("zen_sound_enabled", String(enabled));
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Gentle Tibetan / Zen Bell Sound
  public playZenChime() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const baseFreq = 528; // Solfeggio 528Hz frequency (transformation & clarity)

      // Harmonics
      const frequencies = [baseFreq, baseFreq * 1.5, baseFreq * 2.02, baseFreq * 2.76];
      const gains = [0.15, 0.08, 0.04, 0.02];

      frequencies.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(gains[i], now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.5 + i * 0.4);

        osc.connect(gainNode);
        gainNode.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 3.0);
      });
    } catch {
      // Ignore audio failure if user has not interacted yet
    }
  }

  // Subtle typewriter / code click
  public playSoftClick() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Silent catch
    }
  }

  // Smooth pop on action / copy
  public playCopyChime() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Silent catch
    }
  }
}

export const zenAudio = new ZenAudioService();

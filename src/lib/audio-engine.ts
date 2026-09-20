export type AudioHandlers = {
  onTime?: (currentMs: number, durationMs: number) => void;
  onEnded?: () => void;
  onStarted?: () => void;
  onError?: (message: string) => void;
};

const SILENT_MS = 12000;

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private handlers: AudioHandlers = {};
  private raf = 0;
  private silentUntil = 0;
  private silentStart = 0;
  private usingSilent = false;
  volume = 0.85;

  attach(handlers: AudioHandlers) {
    this.handlers = handlers;
    this.ensure();
  }

  private ensure() {
    if (this.audio || typeof Audio === "undefined") return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = this.volume;
    audio.addEventListener("timeupdate", () => {
      if (this.usingSilent) return;
      this.handlers.onTime?.(audio.currentTime * 1000, (audio.duration || 0) * 1000);
    });
    audio.addEventListener("ended", () => {
      if (!this.usingSilent) this.handlers.onEnded?.();
    });
    audio.addEventListener("playing", () => {
      if (!this.usingSilent) this.handlers.onStarted?.();
    });
    audio.addEventListener("error", () => {
      this.handlers.onError?.("Preview failed to load.");
    });
    this.audio = audio;
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.audio) this.audio.volume = this.volume;
  }

  async play(url: string | null, durationMs?: number) {
    this.ensure();
    this.stopSilent();
    if (!url) {
      this.startSilent(durationMs ?? SILENT_MS);
      return;
    }
    this.usingSilent = false;
    const audio = this.audio;
    if (!audio) {
      this.startSilent(durationMs ?? SILENT_MS);
      return;
    }
    audio.pause();
    audio.src = url;
    try {
      await audio.play();
    } catch {
      this.startSilent(Math.min(durationMs ?? SILENT_MS, 30000));
    }
  }

  pause() {
    this.audio?.pause();
    if (this.usingSilent) this.stopSilent(false);
  }

  resume() {
    if (this.usingSilent) {
      this.startSilent(this.silentUntil - this.silentStart, true);
      return;
    }
    void this.audio?.play().catch(() => undefined);
  }

  stop() {
    this.stopSilent();
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
    }
  }

  private startSilent(durationMs: number, fromResume = false) {
    this.usingSilent = true;
    if (!fromResume) {
      this.silentStart = performance.now();
      this.silentUntil = this.silentStart + durationMs;
      this.handlers.onStarted?.();
    }
    const tick = () => {
      if (!this.usingSilent) return;
      const now = performance.now();
      const dur = this.silentUntil - this.silentStart;
      const cur = Math.min(dur, now - this.silentStart);
      this.handlers.onTime?.(cur, dur);
      if (now >= this.silentUntil) {
        this.usingSilent = false;
        this.handlers.onEnded?.();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopSilent(reset = true) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (reset) this.usingSilent = false;
  }
}

export const audioEngine = new AudioEngine();

import { EmbedBuilder } from "discord.js";

const WIDTH = 16;
const ACCENT = 0x8fa38a;

export function formatClock(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function progressLine({ playedMs = 0, durationMs = 0, paused = false }) {
  const played = Math.max(0, playedMs);
  const pausedLabel = paused ? " · paused" : "";
  if (!(durationMs > 0)) return `${formatClock(played)}${pausedLabel}`;
  const shown = Math.min(played, durationMs);
  const filled = Math.round((shown / durationMs) * WIDTH);
  const bar = "▰".repeat(filled) + "▱".repeat(WIDTH - filled);
  return `${bar}  ${formatClock(shown)} / ${formatClock(durationMs)}${pausedLabel}`;
}

export function progressText(snapshot) {
  if (!snapshot?.track) return { title: "Needlecheck", description: "Silence." };
  const via = snapshot.track.source?.kind === "file" ? "File" : "YouTube";
  return {
    title: snapshot.track.name,
    description: `${snapshot.track.artist}\n*${snapshot.track.albumName}*\n${progressLine(snapshot)}\n${via}`,
  };
}

function payload(snapshot) {
  const text = progressText(snapshot);
  return { embeds: [new EmbedBuilder().setColor(ACCENT).setTitle(text.title).setDescription(text.description)] };
}

export class ProgressBoard {
  constructor({ player, intervalMs = 5000 }) {
    this.player = player;
    this.intervalMs = intervalMs;
    this.enabled = false;
    this.channel = null;
    this.message = null;
    this.timer = null;
    this.last = "";
  }

  async setEnabled(enabled, channel) {
    if (!enabled) {
      this.enabled = false;
      this.stop();
      await this.remove();
      return;
    }
    this.enabled = true;
    this.channel = channel;
    await this.tick();
    this.arm();
  }

  arm() {
    this.stop();
    this.timer = setInterval(() => {
      this.tick().catch(() => {});
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async remove() {
    const message = this.message;
    this.message = null;
    this.last = "";
    if (!message) return;
    try {
      await message.delete();
    } catch {
      /* already gone */
    }
  }

  async ping() {
    if (!this.enabled) return;
    await this.tick();
  }

  async showSilence() {
    if (!this.enabled) return;
    await this.tick(true);
  }

  async tick(forceSilence = false) {
    if (!this.enabled || !this.channel) return;
    const snapshot = forceSilence ? { track: null, playedMs: 0, durationMs: 0, paused: false } : this.player.snapshot();
    if (!snapshot.track && this.player.advance && this.message && !forceSilence) return;
    const text = progressText(snapshot);
    const key = `${text.title}\n${text.description}`;
    if (key === this.last && this.message) return;
    this.last = key;
    const body = payload(snapshot);
    if (!this.message) {
      this.message = await this.channel.send(body);
      return;
    }
    try {
      await this.message.edit(body);
    } catch {
      this.message = null;
      this.last = "";
      this.message = await this.channel.send(body);
    }
  }
}

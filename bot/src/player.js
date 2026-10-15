import { existsSync } from "node:fs";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { fileResource, youtubeResource } from "./audio.js";
import { probeDurationMs } from "./duration.js";
import { allTracks } from "./slot.js";
import { planPlayback, resolveMedia } from "./media.js";

export class VoicePlayer {
  constructor({ getCrate, isUnlocked, isPlayed, getOptions, onTrackStart, onIdle, onSkip, onDuration, log }) {
    this.getCrate = getCrate;
    this.isUnlocked = isUnlocked;
    this.isPlayed = isPlayed;
    this.getOptions = getOptions;
    this.onTrackStart = onTrackStart;
    this.onIdle = onIdle;
    this.onSkip = onSkip;
    this.onDuration = onDuration;
    this.log = log ?? (() => {});
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.connection = null;
    this.shuffle = true;
    this.nowPlaying = null;
    this.resource = null;
    this.durationMs = 0;
    this.advance = true;
    this.starting = false;
    this.stopAudio = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this.advance || this.starting) return;
      this.nowPlaying = null;
      this.resource = null;
      this.playNext().catch((err) => this.log(err.message));
    });
    this.player.on("error", (err) => {
      this.log(`Player error: ${err.message}`);
      if (this.stopAudio) this.stopAudio();
      this.nowPlaying = null;
      this.resource = null;
      if (this.advance && !this.starting) this.playNext().catch(() => {});
    });
  }

  async join(channel) {
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch {
        /* ignore */
      }
    }
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.connection.on("stateChange", (from, to) => {
      const extra = to.status === VoiceConnectionStatus.Disconnected ? ` ${to.reason ?? ""}`.trimEnd() : "";
      this.log(`voice ${from.status} -> ${to.status}${extra ? ` (${extra})` : ""}`);
    });
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (err) {
      const status = this.connection?.state?.status ?? "unknown";
      this.leave();
      const reason = err instanceof Error ? err.message : "The operation was aborted";
      throw new Error(`Discord put the bot in the channel, but voice never became ready (${status}). ${reason}`);
    }
    this.connection.subscribe(this.player);
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.leave();
      }
    });
  }

  leave() {
    this.stop();
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch {
        /* ignore */
      }
    }
    this.connection = null;
  }

  stop() {
    this.current = null;
    this.advance = false;
    this.starting = false;
    if (this.stopAudio) this.stopAudio();
    this.stopAudio = null;
    this.player.stop(true);
    this.nowPlaying = null;
    this.resource = null;
    this.durationMs = 0;
    this.onStopped?.();
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  skip() {
    this.player.stop(true);
  }

  unlockedTracks() {
    return allTracks(this.getCrate()).filter((track) => this.isUnlocked(track.albumId));
  }

  findUnlocked(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const tracks = this.unlockedTracks();
    return (
      tracks.find((track) => track.name.toLowerCase() === q) ||
      tracks.find((track) => track.name.toLowerCase().includes(q)) ||
      tracks.find((track) => track.albumName.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q)) ||
      null
    );
  }

  pick(avoid) {
    const unlocked = this.unlockedTracks().filter((track) => !avoid.has(track.id));
    if (!unlocked.length) return null;
    const fresh = unlocked.filter((track) => !this.isPlayed(track.id));
    const pool = fresh.length ? fresh : unlocked;
    if (!this.shuffle) {
      for (const album of this.getCrate()) {
        if (!this.isUnlocked(album.id)) continue;
        const hit = album.tracks.find((track) => pool.some((candidate) => candidate.id === track.id));
        if (hit) return hit;
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  open(track) {
    const options = this.getOptions();
    const plan = planPlayback(track, { youtube: options.youtube });
    if (!plan.ok) {
      const err = new Error(plan.reason);
      err.skip = Boolean(plan.skip);
      err.trackId = track.id;
      throw err;
    }
    if (plan.kind === "file") {
      const resolved = resolveMedia(options.mediaRoot, plan.path);
      if (!resolved.ok) {
        const err = new Error(resolved.reason);
        err.skip = true;
        err.trackId = track.id;
        throw err;
      }
      if (!existsSync(resolved.path)) {
        const err = new Error(`No file at ${resolved.display} in the music folder.`);
        err.skip = true;
        err.trackId = track.id;
        throw err;
      }
      return { ...fileResource(resolved.path), timeout: 15_000 };
    }
    try {
      return { ...youtubeResource(plan.id, options.cookies), timeout: 30_000 };
    } catch (err) {
      const error = new Error(err instanceof Error ? err.message : "Could not start yt-dlp.");
      error.skip = true;
      error.trackId = track.id;
      throw error;
    }
  }

  async start(track, { requested }) {
    if (!this.connection || this.connection.state.status !== VoiceConnectionStatus.Ready) {
      throw new Error("Voice is not ready. Use /leave, then /join again.");
    }
    const token = {};
    this.current = token;
    this.starting = true;
    this.advance = false;
    try {
      if (this.stopAudio) this.stopAudio();
      this.stopAudio = null;
      this.player.stop(true);
      let opened;
      try {
        opened = this.open(track);
      } catch (err) {
        if (requested) err.skip = false;
        throw err;
      }
      this.stopAudio = opened.stop;
      this.advance = true;
      this.player.play(opened.resource);
      try {
        await entersState(this.player, AudioPlayerStatus.Playing, opened.timeout);
      } catch {
        opened.stop();
        this.advance = false;
        this.player.stop(true);
        const err = new Error(
          opened.timeout > 20_000
            ? `YouTube did not produce audio for “${track.name}”.`
            : `Could not read “${track.name}”.`,
        );
        err.skip = !requested;
        err.trackId = track.id;
        throw err;
      }
      if (this.current !== token) return;
      this.nowPlaying = track;
      this.resource = opened.resource;
      this.durationMs = track.durationMs || 0;
      this.readDuration(track, token);
      await this.onTrackStart?.(track);
    } finally {
      if (this.current === token) this.starting = false;
    }
  }

  async play(trackId) {
    if (trackId) {
      const track = this.unlockedTracks().find((candidate) => candidate.id === trackId);
      if (!track) {
        const owner = this.getCrate().find((album) => album.tracks.some((candidate) => candidate.id === trackId));
        if (owner && !this.isUnlocked(owner.id)) throw new Error(`**${owner.name}** is still locked.`);
        throw new Error("Nothing unlocked matches that.");
      }
      await this.start(track, { requested: true });
      return;
    }
    await this.playNext();
  }

  async playNext() {
    const avoid = new Set();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const track = this.pick(avoid);
      if (!track) {
        this.nowPlaying = null;
        await this.onIdle?.("Nothing unlocked can be played right now.");
        return;
      }
      try {
        await this.start(track, { requested: false });
        return;
      } catch (err) {
        if (!err.skip) throw err;
        avoid.add(track.id);
        this.log(err.message);
        await this.onSkip?.(track, err.message);
      }
    }
    this.nowPlaying = null;
    await this.onIdle?.("Skipped everything that is unlocked. Check the music folder, or turn YouTube on.");
  }

  snapshot() {
    if (!this.nowPlaying) return { track: null, playedMs: 0, durationMs: 0, paused: false };
    const status = this.player.state.status;
    return {
      track: this.nowPlaying,
      playedMs: this.resource?.playbackDuration ?? 0,
      durationMs: this.durationMs,
      paused: status === AudioPlayerStatus.Paused,
    };
  }

  readDuration(track, token) {
    if (this.durationMs > 0) return;
    const source = probeTarget(track, this.getOptions());
    if (!source) return;
    probeDurationMs(source).then((ms) => {
      if (this.current !== token || !this.nowPlaying || this.nowPlaying.id !== track.id || ms <= 0) return;
      this.durationMs = ms;
      this.onDuration?.();
    });
  }
}

function probeTarget(track, options) {
  const plan = planPlayback(track, { youtube: options.youtube });
  if (!plan.ok) return null;
  if (plan.kind === "file") {
    const resolved = resolveMedia(options.mediaRoot, plan.path);
    if (!resolved.ok) return null;
    return { kind: "file", path: resolved.path };
  }
  return { kind: "youtube", id: plan.id };
}

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
import { contentHeardMs, heardEnough } from "./listen.js";
import { allTracks } from "./slot.js";
import { planPlayback, resolveMedia } from "./media.js";
import { chooseTrack } from "./queue.js";

export class VoicePlayer {
  constructor({ getCrate, isUnlocked, isPlayed, getOptions, onTrackStart, onListened, onIdle, onSkip, onDuration, log, uncheckedPercent}) {
    this.getCrate = getCrate;
    this.isUnlocked = isUnlocked;
    this.isPlayed = isPlayed;
    this.getOptions = getOptions;
    this.onTrackStart = onTrackStart;
    this.onListened = onListened;
    this.onIdle = onIdle;
    this.onSkip = onSkip;
    this.onDuration = onDuration;
    this.log = log ?? (() => {});
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.connection = null;
    this.shuffle = true;
    this.uncheckedPercent = uncheckedPercent ?? 80;
    this.nowPlaying = null;
    this.resource = null;
    this.durationMs = 0;
    this.advance = true;
    this.starting = false;
    this.stopAudio = null;
    this.speed = 1;
    this.creditMs = 0;
    this.forcePlayed = false;
    this.pendingSpeed = null;
    this.pendingPauseMs = 0;
    this.listen = null;
    this.listenTimer = null;
    this.pauseTimer = null;
    this.pauseUntil = 0;
    this.avoidOnce = null;
    this.userSkipped = false;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this.advance || this.starting) return;
      const skipped = this.userSkipped;
      this.userSkipped = false;
      if (!skipped) this.noteListen(true);
      this.clearListen();
      this.nowPlaying = null;
      this.resource = null;
      this.playNext().catch((err) => this.log(err.message));
    });
    this.player.on("error", (err) => {
      this.log(`Player error: ${err.message}`);
      this.clearListen();
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
    this.clearListen();
    this.clearPause();
    this.current = null;
    this.advance = false;
    this.starting = false;
    this.speed = 1;
    this.creditMs = 0;
    this.forcePlayed = false;
    this.pendingSpeed = null;
    this.pendingPauseMs = 0;
    this.avoidOnce = null;
    this.userSkipped = false;
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
    if (this.nowPlaying) this.avoidOnce = this.nowPlaying.id;
    this.userSkipped = true;
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
    const track = chooseTrack({
      albums: this.getCrate(),
      isUnlocked: (albumId) => this.isUnlocked(albumId),
      isPlayed: (trackId) => this.isPlayed(trackId),
      shuffle: this.shuffle,
      avoid,
      uncheckedPercent: this.uncheckedPercent,
      preferPlayed: this.forcePlayed,
    });
    return track;
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
      return { ...fileResource(resolved.path, { speed: this.speed, startSec: this.creditMs / 1000 }), timeout: 15_000 };
    }
    try {
      return { ...youtubeResource(plan.id, options.cookies, { speed: this.speed }), timeout: 30_000 };
    } catch (err) {
      const error = new Error(err instanceof Error ? err.message : "Could not start yt-dlp.");
      error.skip = true;
      error.trackId = track.id;
      throw error;
    }
  }

  async start(track, { requested, speed, creditMs } = {}) {
    if (!this.connection || this.connection.state.status !== VoiceConnectionStatus.Ready) {
      throw new Error("Voice is not ready. Use /leave, then /join again.");
    }
    const token = {};
    this.current = token;
    this.starting = true;
    this.advance = false;
    this.clearListen();
    this.clearPause();
    this.speed = speed ?? this.pendingSpeed ?? 1;
    this.pendingSpeed = null;
    this.creditMs = creditMs ?? 0;
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
      const continuing = this.nowPlaying?.id === track.id;
      this.nowPlaying = track;
      this.resource = opened.resource;
      this.durationMs = track.durationMs || 0;
      this.readDuration(track, token);
      if (!continuing) this.forcePlayed = false;
      this.armListen(track, opened.resource);
      await this.onTrackStart?.(track);
      if (this.pendingPauseMs > 0) {
        const pauseMs = this.pendingPauseMs;
        this.pendingPauseMs = 0;
        this.pauseFor(pauseMs);
      }
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
    const soft = this.avoidOnce;
    this.avoidOnce = null;
    if (soft) avoid.add(soft);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      let track = this.pick(avoid);
      if (!track && soft && attempt === 0) track = this.pick(new Set());
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
  clearListen() {
    if (this.listenTimer) clearInterval(this.listenTimer);
    this.listenTimer = null;
    this.listen = null;
    this.probeToken = null;
  }

  clearPause() {
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    this.pauseUntil = 0;
  }

  armListen(track, resource) {
    const durationMs = track.durationMs || 0;
    this.listen = { track, resource, creditMs: this.creditMs, speed: this.speed, durationMs, fired: false };
    this.listenTimer = setInterval(() => this.noteListen(false), 500);
    if (durationMs > 0) return;
    const token = {};
    this.probeToken = token;
    const source = probeTarget(track, this.getOptions());
    if (!source) return;
    probeDurationMs(source).then((ms) => {
      if (this.probeToken !== token || this.listen?.track?.id !== track.id || ms <= 0) return;
      this.listen.durationMs = ms;
      this.noteListen(false);
    });
  }

  noteListen(endedNaturally) {
    const listen = this.listen;
    if (!listen || listen.fired) return;
    if (!endedNaturally && this.player.state.status === AudioPlayerStatus.Paused) return;
    const contentMs = contentHeardMs(listen.creditMs, listen.resource?.playbackDuration ?? 0, listen.speed);
    if (!heardEnough({ contentMs, durationMs: listen.durationMs, endedNaturally })) return;
    listen.fired = true;
    if (this.listenTimer) clearInterval(this.listenTimer);
    this.listenTimer = null;
    void this.onListened?.(listen.track);
  }

  pauseFor(ms) {
    if (!this.nowPlaying || this.player.state.status !== AudioPlayerStatus.Playing) {
      this.pendingPauseMs = Math.max(this.pendingPauseMs, ms);
      return;
    }
    this.player.pause();
    const token = this.current;
    this.clearPause();
    this.pendingPauseMs = 0;
    this.pauseUntil = Date.now() + ms;
    this.pauseTimer = setTimeout(() => {
      this.pauseUntil = 0;
      if (this.current !== token) return;
      if (this.player.state.status === AudioPlayerStatus.Paused) this.player.unpause();
    }, ms);
  }

  async applySpeed(speed) {
    const track = this.nowPlaying;
    const listen = this.listen;
    if (!track || !listen) {
      this.pendingSpeed = speed;
      return;
    }
    const playedMs = listen.resource?.playbackDuration ?? 0;
    const creditMs = contentHeardMs(listen.creditMs, playedMs, listen.speed);
    await this.start(track, { requested: true, speed, creditMs });
  }

  async restart() {
    const track = this.nowPlaying;
    if (!track) return false;
    await this.start(track, { requested: true, speed: 1, creditMs: 0 });
    return true;
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

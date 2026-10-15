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
import { allTracks } from "./slot.js";
import { planPlayback, resolveMedia } from "./media.js";
import { chooseTrack } from "./queue.js";

export class VoicePlayer {
  constructor({ getCrate, isUnlocked, isPlayed, getOptions, onTrackStart, onIdle, onSkip, log, uncheckedPercent }) {
    this.getCrate = getCrate;
    this.isUnlocked = isUnlocked;
    this.isPlayed = isPlayed;
    this.getOptions = getOptions;
    this.onTrackStart = onTrackStart;
    this.onIdle = onIdle;
    this.onSkip = onSkip;
    this.log = log ?? (() => {});
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    this.connection = null;
    this.shuffle = true;
    this.uncheckedPercent = uncheckedPercent ?? 80;
    this.nowPlaying = null;
    this.advance = true;
    this.starting = false;
    this.stopAudio = null;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this.advance || this.starting) return;
      this.nowPlaying = null;
      this.playNext().catch((err) => this.log(err.message));
    });
    this.player.on("error", (err) => {
      this.log(`Player error: ${err.message}`);
      if (this.stopAudio) this.stopAudio();
      this.nowPlaying = null;
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
    return chooseTrack({
      albums: this.getCrate(),
      isUnlocked: (albumId) => this.isUnlocked(albumId),
      isPlayed: (trackId) => this.isPlayed(trackId),
      shuffle: this.shuffle,
      avoid,
      uncheckedPercent: this.uncheckedPercent,
    });
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
}

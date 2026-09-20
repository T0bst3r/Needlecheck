import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { config } from "./config.js";
import { allTracks, albumById } from "./crate.js";

function ytdlpArgs(query) {
  const args = [
    "-f",
    "bestaudio[ext=webm]/bestaudio/best",
    "-o",
    "-",
    "--no-playlist",
    "--no-warnings",
    "--quiet",
  ];
  const cookies = config.ytdlpCookies || (existsSync("/data/cookies.txt") ? "/data/cookies.txt" : "");
  if (cookies) args.push("--cookies", cookies);
  args.push(`ytsearch1:${query}`);
  return args;
}

function resourceForTrack(track) {
  const query = `${track.artist} ${track.name} audio`;
  const ytdlp = spawn("yt-dlp", ytdlpArgs(query), { stdio: ["ignore", "pipe", "pipe"] });
  ytdlp.stderr.on("data", () => {});
  const ffmpeg = spawn(
    "ffmpeg",
    ["-i", "pipe:0", "-analyzeduration", "0", "-loglevel", "0", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
    { stdio: ["pipe", "pipe", "ignore"] },
  );
  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdin.on("error", () => {});
  const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw, inlineVolume: true });
  resource.playStream.on("close", () => {
    try {
      ytdlp.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    try {
      ffmpeg.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  });
  return resource;
}

export class VoicePlayer {
  constructor({ getCrate, isUnlocked, isPlayed, onTrackStart, onIdle, log }) {
    this.getCrate = getCrate;
    this.isUnlocked = isUnlocked;
    this.isPlayed = isPlayed;
    this.onTrackStart = onTrackStart;
    this.onIdle = onIdle;
    this.log = log ?? (() => {});
    this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    this.connection = null;
    this.queue = [];
    this.shuffle = true;
    this.nowPlaying = null;
    this.paused = false;
    this.advance = true;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this.advance) return;
      this.nowPlaying = null;
      this.playNext().catch((err) => this.log(`Playback error: ${err.message}`));
    });
    this.player.on("error", (err) => {
      this.log(`Player error: ${err.message}`);
      this.nowPlaying = null;
      this.playNext().catch(() => {});
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
    this.connection.subscribe(this.player);
    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.leave();
    });
  }

  leave() {
    this.advance = false;
    this.player.stop(true);
    this.nowPlaying = null;
    this.queue = [];
    this.paused = false;
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch {
        /* ignore */
      }
    }
    this.connection = null;
    this.advance = true;
  }

  unlockedTracks() {
    return allTracks(this.getCrate()).filter((t) => this.isUnlocked(t.albumId));
  }

  pickRotation() {
    const unlocked = this.unlockedTracks();
    if (!unlocked.length) return null;
    const unplayed = unlocked.filter((t) => !this.isPlayed(t.id) && t.id !== this.nowPlaying?.id);
    const pool = unplayed.length ? unplayed : unlocked.filter((t) => t.id !== this.nowPlaying?.id);
    if (!pool.length) return unlocked[0] ?? null;
    if (!this.shuffle) {
      const albumOrder = this.getCrate().filter((a) => this.isUnlocked(a.id));
      for (const album of albumOrder) {
        const hit = album.tracks.find((t) => pool.some((p) => p.id === t.id));
        if (hit) return hit;
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  enqueue(track, front = false) {
    if (front) this.queue.unshift(track.id);
    else this.queue.push(track.id);
  }

  async play(trackId) {
    if (!this.connection) throw new Error("Not in a voice channel. Use /join first.");
    let track = trackId ? this.unlockedTracks().find((t) => t.id === trackId) : null;
    if (trackId && !track) {
      const locked = albumById(this.getCrate(), this.getCrate().find((a) => a.tracks.some((t) => t.id === trackId))?.id);
      if (locked && !this.isUnlocked(locked.id)) throw new Error(`${locked.name} is still locked.`);
      throw new Error("Nothing unlocked matches that request.");
    }
    if (!track) {
      if (this.queue.length) {
        const id = this.queue.shift();
        track = this.unlockedTracks().find((t) => t.id === id);
      }
      if (!track) track = this.pickRotation();
    }
    if (!track) throw new Error("No unlocked albums to play.");
    this.advance = false;
    this.player.stop(true);
    this.advance = true;
    const resource = resourceForTrack(track);
    this.nowPlaying = track;
    this.paused = false;
    this.player.play(resource);
    await this.onTrackStart?.(track);
  }

  async playNext() {
    try {
      await this.play(null);
    } catch (err) {
      this.nowPlaying = null;
      this.onIdle?.(err.message);
    }
  }

  pause() {
    this.paused = true;
    this.player.pause();
  }

  resume() {
    this.paused = false;
    this.player.unpause();
  }

  skip() {
    this.player.stop(true);
  }

  stop() {
    this.advance = false;
    this.player.stop(true);
    this.nowPlaying = null;
    this.queue = [];
    this.paused = false;
    this.advance = true;
  }

  findUnlocked(query) {
    const q = query.toLowerCase();
    const tracks = this.unlockedTracks();
    return (
      tracks.find((t) => t.name.toLowerCase() === q) ||
      tracks.find((t) => t.name.toLowerCase().includes(q)) ||
      tracks.find((t) => t.albumName.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
  }
}

import { spawn } from "node:child_process";
import { StreamType, createAudioResource } from "@discordjs/voice";

function kill(child) {
  if (!child || child.killed) return;
  try {
    child.kill("SIGKILL");
  } catch {
    /* ignore */
  }
}

function rawResource(ffmpeg, others = []) {
  const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw });
  const stop = () => {
    kill(ffmpeg);
    for (const child of others) kill(child);
  };
  resource.playStream.on("close", stop);
  ffmpeg.on("error", stop);
  ffmpeg.stderr.on("data", () => {});
  return { resource, stop };
}

function ffmpegArgs(inputArgs, speed) {
  const args = ["-hide_banner", "-loglevel", "error", ...inputArgs];
  if (speed > 0 && Math.abs(speed - 1) > 0.02) args.push("-filter:a", `atempo=${speed.toFixed(3)}`);
  args.push("-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1");
  return args;
}

export function fileResource(filePath, { speed = 1, startSec = 0 } = {}) {
  const input = [];
  if (startSec > 0.05) input.push("-ss", startSec.toFixed(3));
  input.push("-i", filePath);
  const ffmpeg = spawn("ffmpeg", ffmpegArgs(input, speed), { stdio: ["ignore", "pipe", "pipe"] });
  return rawResource(ffmpeg);
}

export function youtubeResource(videoId, cookiesPath, { speed = 1 } = {}) {
  const args = ["-f", "bestaudio/best", "-o", "-", "--no-playlist", "--no-warnings", "--quiet"];
  if (cookiesPath) args.push("--cookies", cookiesPath);
  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  const ytdlp = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
  const ffmpeg = spawn("ffmpeg", ffmpegArgs(["-i", "pipe:0"], speed), { stdio: ["pipe", "pipe", "pipe"] });
  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdin.on("error", () => {});
  ytdlp.stderr.on("data", () => {});
  ytdlp.on("error", () => kill(ffmpeg));
  return rawResource(ffmpeg, [ytdlp]);
}

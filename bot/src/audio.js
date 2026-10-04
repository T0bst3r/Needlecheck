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

export function fileResource(filePath) {
  const ffmpeg = spawn(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-i", filePath, "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  return rawResource(ffmpeg);
}

export function youtubeResource(videoId, cookiesPath) {
  const args = ["-f", "bestaudio/best", "-o", "-", "--no-playlist", "--no-warnings", "--quiet"];
  if (cookiesPath) args.push("--cookies", cookiesPath);
  args.push(`https://www.youtube.com/watch?v=${videoId}`);
  const ytdlp = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
  const ffmpeg = spawn(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdin.on("error", () => {});
  ytdlp.stderr.on("data", () => {});
  ytdlp.on("error", () => kill(ffmpeg));
  return rawResource(ffmpeg, [ytdlp]);
}

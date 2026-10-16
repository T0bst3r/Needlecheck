import { spawn } from "node:child_process";

export function probeDurationMs(source) {
  const [command, args] =
    source.kind === "file"
      ? ["ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source.path]]
      : ["yt-dlp", ["--print", "duration", "--no-download", "--no-warnings", "--quiet", `https://www.youtube.com/watch?v=${source.id}`]];
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      resolve(0);
      return;
    }
    let out = "";
    let settled = false;
    const finish = (ms) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ms);
    };
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      finish(0);
    }, 8000);
    child.stdout?.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => finish(0));
    child.on("close", () => {
      const seconds = Number.parseFloat(String(out).trim());
      finish(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0);
    });
  });
}

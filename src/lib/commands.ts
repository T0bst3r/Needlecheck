export type Parsed = { name: string; arg: string };

export function parseCommand(input: string): Parsed | null {
  const text = input.trim();
  if (!text) return null;
  const body = text.startsWith("/") ? text.slice(1) : text;
  const sp = body.indexOf(" ");
  const name = (sp === -1 ? body : body.slice(0, sp)).toLowerCase();
  const arg = (sp === -1 ? "" : body.slice(sp + 1)).trim();
  return { name, arg };
}

export const HELP = [
  "/play [song or album] — play from the unlocked crate",
  "/pause /resume /skip — transport",
  "/shuffle — toggle random rotation",
  "/np — now playing",
  "/crate — locked vs unlocked albums",
  "/hint [album] — scout where an album is sitting",
  "/status — sphere, checks, seed",
  "/help — this list",
].join("\n");

export const LOCAL_COMMANDS = new Set([
  "play",
  "pause",
  "resume",
  "unpause",
  "skip",
  "next",
  "shuffle",
  "np",
  "nowplaying",
  "now-playing",
  "queue",
  "crate",
  "unlocks",
  "hint",
  "status",
  "help",
  "stop",
]);

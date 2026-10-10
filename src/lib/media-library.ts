import { lstat, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { RawAlbum, RawTrack } from "./types.ts";

const AUDIO = new Set([".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".opus", ".aiff", ".aif"]);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export type MediaEntry = { name: string; path: string };

export type LibraryStatus =
  | { local: false; reason?: string }
  | { local: true };

/** A path inside the music folder. Empty is the folder itself. `..` and URLs are refused. */
export function relativeMediaPath(input: string): { ok: true; parts: string[] } | { ok: false; reason: string } {
  const text = input.trim().replace(/\\/g, "/");
  if (text.length > 400 || /[\r\n\0]/.test(text)) return { ok: false, reason: "That path is not usable." };
  if (!text) return { ok: true, parts: [] };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || path.isAbsolute(text) || /^[a-zA-Z]:\//.test(text)) {
    return { ok: false, reason: "Use a path inside the music folder." };
  }
  const parts = text.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return { ok: false, reason: "That path leaves the music folder." };
  }
  return { ok: true, parts };
}

export function libraryStatus(env: NodeJS.ProcessEnv = process.env): LibraryStatus {
  const flag = (env.NEEDLECHECK_LOCAL ?? "").trim().toLowerCase();
  const on = flag === "1" || flag === "true" || flag === "yes";
  if (!on) return { local: false };
  if (!(env.MEDIA_ROOT ?? "").trim()) {
    return { local: false, reason: "NEEDLECHECK_LOCAL is set, but MEDIA_ROOT is empty." };
  }
  return { local: true };
}

export function songTitle(filename: string): string {
  const ext = path.extname(filename);
  const base = ext && AUDIO.has(ext.toLowerCase()) ? filename.slice(0, -ext.length) : filename;
  return base.trim();
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function resolveInside(root: string, parts: string[]): Promise<string | null> {
  const target = parts.length ? path.resolve(root, ...parts) : root;
  let real: string;
  try {
    real = await realpath(target);
  } catch {
    return null;
  }
  return inside(root, real) ? real : null;
}

export async function openLibrary(root: string): Promise<string> {
  const abs = path.resolve(root);
  let real: string;
  try {
    real = await realpath(abs);
  } catch {
    throw new Error("MEDIA_ROOT is not a folder.");
  }
  const info = await stat(real);
  if (!info.isDirectory()) throw new Error("MEDIA_ROOT is not a folder.");
  return real;
}

export async function listLibrary(
  root: string,
  rel: string,
): Promise<{ ok: true; path: string; dirs: MediaEntry[]; files: MediaEntry[] } | { ok: false; reason: string }> {
  const parsed = relativeMediaPath(rel);
  if (!parsed.ok) return parsed;
  const dir = await resolveInside(root, parsed.parts);
  if (!dir) return { ok: false, reason: "That folder is not in the music library." };
  const info = await stat(dir);
  if (!info.isDirectory()) return { ok: false, reason: "That path is a file, not a folder." };
  const entries = await readdir(dir, { withFileTypes: true });
  const dirs: MediaEntry[] = [];
  const files: MediaEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const childParts = [...parsed.parts, entry.name];
    const display = childParts.join("/");
    let linked: string;
    try {
      linked = await realpath(path.join(dir, entry.name));
    } catch {
      continue;
    }
    if (!inside(root, linked)) continue;
    const linkedInfo = await lstat(path.join(dir, entry.name));
    const follow = linkedInfo.isSymbolicLink() ? await stat(linked) : linkedInfo;
    if (follow.isDirectory()) dirs.push({ name: entry.name, path: display });
    else if (follow.isFile() && AUDIO.has(path.extname(entry.name).toLowerCase())) files.push({ name: entry.name, path: display });
  }
  dirs.sort((a, b) => collator.compare(a.name, b.name));
  files.sort((a, b) => collator.compare(a.name, b.name));
  return { ok: true, path: parsed.parts.join("/"), dirs, files };
}

export async function searchLibrary(root: string, term: string, limit = 12): Promise<MediaEntry[]> {
  const query = term.trim().toLowerCase();
  if (query.length < 1) return [];
  const found: MediaEntry[] = [];
  let seen = 0;
  async function walk(parts: string[]): Promise<void> {
    if (found.length >= limit || seen > 4000) return;
    const listed = await listLibrary(root, parts.join("/"));
    if (!listed.ok) return;
    for (const file of listed.files) {
      seen += 1;
      if (file.path.toLowerCase().includes(query)) found.push(file);
      if (found.length >= limit) return;
    }
    for (const dir of listed.dirs) {
      if (found.length >= limit || seen > 4000) return;
      seen += 1;
      await walk([...parts, dir.name]);
    }
  }
  await walk([]);
  return found;
}

export async function folderAlbum(root: string, rel: string): Promise<{ ok: true; album: RawAlbum } | { ok: false; reason: string }> {
  const listed = await listLibrary(root, rel);
  if (!listed.ok) return listed;
  if (!listed.files.length) {
    return { ok: false, reason: "That folder has no audio files. Open a folder of songs, or add one of the folders inside it." };
  }
  const folderName = listed.path ? listed.path.split("/").at(-1)! : path.basename(root) || "Music";
  const tracks: RawTrack[] = listed.files.flatMap((file, index) => {
    const name = songTitle(file.name);
    if (!name) return [];
    return [
      {
        id: `file:${file.path}`,
        name,
        artist: "Local",
        previewUrl: null,
        durationMs: 0,
        trackNumber: index + 1,
        source: { kind: "file" as const, path: file.path },
        included: true,
      },
    ];
  });
  if (!tracks.length) return { ok: false, reason: "That folder has no audio files." };
  return {
    ok: true,
    album: {
      id: `folder:${listed.path || "."}`,
      name: folderName,
      artist: "Local",
      artwork: "",
      year: null,
      tracks,
    },
  };
}

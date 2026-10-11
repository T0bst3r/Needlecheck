import { lstat, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { RawAlbum, RawTrack } from "./types.ts";

const AUDIO = new Set([".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".opus", ".aiff", ".aif", ".wma"]);
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
  const online = (env.NEEDLECHECK_ONLINE ?? "").trim().toLowerCase();
  if (online === "1" || online === "true" || online === "yes") return { local: false };
  if (!(env.MEDIA_ROOT ?? "").trim()) return { local: false };
  return { local: true };
}

export function songTitle(filename: string): string {
  const ext = path.extname(filename);
  const base = ext && AUDIO.has(ext.toLowerCase()) ? filename.slice(0, -ext.length) : filename;
  return base.trim();
}

/** Drop a leading track number. `01 - So What` becomes `So What`. */
export function trackTitle(filename: string): string {
  const base = songTitle(filename);
  const stripped = base.replace(/^\d{1,3}[\s._-]+/, "").trim();
  return stripped || base;
}

/** `Artist/Album` uses both names. A folder directly under the music root stays artist `Local`. */
export function albumIdentity(relDir: string, rootName: string): { artist: string; name: string } {
  const parts = relDir.split("/").filter(Boolean);
  if (parts.length >= 2) return { artist: parts[parts.length - 2]!, name: parts[parts.length - 1]! };
  if (parts.length === 1) return { artist: "Local", name: parts[0]! };
  return { artist: "Local", name: rootName || "Music" };
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

function albumFromFiles(rootName: string, relDir: string, files: MediaEntry[]): RawAlbum | null {
  const { artist, name } = albumIdentity(relDir, rootName);
  const tracks: RawTrack[] = [];
  for (const file of files) {
    const title = trackTitle(file.name);
    if (!title) continue;
    tracks.push({
      id: `file:${file.path}`,
      name: title,
      artist,
      previewUrl: null,
      durationMs: 0,
      trackNumber: tracks.length + 1,
      source: { kind: "file", path: file.path },
      included: true,
    });
  }
  if (!tracks.length) return null;
  return { id: `folder:${relDir || "."}`, name, artist, artwork: "", year: null, tracks };
}

async function albumFromDir(root: string, rootName: string, relDir: string): Promise<RawAlbum | null> {
  const listed = await listLibrary(root, relDir);
  if (!listed.ok) return null;
  return albumFromFiles(rootName, relDir, listed.files);
}

export async function folderAlbum(root: string, rel: string): Promise<{ ok: true; album: RawAlbum } | { ok: false; reason: string }> {
  const found = await folderAlbums(root, rel, false);
  if (!found.ok) return found;
  const album = found.albums[0];
  if (!album) return { ok: false, reason: "That folder has no audio files. Open a folder of songs, or add the albums inside it." };
  return { ok: true, album };
}

const MAX_ALBUMS = 400;

export async function folderAlbums(
  root: string,
  rel: string,
  recursive: boolean,
): Promise<{ ok: true; albums: RawAlbum[]; truncated: boolean } | { ok: false; reason: string }> {
  const start = await listLibrary(root, rel);
  if (!start.ok) return start;
  const origin = start;
  const dirs: string[] = [];
  let truncated = false;
  async function walk(listedPath: string, depth: number): Promise<void> {
    if (dirs.length >= MAX_ALBUMS || depth > 6) {
      truncated = true;
      return;
    }
    const listed = listedPath === origin.path ? origin : await listLibrary(root, listedPath);
    if (!listed.ok) return;
    if (listed.files.length) dirs.push(listed.path);
    if (!recursive) return;
    for (const dir of listed.dirs) {
      if (dirs.length >= MAX_ALBUMS) {
        truncated = true;
        return;
      }
      await walk(dir.path, depth + 1);
    }
  }
  await walk(origin.path, 0);
  const rootName = path.basename(root) || "Music";
  const filled: RawAlbum[] = [];
  for (const dir of dirs) {
    const album = dir === origin.path ? albumFromFiles(rootName, dir, origin.files) : await albumFromDir(root, rootName, dir);
    if (album) filled.push(album);
  }
  if (!filled.length) {
    return { ok: false, reason: recursive ? "No audio files under that folder." : "That folder has no audio files. Open a folder of songs, or add the albums inside it." };
  }
  return { ok: true, albums: filled, truncated };
}

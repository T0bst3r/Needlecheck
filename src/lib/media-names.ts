import path from "node:path";
import type { RawAlbum, RawTrack } from "./types.ts";

export const AUDIO = new Set([".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".opus", ".aiff", ".aif", ".wma"]);

export type MediaEntry = { name: string; path: string };

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

export function albumFromFiles(rootName: string, relDir: string, files: MediaEntry[]): RawAlbum | null {
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

/** An album from chosen files in one folder. The id is the caller's, so two selections stay separate. */
export function selectionAlbum(relDir: string, files: MediaEntry[], id: string): RawAlbum | null {
  const album = albumFromFiles("Music", relDir, files);
  if (!album) return null;
  return { ...album, id };
}

import type { PlaybackSource } from "../types.ts";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (YOUTUBE_ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;
    const parts = url.pathname.split("/").filter(Boolean);
    const head = parts[0];
    const id = parts[1] ?? "";
    if ((head === "embed" || head === "shorts" || head === "live" || head === "v") && YOUTUBE_ID.test(id)) return id;
  }
  return null;
}

export function filePath(input: string): string | null {
  const text = input.trim();
  if (!text || text.length > 400) return null;
  if (/[\r\n\0]/.test(text)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
  return text;
}

export function playbackSource(kind: "youtube" | "file", text: string): PlaybackSource | null {
  if (kind === "youtube") {
    const id = youtubeId(text);
    return id ? { kind, id } : null;
  }
  const path = filePath(text);
  return path ? { kind, path } : null;
}

export function isPlaybackSource(value: unknown): value is PlaybackSource {
  if (!value || typeof value !== "object") return false;
  const source = value as PlaybackSource;
  if (source.kind === "youtube") return youtubeId(source.id) === source.id;
  if (source.kind === "file") return filePath(source.path) === source.path;
  return false;
}

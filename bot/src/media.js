import path from "node:path";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * A crate path is relative to the music folder. Absolute paths, URLs, and `..`
 * are refused so a YAML cannot point the bot at the rest of the disk.
 */
export function resolveMedia(root, rel) {
  if (typeof rel !== "string" || !rel.trim()) return { ok: false, reason: "Missing file path." };
  const text = rel.trim().replace(/\\/g, "/");
  if (text.length > 400 || /[\r\n\0]/.test(text)) return { ok: false, reason: "File path is not usable." };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || path.isAbsolute(text) || /^[a-zA-Z]:\//.test(text)) {
    return { ok: false, reason: "Use a path inside the music folder, not a URL or an absolute path." };
  }
  const parts = text.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return { ok: false, reason: "File path cannot climb out of the music folder." };
  }
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts);
  const relative = path.relative(base, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, reason: "File path cannot climb out of the music folder." };
  }
  return { ok: true, path: target, display: parts.join("/") };
}

export function planPlayback(track, { youtube }) {
  const source = track?.source;
  const name = track?.name ?? "That track";
  if (!source) return { ok: false, skip: true, reason: `${name} has no playback source.` };
  if (source.kind === "file") return { ok: true, kind: "file", path: source.path };
  if (source.kind === "youtube") {
    if (!youtube) {
      return { ok: false, skip: true, reason: `YouTube is off, so “${name}” will not play.` };
    }
    if (!YOUTUBE_ID.test(source.id ?? "")) {
      return { ok: false, skip: true, reason: `“${name}” does not have a usable video id.` };
    }
    return { ok: true, kind: "youtube", id: source.id };
  }
  return { ok: false, skip: true, reason: `“${name}” has a source this bot does not play.` };
}

export function playbackCounts(albums, youtube) {
  let file = 0;
  let video = 0;
  for (const album of albums) {
    for (const track of album.tracks) {
      if (track.source?.kind === "file") file += 1;
      else if (track.source?.kind === "youtube") video += 1;
    }
  }
  return { file, youtube: video, playable: file + (youtube ? video : 0) };
}

export function readySongs(albums, isUnlocked, youtube) {
  let ready = 0;
  let waiting = 0;
  for (const album of albums) {
    if (!isUnlocked(album.id)) continue;
    for (const track of album.tracks) {
      if (track.source?.kind === "file") ready += 1;
      else if (track.source?.kind === "youtube") {
        if (youtube) ready += 1;
        else waiting += 1;
      }
    }
  }
  return { ready, waiting };
}

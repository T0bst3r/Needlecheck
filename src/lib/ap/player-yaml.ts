import type { Album, PlaybackSource } from "../types.ts";
import { ITEM_BASE, LOCATION_BASE, idClash } from "./names.ts";
import { isPlaybackSource } from "./source.ts";

export type ExportReady =
  | { ok: false; reason: string }
  | { ok: true; albums: Album[]; promotedStarter: boolean };

/** A track the player turned on. An unset flag follows whether a source was already attached. */
export function trackIncluded(track: { included?: boolean; source?: PlaybackSource }): boolean {
  if (track.included === false) return false;
  if (track.included === true) return true;
  return isPlaybackSource(track.source);
}

/** Included, and it has a YouTube video or a file path. */
export function trackInWorld(track: { included?: boolean; source?: PlaybackSource }): boolean {
  return trackIncluded(track) && isPlaybackSource(track.source);
}

/** Albums that can actually be played. Tracks left off, or without a source, stay out of the world. */
export function exportableAlbums(crate: Album[]): ExportReady {
  const albums = crate
    .map((album) => ({ ...album, tracks: album.tracks.filter((track) => trackInWorld(track)) }))
    .filter((album) => album.tracks.length > 0);
  if (!albums.length) {
    return {
      ok: false,
      reason:
        "Nothing to export yet. Include a song and give it a YouTube video or a file path.",
    };
  }
  let promotedStarter = false;
  if (!albums.some((album) => album.starter)) {
    const first = albums[0]!;
    albums[0] = { ...first, starter: true };
    promotedStarter = true;
  }
  const itemClash = idClash(
    albums.map((album) => album.itemName),
    ITEM_BASE,
  );
  if (itemClash) return { ok: false, reason: itemClash };
  const locationClash = idClash(
    albums.flatMap((album) => album.tracks.map((track) => track.locationName)),
    LOCATION_BASE,
  );
  if (locationClash) return { ok: false, reason: locationClash };
  return { ok: true, albums, promotedStarter };
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function toPlayerYaml(albums: Album[], slotName: string): string {
  const slot = slotName.trim() || "DJ";
  const lines = [
    `name: ${quote(slot)}`,
    `description: ${quote("Crate written by Needlecheck. Albums and playback sources live in this file, not in the apworld.")}`,
    "game: Needlecheck",
    "Needlecheck:",
    "  crate:",
  ];
  for (const album of albums) {
    lines.push(`    - id: ${quote(album.id)}`);
    lines.push(`      name: ${quote(album.name)}`);
    lines.push(`      artist: ${quote(album.artist)}`);
    lines.push(`      starter: ${album.starter ? "true" : "false"}`);
    if (album.year) lines.push(`      year: ${album.year}`);
    if (album.artwork) lines.push(`      artwork: ${quote(album.artwork)}`);
    lines.push("      tracks:");
    for (const track of album.tracks) {
      if (!isPlaybackSource(track.source)) continue;
      lines.push(`        - id: ${quote(track.id)}`);
      lines.push(`          name: ${quote(track.name)}`);
      lines.push(`          artist: ${quote(track.artist)}`);
      lines.push(`          number: ${track.trackNumber}`);
      if (track.durationMs > 0) lines.push(`          duration_ms: ${track.durationMs}`);
      lines.push("          source:");
      if (track.source.kind === "youtube") {
        lines.push("            kind: youtube");
        lines.push(`            id: ${quote(track.source.id)}`);
      } else {
        lines.push("            kind: file");
        lines.push(`            path: ${quote(track.source.path)}`);
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}

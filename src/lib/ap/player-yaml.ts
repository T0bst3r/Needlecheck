import type { Album } from "../types.ts";
import { ITEM_BASE, LOCATION_BASE, idClash } from "./names.ts";
import { isPlaybackSource } from "./source.ts";

export type ExportReady =
  | { ok: false; reason: string }
  | { ok: true; albums: Album[]; promotedStarter: boolean };

/** Albums that can actually be played. Tracks without a source stay out of the world. */
export function exportableAlbums(crate: Album[]): ExportReady {
  const albums = crate
    .map((album) => ({ ...album, tracks: album.tracks.filter((track) => isPlaybackSource(track.source)) }))
    .filter((album) => album.tracks.length > 0);
  if (!albums.length) {
    return {
      ok: false,
      reason:
        "Nothing to export yet. Search an album, then attach a YouTube video or a file path to at least one track. Previews in the station are not a playback source.",
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

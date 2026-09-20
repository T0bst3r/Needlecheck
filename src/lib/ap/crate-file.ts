import type { Album } from "../types";

export function toCrateFile(crate: Album[]) {
  return {
    game: "Needlecheck" as const,
    version: 1 as const,
    albums: crate.map((album) => ({
      id: album.id,
      name: album.name,
      artist: album.artist,
      artwork: album.artwork,
      year: album.year,
      starter: album.starter,
      spotifyId: album.spotifyId,
      source: album.source,
      tracks: album.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        durationMs: t.durationMs,
        trackNumber: t.trackNumber,
        spotifyId: t.spotifyId,
      })),
    })),
  };
}

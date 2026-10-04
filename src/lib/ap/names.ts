import { apId, ITEM_BASE, LOCATION_BASE } from "./ids.ts";

const DASH = "—";

export function albumItemName(albumName: string, artist: string): string {
  return `Album - ${albumName} ${DASH} ${artist}`;
}

export function trackLocationName(trackName: string, albumName: string, artist: string): string {
  return `First Play - ${trackName} [${albumName} ${DASH} ${artist}]`;
}

type NameInput = {
  id: string;
  name: string;
  artist: string;
  tracks: Array<{ id: string; name: string }>;
};

export type NamedTrack = { locationName: string; locationId: number };
export type NamedAlbum = { itemName: string; itemId: number; tracks: NamedTrack[] };

function counts(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}

function unique(base: string, seen: Map<string, number>, suffix: string): string {
  return (seen.get(base) ?? 0) > 1 ? `${base} (${suffix})` : base;
}

/** Item and location names, then ids hashed from those names. Order-independent. */
export function nameAlbums(albums: NameInput[]): NamedAlbum[] {
  const albumBases = albums.map((album) => albumItemName(album.name, album.artist));
  const albumCounts = counts(albumBases);
  const itemNames = albums.map((album, index) => unique(albumBases[index]!, albumCounts, album.id));

  const drafts: Array<{ key: string; base: string; suffix: string }> = [];
  albums.forEach((album, albumIndex) => {
    album.tracks.forEach((track, trackIndex) => {
      drafts.push({
        key: `${albumIndex}:${trackIndex}`,
        base: trackLocationName(track.name, album.name, album.artist),
        suffix: `${album.id}/${track.id}`,
      });
    });
  });
  const locationCounts = counts(drafts.map((draft) => draft.base));
  const locations = new Map<string, NamedTrack>();
  for (const draft of drafts) {
    const locationName = unique(draft.base, locationCounts, draft.suffix);
    locations.set(draft.key, { locationName, locationId: apId(locationName, LOCATION_BASE) });
  }

  return albums.map((album, albumIndex) => ({
    itemName: itemNames[albumIndex]!,
    itemId: apId(itemNames[albumIndex]!, ITEM_BASE),
    tracks: album.tracks.map((_, trackIndex) => locations.get(`${albumIndex}:${trackIndex}`)!),
  }));
}

export function idClash(names: string[], base: number): string | null {
  const seen = new Map<number, string>();
  for (const name of names) {
    const id = apId(name, base);
    const previous = seen.get(id);
    if (previous && previous !== name) {
      return `"${previous}" and "${name}" hash into the same Archipelago id. Rename one of them.`;
    }
    seen.set(id, name);
  }
  return null;
}

export { ITEM_BASE, LOCATION_BASE };

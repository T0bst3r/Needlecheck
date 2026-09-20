import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { albumItemName, stableId, trackLocationName } from "./ids.js";

export function hydrateCrate(file) {
  const used = new Set();
  const albums = (file.albums ?? []).map((album) => {
    const itemName = albumItemName(album.name);
    const itemId = stableId(`item:${album.id}`, 1_000_000, used);
    const tracks = (album.tracks ?? []).map((t) => ({
      ...t,
      albumId: album.id,
      albumName: album.name,
      artwork: album.artwork,
      locationName: trackLocationName(t.name, album.name),
      locationId: stableId(`loc:${t.id}`, 3_000_000, used),
    }));
    return { ...album, itemId, itemName, starter: Boolean(album.starter), tracks };
  });
  return albums;
}

export function serializeCrate(albums) {
  return {
    game: "Needlecheck",
    version: 1,
    albums: albums.map((album) => ({
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

export function allTracks(crate) {
  return crate.flatMap((a) => a.tracks);
}

export function albumById(crate, id) {
  return crate.find((a) => a.id === id);
}

export function albumByItemName(crate, name) {
  return crate.find((a) => a.itemName === name);
}

export function trackById(crate, id) {
  for (const album of crate) {
    const t = album.tracks.find((x) => x.id === id);
    if (t) return t;
  }
  return undefined;
}

export function trackByLocationName(crate, name) {
  for (const album of crate) {
    const t = album.tracks.find((x) => x.locationName === name);
    if (t) return t;
  }
  return undefined;
}

export async function loadCrateFile(cratePath) {
  const raw = await readFile(cratePath, "utf8");
  return hydrateCrate(JSON.parse(raw));
}

export async function saveCrateFile(cratePath, crate) {
  await mkdir(path.dirname(cratePath), { recursive: true });
  await writeFile(cratePath, JSON.stringify(serializeCrate(crate), null, 2));
}

export function statePathFor(cratePath) {
  return path.join(path.dirname(cratePath), "state.json");
}

export async function loadState(cratePath) {
  try {
    const raw = await readFile(statePathFor(cratePath), "utf8");
    const json = JSON.parse(raw);
    return {
      unlockedAlbumIds: json.unlockedAlbumIds ?? [],
      playedTrackIds: json.playedTrackIds ?? [],
      checkedLocationIds: json.checkedLocationIds ?? [],
    };
  } catch {
    return { unlockedAlbumIds: [], playedTrackIds: [], checkedLocationIds: [] };
  }
}

export async function saveState(cratePath, state) {
  await mkdir(path.dirname(cratePath), { recursive: true });
  await writeFile(
    statePathFor(cratePath),
    JSON.stringify(
      {
        unlockedAlbumIds: [...state.unlockedAlbumIds],
        playedTrackIds: [...state.playedTrackIds],
        checkedLocationIds: [...state.checkedLocationIds],
      },
      null,
      2,
    ),
  );
}

export function starterIds(crate) {
  const marked = crate.filter((a) => a.starter).map((a) => a.id);
  if (marked.length) return marked;
  return crate[0] ? [crate[0].id] : [];
}

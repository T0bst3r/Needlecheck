import { nameAlbums } from "./ap/names";
import { FILLER_NAMES, REMOTE_ITEMS, REMOTE_PLAYERS, TRAP_NAMES, USEFUL_NAMES } from "./flavor";
import { mulberry32, pick, stableId } from "./rng";
import type { Album, ItemClass, Placement, RawAlbum, RemoteGift, Track } from "./types";

export function buildCrate(raw: RawAlbum[], starterIds: string[]): Album[] {
  const starters = starterIds.filter((id) => raw.some((album) => album.id === id));
  const effectiveStarters = starters.length ? starters : raw[0] ? [raw[0].id] : [];
  const named = nameAlbums(raw);

  return raw.map((album, index) => {
    const meta = named[index]!;
    const tracks: Track[] = album.tracks.map((track, trackIndex) => ({
      ...track,
      albumId: album.id,
      albumName: album.name,
      artwork: album.artwork,
      locationName: meta.tracks[trackIndex]!.locationName,
      locationId: meta.tracks[trackIndex]!.locationId,
    }));
    return {
      ...album,
      itemId: meta.itemId,
      itemName: meta.itemName,
      starter: effectiveStarters.includes(album.id),
      tracks,
    };
  });
}

export type GeneratedWorld = {
  placements: Record<number, Placement>;
  remoteGift: RemoteGift | null;
  unlockedAlbumIds: string[];
};

export function generateWorld(crate: Album[], seed: number): GeneratedWorld {
  const rand = mulberry32(seed);
  const used = new Set<number>([
    ...crate.map((a) => a.itemId),
    ...crate.flatMap((a) => a.tracks.map((t) => t.locationId)),
  ]);

  const starters = crate.filter((a) => a.starter);
  const unlockedAlbumIds = (starters.length ? starters : crate[0] ? [crate[0]] : []).map((a) => a.id);

  const poolAlbums = crate.filter((a) => !unlockedAlbumIds.includes(a.id));
  let giftAlbum: Album | null = null;
  const localAlbums = [...poolAlbums];
  if (localAlbums.length >= 3) {
    const idx = Math.floor(rand() * localAlbums.length);
    giftAlbum = localAlbums.splice(idx, 1)[0] ?? null;
  }

  const all = crate.flatMap((a) => a.tracks);
  const placements: Record<number, Placement> = {};
  const placedLoc = new Set<number>();

  const isAlbumPlaced = (album: Album) =>
    Object.values(placements).some((p) => p.itemId === album.itemId && p.destPlayer === "self");

  const reachable = () =>
    all.filter((t) => {
      const album = crate.find((a) => a.id === t.albumId);
      if (!album) return false;
      return unlockedAlbumIds.includes(album.id) || isAlbumPlaced(album);
    });

  const remainingAlbums = [...localAlbums];
  let guard = 0;
  while (remainingAlbums.length && guard++ < 40) {
    const reach = reachable()
      .filter((t) => !placedLoc.has(t.locationId))
      .sort((a, b) => a.trackNumber - b.trackNumber);
    if (!reach.length) break;
    const album = remainingAlbums.shift()!;
    const window = reach.slice(0, Math.max(1, Math.min(4, reach.length)));
    const loc = window[Math.floor(rand() * window.length)] ?? reach[0]!;
    placements[loc.locationId] = {
      locationId: loc.locationId,
      itemId: album.itemId,
      itemName: album.itemName,
      classification: "progression",
      destPlayer: "self",
    };
    placedLoc.add(loc.locationId);
  }

  const leftovers = all.filter((t) => !placedLoc.has(t.locationId));
  for (const album of remainingAlbums) {
    const loc = leftovers.shift();
    if (!loc) break;
    placements[loc.locationId] = {
      locationId: loc.locationId,
      itemId: album.itemId,
      itemName: album.itemName,
      classification: "progression",
      destPlayer: "self",
    };
    placedLoc.add(loc.locationId);
  }

  const empty = all.filter((t) => !placedLoc.has(t.locationId));
  const remoteCount = Math.min(8, Math.max(3, Math.floor(empty.length * 0.12)));
  for (let i = 0; i < remoteCount && empty.length; i++) {
    const loc = empty.shift()!;
    const player = pick(REMOTE_PLAYERS, rand);
    const item = pick(REMOTE_ITEMS, rand);
    placements[loc.locationId] = {
      locationId: loc.locationId,
      itemId: stableId(`remote:${loc.locationId}:${item}`, 4_000_000, used),
      itemName: item,
      classification: "filler",
      destPlayer: "remote",
      destName: player.name,
      destGame: player.game,
    };
    placedLoc.add(loc.locationId);
  }

  for (const loc of empty) {
    const roll = rand();
    let classification: ItemClass = "filler";
    let name: string = pick(FILLER_NAMES, rand);
    if (roll > 0.92) {
      classification = "trap";
      name = pick(TRAP_NAMES, rand);
    } else if (roll > 0.82) {
      classification = "useful";
      name = pick(USEFUL_NAMES, rand);
    }
    placements[loc.locationId] = {
      locationId: loc.locationId,
      itemId: stableId(`fill:${loc.locationId}:${name}`, 2_000_000, used),
      itemName: name,
      classification,
      destPlayer: "self",
    };
    placedLoc.add(loc.locationId);
  }

  const starterTrackCount = crate
    .filter((a) => unlockedAlbumIds.includes(a.id))
    .reduce((n, a) => n + a.tracks.length, 0);

  const remoteGift: RemoteGift | null = giftAlbum
    ? {
        itemId: giftAlbum.itemId,
        itemName: giftAlbum.itemName,
        albumId: giftAlbum.id,
        afterChecks: Math.max(4, Math.min(8, Math.ceil(starterTrackCount * 0.8))),
        granted: false,
      }
    : null;

  return { placements, remoteGift, unlockedAlbumIds };
}

export function allTracks(crate: Album[]): Track[] {
  return crate.flatMap((a) => a.tracks);
}

export function trackById(crate: Album[], id: string): Track | undefined {
  for (const a of crate) {
    const t = a.tracks.find((x) => x.id === id);
    if (t) return t;
  }
  return undefined;
}

export function albumById(crate: Album[], id: string): Album | undefined {
  return crate.find((a) => a.id === id);
}

export function albumByItemId(crate: Album[], itemId: number): Album | undefined {
  return crate.find((a) => a.itemId === itemId);
}

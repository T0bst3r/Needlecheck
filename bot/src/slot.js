const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function sourceOf(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "file" && typeof raw.path === "string" && raw.path.trim()) {
    return { kind: "file", path: raw.path.trim() };
  }
  if (raw.kind === "youtube" && typeof raw.id === "string" && YOUTUBE_ID.test(raw.id)) {
    return { kind: "youtube", id: raw.id };
  }
  return null;
}

/** Albums as Archipelago put them in slot_data. Names and ids are the seed's, not recomputed. */
export function parseSlotCrate(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.albums)) {
    throw new Error("This room did not send a Needlecheck crate. Generate the seed with the current apworld.");
  }
  const albums = [];
  for (const raw of data.albums) {
    if (!raw || typeof raw !== "object") continue;
    if (typeof raw.id !== "string" || typeof raw.item_id !== "number" || typeof raw.item_name !== "string") continue;
    const tracks = [];
    if (!Array.isArray(raw.tracks)) continue;
    for (const track of raw.tracks) {
      const source = sourceOf(track?.source);
      if (!source) continue;
      if (typeof track.id !== "string" || typeof track.name !== "string") continue;
      if (typeof track.location_id !== "number" || typeof track.location_name !== "string") continue;
      tracks.push({
        id: track.id,
        name: track.name,
        artist: typeof track.artist === "string" && track.artist.trim() ? track.artist.trim() : String(raw.artist ?? ""),
        albumId: raw.id,
        albumName: String(raw.name ?? ""),
        locationId: track.location_id,
        locationName: track.location_name,
        source,
      });
    }
    if (!tracks.length) continue;
    albums.push({
      id: raw.id,
      name: String(raw.name ?? ""),
      artist: String(raw.artist ?? ""),
      starter: Boolean(raw.starter),
      itemId: raw.item_id,
      itemName: raw.item_name,
      artwork: typeof raw.artwork === "string" ? raw.artwork : "",
      tracks,
    });
  }
  if (!albums.length) {
    throw new Error("The room's crate has no tracks with a file or a YouTube id.");
  }
  return albums;
}

export function allTracks(albums) {
  return albums.flatMap((album) => album.tracks);
}

export function albumByItemId(albums, itemId) {
  return albums.find((album) => album.itemId === itemId) ?? null;
}

export function trackByLocationId(albums, locationId) {
  return allTracks(albums).find((track) => track.locationId === locationId) ?? null;
}

export function starterIds(albums) {
  return albums.filter((album) => album.starter).map((album) => album.id);
}

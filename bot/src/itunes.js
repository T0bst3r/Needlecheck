function art600(url) {
  if (!url) return "";
  return url.replace("100x100bb", "600x600bb").replace("100x100", "600x600");
}

export async function searchItunesAlbums(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Catalog search failed");
  const json = await res.json();
  return (json.results ?? [])
    .filter((r) => r.collectionId && r.collectionName)
    .map((r) => ({
      id: String(r.collectionId),
      name: r.collectionName,
      artist: r.artistName,
      artwork: art600(r.artworkUrl100),
      year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) || null : null,
      source: "itunes",
    }));
}

export async function lookupItunesAlbum(id) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Album lookup failed");
  const json = await res.json();
  const rows = json.results ?? [];
  const album = rows.find((r) => r.collectionType === "Album" || r.wrapperType === "collection");
  const tracks = rows.filter((r) => r.wrapperType === "track");
  if (!album) throw new Error("Album not found");
  return {
    id: String(album.collectionId),
    name: album.collectionName,
    artist: album.artistName,
    artwork: art600(album.artworkUrl100),
    year: album.releaseDate ? Number(album.releaseDate.slice(0, 4)) || null : null,
    tracks: tracks
      .filter((t) => t.trackName)
      .map((t) => ({
        id: String(t.trackId),
        name: t.trackName,
        artist: t.artistName,
        durationMs: t.trackTimeMillis || 0,
        trackNumber: t.trackNumber || 0,
      }))
      .sort((a, b) => a.trackNumber - b.trackNumber),
    source: "itunes",
    starter: false,
  };
}

export async function searchCatalog(term) {
  const { searchSpotifyAlbums } = await import("./spotify.js");
  const { spotifyConfigured } = await import("./config.js");
  if (spotifyConfigured()) {
    try {
      const hits = await searchSpotifyAlbums(term);
      if (hits.length) return { source: "spotify", hits };
    } catch {
      /* fall through */
    }
  }
  return { source: "itunes", hits: await searchItunesAlbums(term) };
}

export async function lookupCatalog(id) {
  if (id.startsWith("sp:")) {
    const { lookupSpotifyAlbum } = await import("./spotify.js");
    return lookupSpotifyAlbum(id);
  }
  return lookupItunesAlbum(id);
}

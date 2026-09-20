import { config, spotifyConfigured } from "./config.js";

let cached = null;

async function token() {
  if (!spotifyConfigured()) throw new Error("Spotify is not configured");
  if (cached && cached.expires_at > Date.now() + 10_000) return cached.access_token;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Spotify auth failed");
  const json = await res.json();
  cached = { access_token: json.access_token, expires_at: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function spotifyGet(path) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return res.json();
}

export async function searchSpotifyAlbums(term) {
  const data = await spotifyGet(`/search?type=album&limit=8&q=${encodeURIComponent(term)}`);
  return (data.albums?.items ?? []).map((a) => ({
    id: `sp:${a.id}`,
    name: a.name,
    artist: a.artists?.map((x) => x.name).join(", ") ?? "",
    artwork: a.images?.[0]?.url ?? "",
    year: a.release_date ? Number(a.release_date.slice(0, 4)) || null : null,
    source: "spotify",
  }));
}

export async function lookupSpotifyAlbum(id) {
  const spotifyId = id.startsWith("sp:") ? id.slice(3) : id;
  const album = await spotifyGet(`/albums/${encodeURIComponent(spotifyId)}`);
  const tracks = [...(album.tracks?.items ?? [])];
  let next = album.tracks?.next ?? null;
  while (next) {
    const page = await fetch(next, { headers: { Authorization: `Bearer ${await token()}` } });
    if (!page.ok) break;
    const json = await page.json();
    tracks.push(...(json.items ?? []));
    next = json.next ?? null;
  }
  const artist = album.artists?.map((x) => x.name).join(", ") ?? "";
  return {
    id: `sp:${album.id}`,
    name: album.name,
    artist,
    artwork: album.images?.[0]?.url ?? "",
    year: album.release_date ? Number(album.release_date.slice(0, 4)) || null : null,
    tracks: tracks
      .filter((t) => t.name)
      .map((t) => ({
        id: `sp:${t.id}`,
        name: t.name,
        artist: t.artists?.map((x) => x.name).join(", ") || artist,
        durationMs: t.duration_ms || 0,
        trackNumber: t.track_number || 0,
        spotifyId: t.id,
      }))
      .sort((a, b) => a.trackNumber - b.trackNumber),
    spotifyId: album.id,
    source: "spotify",
    starter: false,
  };
}

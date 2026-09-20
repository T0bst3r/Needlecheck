import { env } from "./env.server";
import type { RawAlbum, RawTrack } from "./types";

type Token = { access_token: string; expires_at: number };
let cached: Token | null = null;

export function spotifyConfigured(): boolean {
  return Boolean(env("SPOTIFY_CLIENT_ID") && env("SPOTIFY_CLIENT_SECRET"));
}

async function token(): Promise<string> {
  const id = env("SPOTIFY_CLIENT_ID");
  const secret = env("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Spotify is not configured");
  if (cached && cached.expires_at > Date.now() + 10_000) return cached.access_token;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Spotify auth failed");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { access_token: json.access_token, expires_at: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function spotifyGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return (await res.json()) as T;
}

type SpotifyAlbumHit = {
  id: string;
  name: string;
  release_date?: string;
  images?: Array<{ url: string }>;
  artists?: Array<{ name: string }>;
};

type SpotifyTrackHit = {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url?: string | null;
  artists?: Array<{ name: string }>;
};

export type CatalogHit = {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  year: number | null;
  source: "spotify" | "itunes";
};

export async function searchSpotifyAlbums(term: string): Promise<CatalogHit[]> {
  const data = await spotifyGet<{ albums?: { items?: SpotifyAlbumHit[] } }>(
    `/search?type=album&limit=12&q=${encodeURIComponent(term)}`,
  );
  return (data.albums?.items ?? []).map((a) => ({
    id: `sp:${a.id}`,
    name: a.name,
    artist: a.artists?.map((x) => x.name).join(", ") ?? "",
    artwork: a.images?.[0]?.url ?? "",
    year: a.release_date ? Number(a.release_date.slice(0, 4)) || null : null,
    source: "spotify" as const,
  }));
}

export async function lookupSpotifyAlbum(id: string): Promise<RawAlbum> {
  const spotifyId = id.startsWith("sp:") ? id.slice(3) : id;
  const album = await spotifyGet<{
    id: string;
    name: string;
    release_date?: string;
    images?: Array<{ url: string }>;
    artists?: Array<{ name: string }>;
    tracks?: { items?: SpotifyTrackHit[]; next?: string | null };
  }>(`/albums/${encodeURIComponent(spotifyId)}`);

  const tracks: SpotifyTrackHit[] = [...(album.tracks?.items ?? [])];
  let next = album.tracks?.next ?? null;
  while (next) {
    const page = await fetch(next, { headers: { Authorization: `Bearer ${await token()}` } });
    if (!page.ok) break;
    const json = (await page.json()) as { items?: SpotifyTrackHit[]; next?: string | null };
    tracks.push(...(json.items ?? []));
    next = json.next ?? null;
  }

  const artist = album.artists?.map((x) => x.name).join(", ") ?? "";
  const rawTracks: RawTrack[] = tracks
    .filter((t) => t.name)
    .map((t) => ({
      id: `sp:${t.id}`,
      name: t.name,
      artist: t.artists?.map((x) => x.name).join(", ") || artist,
      previewUrl: t.preview_url ?? null,
      durationMs: t.duration_ms || 30000,
      trackNumber: t.track_number || 0,
      spotifyId: t.id,
    }))
    .sort((a, b) => a.trackNumber - b.trackNumber);

  return {
    id: `sp:${album.id}`,
    name: album.name,
    artist,
    artwork: album.images?.[0]?.url ?? "",
    year: album.release_date ? Number(album.release_date.slice(0, 4)) || null : null,
    tracks: rawTracks,
    spotifyId: album.id,
    source: "spotify",
  };
}

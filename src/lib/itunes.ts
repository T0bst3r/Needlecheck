import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RawAlbum, RawTrack } from "./types";

type ItunesAlbum = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100?: string;
  releaseDate?: string;
  wrapperType?: string;
  collectionType?: string;
};

type ItunesTrack = {
  wrapperType?: string;
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackNumber?: number;
};

function art600(url?: string): string {
  if (!url) return "";
  return url.replace("100x100bb", "600x600bb").replace("100x100", "600x600");
}

function toRawAlbum(album: ItunesAlbum, tracks: ItunesTrack[]): RawAlbum {
  const rawTracks: RawTrack[] = tracks
    .filter((t) => t.wrapperType === "track" && t.trackName)
    .map((t) => ({
      id: String(t.trackId),
      name: t.trackName,
      artist: t.artistName,
      previewUrl: t.previewUrl ?? null,
      durationMs: t.trackTimeMillis || 30000,
      trackNumber: t.trackNumber || 0,
    }))
    .sort((a, b) => a.trackNumber - b.trackNumber);

  return {
    id: String(album.collectionId),
    name: album.collectionName,
    artist: album.artistName,
    artwork: art600(album.artworkUrl100),
    year: album.releaseDate ? Number(album.releaseDate.slice(0, 4)) || null : null,
    tracks: rawTracks,
    source: "itunes",
  };
}

export async function searchItunesAlbums(term: string) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=12`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Catalog search failed");
  const json = (await res.json()) as { results?: ItunesAlbum[] };
  return (json.results ?? [])
    .filter((r) => r.collectionId && r.collectionName)
    .map((r) => ({
      id: String(r.collectionId),
      name: r.collectionName,
      artist: r.artistName,
      artwork: art600(r.artworkUrl100),
      year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) || null : null,
      source: "itunes" as const,
    }));
}

export async function lookupItunesAlbum(id: string): Promise<RawAlbum> {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Album lookup failed");
  const json = (await res.json()) as { results?: Array<ItunesAlbum | ItunesTrack> };
  const rows = json.results ?? [];
  const album = rows.find((r) => (r as ItunesAlbum).collectionType === "Album" || (r as ItunesAlbum).wrapperType === "collection") as
    | ItunesAlbum
    | undefined;
  const tracks = rows.filter((r) => (r as ItunesTrack).wrapperType === "track") as ItunesTrack[];
  if (!album) throw new Error("Album not found");
  return toRawAlbum(album, tracks);
}

export const searchAlbums = createServerFn({ method: "POST" })
  .validator(z.object({ term: z.string().min(1).max(80) }))
  .handler(async ({ data }) => searchItunesAlbums(data.term));

export const lookupAlbum = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => lookupItunesAlbum(data.id));

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupItunesAlbum, searchItunesAlbums } from "./itunes";

export const catalogStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { spotifyConfigured } = await import("./spotify");
  return { spotify: spotifyConfigured() };
});

export const searchCatalog = createServerFn({ method: "POST" })
  .validator(z.object({ term: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { searchSpotifyAlbums, spotifyConfigured } = await import("./spotify");
    if (spotifyConfigured()) {
      try {
        const hits = await searchSpotifyAlbums(data.term);
        if (hits.length) return { source: "spotify" as const, hits };
      } catch {
        /* fall through */
      }
    }
    const hits = await searchItunesAlbums(data.term);
    return { source: "itunes" as const, hits };
  });

export const lookupCatalog = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (data.id.startsWith("sp:")) {
      const { lookupSpotifyAlbum } = await import("./spotify");
      return lookupSpotifyAlbum(data.id);
    }
    return lookupItunesAlbum(data.id);
  });

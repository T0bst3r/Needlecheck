import { useEffect, useState, type FormEvent } from "react";
import { Lock, Search, Star, Trash2, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogStatus, lookupCatalog, searchCatalog } from "@/lib/catalog";
import { useStation } from "@/lib/store";
import { cn } from "@/lib/utils";

type Hit = { id: string; name: string; artist: string; artwork: string; year: number | null; source?: string };

export function CrateView() {
  const crate = useStation((s) => s.crate);
  const unlocked = useStation((s) => s.unlockedAlbumIds);
  const played = useStation((s) => s.playedTrackIds);
  const addAlbum = useStation((s) => s.addAlbum);
  const removeAlbum = useStation((s) => s.removeAlbum);
  const toggleStarter = useStation((s) => s.toggleStarter);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"spotify" | "itunes" | null>(null);
  const [spotify, setSpotify] = useState(false);

  useEffect(() => {
    void catalogStatus().then((s) => setSpotify(s.spotify)).catch(() => undefined);
  }, []);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    setBusy(true);
    setError("");
    try {
      const results = await searchCatalog({ data: { term: term.trim() } });
      setHits(results.hits);
      setSource(results.source);
      if (!results.hits.length) setError("No albums matched that search.");
    } catch {
      setError("Catalog search failed. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function add(id: string) {
    setBusy(true);
    setError("");
    try {
      const album = await lookupCatalog({ data: { id } });
      addAlbum(album);
      setHits((h) => h.filter((x) => x.id !== id));
    } catch {
      setError("Could not load that album's tracks.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h2 className="font-display text-2xl font-medium tracking-tight">The crate</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Build the Archipelago world here. Albums you add become items; each track is a first-play location. Star a
          starter for sphere 0, then download the apworld from World. Nothing is configured in the Archipelago options
          page.
        </p>
        <p className="mt-2 text-xs text-subtle">
          {spotify ? "Searching Spotify." : "Spotify credentials are not set — searching the public catalog instead."}
        </p>
      </header>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={spotify ? "Search Spotify — artist or album" : "Search the catalog — artist or album"}
            className="pl-10"
            aria-label="Search albums"
          />
        </div>
        <Button type="submit" disabled={busy}>
          Search
        </Button>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {source && hits.length ? (
        <p className="text-xs text-subtle">{source === "spotify" ? "Spotify results" : "Catalog results"}</p>
      ) : null}

      {hits.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {hits.map((hit) => {
            const inCrate = crate.some((a) => a.id === hit.id);
            return (
              <li key={hit.id} className="rounded-lg bg-surface p-2 shadow-[var(--shadow-border)]">
                <img
                  src={hit.artwork}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                />
                <p className="mt-2 truncate text-sm text-fg">{hit.name}</p>
                <p className="truncate text-xs text-muted">{hit.artist}</p>
                <Button
                  size="sm"
                  variant={inCrate ? "secondary" : "default"}
                  className="mt-2 w-full"
                  disabled={inCrate || busy}
                  onClick={() => add(hit.id)}
                >
                  {inCrate ? "In crate" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
        {crate.map((album) => {
          const on = unlocked.includes(album.id);
          const done = album.tracks.filter((t) => played.includes(t.id)).length;
          return (
            <li key={album.id} className="flex items-center gap-3 p-3">
              <img
                src={album.artwork}
                alt=""
                className={cn(
                  "size-14 rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10",
                  !on && "opacity-50",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{album.name}</p>
                <p className="truncate text-xs text-muted">
                  {album.artist}
                  {album.year ? ` · ${album.year}` : ""}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  {on ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                  <span className="tabular-nums">
                    {done}/{album.tracks.length} first plays
                  </span>
                  {album.starter ? <Badge variant="accent">starter</Badge> : null}
                  {on && !album.starter ? <Badge variant="check">unlocked</Badge> : null}
                  {album.source === "spotify" ? <Badge>spotify</Badge> : null}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={album.starter ? "Unset starter" : "Set as starter"}
                  onClick={() => toggleStarter(album.id)}
                >
                  <Star className={cn("size-4", album.starter && "fill-accent text-accent")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${album.name}`}
                  onClick={() => removeAlbum(album.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

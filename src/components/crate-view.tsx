import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Lock, Search, Star, Trash2, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogStatus, lookupCatalog, searchCatalog } from "@/lib/catalog";
import { isPlaybackSource, playbackSource } from "@/lib/ap/source";
import { useStation } from "@/lib/store";
import type { PlaybackSource, RawAlbum, RawTrack } from "@/lib/types";
import { cn } from "@/lib/utils";

type Hit = { id: string; name: string; artist: string; artwork: string; year: number | null; source?: string };
type Kind = "youtube" | "file";

export function CrateView() {
  const crate = useStation((s) => s.crate);
  const unlocked = useStation((s) => s.unlockedAlbumIds);
  const played = useStation((s) => s.playedTrackIds);
  const addAlbum = useStation((s) => s.addAlbum);
  const removeAlbum = useStation((s) => s.removeAlbum);
  const toggleStarter = useStation((s) => s.toggleStarter);
  const setTrackSource = useStation((s) => s.setTrackSource);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<"spotify" | "itunes" | null>(null);
  const [spotify, setSpotify] = useState(false);
  const [draft, setDraft] = useState<RawAlbum | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void catalogStatus().then((status) => setSpotify(status.spotify)).catch(() => undefined);
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!term.trim()) return;
    setBusy(true);
    setError("");
    try {
      const results = await searchCatalog({ data: { term: term.trim() } });
      setHits(results.hits);
      setCatalog(results.source);
      if (!results.hits.length) setError("No albums matched that search.");
    } catch {
      setError("Catalog search failed. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(id: string) {
    setBusy(true);
    setError("");
    try {
      const album = await lookupCatalog({ data: { id } });
      setDraft(album);
    } catch {
      setError("Could not load that album's tracks.");
    } finally {
      setBusy(false);
    }
  }

  function addDraft(tracks: RawTrack[]) {
    if (!draft) return;
    addAlbum({ ...draft, tracks });
    setDraft(null);
    setHits((current) => current.filter((hit) => hit.id !== draft.id));
  }

  const readyTracks = crate.reduce((sum, album) => sum + album.tracks.filter((track) => isPlaybackSource(track.source)).length, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h2 className="font-display text-2xl font-medium tracking-tight">The crate</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Search for the album, then attach a YouTube video or a file path to each track that should be a location.
          Tracks without a source stay out of the world. Star one album to start unlocked.
        </p>
        <p className="mt-2 text-xs text-subtle">
          {spotify ? "Searching Spotify." : "Spotify credentials are not set — searching the public catalog instead."}{" "}
          {readyTracks} {readyTracks === 1 ? "track is" : "tracks are"} ready for the YAML. The station still plays short
          previews only.
        </p>
      </header>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
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
      {catalog && hits.length ? (
        <p className="text-xs text-subtle">{catalog === "spotify" ? "Spotify results" : "Catalog results"}</p>
      ) : null}

      {hits.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {hits.map((hit) => {
            const inCrate = crate.some((album) => album.id === hit.id);
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
                  onClick={() => void choose(hit.id)}
                >
                  {inCrate ? "In crate" : "Choose tracks"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {draft ? (
        <DraftAlbum
          album={draft}
          busy={busy}
          onCancel={() => setDraft(null)}
          onAdd={addDraft}
        />
      ) : null}

      <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
        {crate.map((album) => {
          const on = unlocked.includes(album.id);
          const done = album.tracks.filter((track) => played.includes(track.id)).length;
          const sourced = album.tracks.filter((track) => isPlaybackSource(track.source)).length;
          const open = openId === album.id;
          return (
            <li key={album.id}>
              <div className="flex items-center gap-3 p-3">
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
                      {done}/{album.tracks.length} played
                    </span>
                    <Badge variant={sourced === 0 ? "warn" : sourced === album.tracks.length ? "check" : "default"}>
                      {sourced}/{album.tracks.length} in the world
                    </Badge>
                    {album.starter ? <Badge variant="accent">starter</Badge> : null}
                    {album.source === "spotify" ? <Badge>spotify</Badge> : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-expanded={open}
                    aria-label={open ? `Hide tracks on ${album.name}` : `Edit sources on ${album.name}`}
                    onClick={() => setOpenId(open ? null : album.id)}
                  >
                    <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={album.starter ? "Unset starter" : "Set as starter"}
                    onClick={() => toggleStarter(album.id)}
                  >
                    <Star className={cn("size-4", album.starter && "fill-accent text-accent")} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${album.name}`} onClick={() => removeAlbum(album.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {open ? (
                <ul className="border-t border-border px-3 pb-2">
                  {album.tracks.map((track) => (
                    <li key={track.id} className="border-b border-border py-3 last:border-b-0">
                      <p className="text-sm text-fg">
                        <span className="tabular-nums text-subtle">{track.trackNumber}.</span> {track.name}
                      </p>
                      <SourceFields
                        name={track.name}
                        initial={track.source}
                        onChange={(source) => setTrackSource(album.id, track.id, source)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DraftAlbum({
  album,
  busy,
  onCancel,
  onAdd,
}: {
  album: RawAlbum;
  busy: boolean;
  onCancel: () => void;
  onAdd: (tracks: RawTrack[]) => void;
}) {
  const [kinds, setKinds] = useState<Record<string, Kind>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [missed, setMissed] = useState(false);
  const sources = useRef<Record<string, PlaybackSource | undefined>>({});

  const chosen = album.tracks.flatMap((track) => {
    const source = sources.current[track.id] ?? playbackSource(kinds[track.id] ?? "youtube", texts[track.id] ?? "");
    return source ? [{ ...track, source }] : [];
  });
  const blocked = album.tracks.some((track) => invalid[track.id]);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-start gap-3">
        <img src={album.artwork} alt="" className="size-16 rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium text-fg">{album.name}</h3>
          <p className="truncate text-sm text-muted">{album.artist}</p>
          <p className="mt-1 text-xs text-subtle">
            {chosen.length} of {album.tracks.length} tracks will be added. A source is a YouTube video or a path such
            as music/so-what.mp3. Nothing is uploaded.
          </p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {album.tracks.map((track) => (
          <li key={track.id} className="py-3">
            <p className="text-sm text-fg">
              <span className="tabular-nums text-subtle">{track.trackNumber}.</span> {track.name}
            </p>
            <SourceFields
              name={track.name}
              initial={undefined}
              onChange={(source) => {
                sources.current[track.id] = source;
                setKinds((current) => ({ ...current, [track.id]: source?.kind ?? current[track.id] ?? "youtube" }));
                setTexts((current) => ({
                  ...current,
                  [track.id]: source?.kind === "file" ? source.path : source?.kind === "youtube" ? source.id : "",
                }));
                setInvalid((current) => ({ ...current, [track.id]: false }));
              }}
              onInvalid={(bad) => setInvalid((current) => ({ ...current, [track.id]: bad }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || blocked}
          onClick={() => {
            const tracks = album.tracks.flatMap((track) => {
              const source = sources.current[track.id];
              return source ? [{ ...track, source }] : [];
            });
            if (!tracks.length) {
              setMissed(true);
              return;
            }
            onAdd(tracks);
          }}
        >
          Add {chosen.length} {chosen.length === 1 ? "track" : "tracks"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {blocked ? <p className="mt-2 text-sm text-danger">One of those sources is not a YouTube video or a file path.</p> : null}
      {missed && !chosen.length ? (
        <p className="mt-2 text-sm text-danger">Attach a YouTube video or a file path to at least one track.</p>
      ) : null}
    </section>
  );
}

function SourceFields({
  name,
  initial,
  onChange,
  onInvalid,
}: {
  name: string;
  initial?: PlaybackSource;
  onChange: (source: PlaybackSource | undefined) => void;
  onInvalid?: (invalid: boolean) => void;
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "youtube");
  const [text, setText] = useState(initial?.kind === "file" ? initial.path : initial?.kind === "youtube" ? initial.id : "");
  const [invalid, setInvalid] = useState(false);

  function commit(nextKind: Kind, nextText: string) {
    if (!nextText.trim()) {
      setInvalid(false);
      onInvalid?.(false);
      onChange(undefined);
      return;
    }
    const source = playbackSource(nextKind, nextText);
    if (!source) {
      setInvalid(true);
      onInvalid?.(true);
      return;
    }
    setInvalid(false);
    onInvalid?.(false);
    onChange(source);
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2" role="group" aria-label={`Playback source for ${name}`}>
        <Button
          type="button"
          variant={kind === "youtube" ? "default" : "secondary"}
          aria-pressed={kind === "youtube"}
          onClick={() => {
            setKind("youtube");
            commit("youtube", text);
          }}
        >
          YouTube
        </Button>
        <Button
          type="button"
          variant={kind === "file" ? "default" : "secondary"}
          aria-pressed={kind === "file"}
          onClick={() => {
            setKind("file");
            commit("file", text);
          }}
        >
          File
        </Button>
      </div>
      <Input
        value={text}
        aria-label={kind === "youtube" ? `YouTube video for ${name}` : `File path for ${name}`}
        placeholder={kind === "youtube" ? "https://youtu.be/… or a video id" : "music/artist/track.mp3"}
        onChange={(event) => {
          setText(event.target.value);
          if (invalid) setInvalid(false);
        }}
        onBlur={() => commit(kind, text)}
      />
      {invalid ? (
        <p className="text-xs text-danger">
          {kind === "youtube" ? "Use an 11-character video id or a YouTube URL." : "Use a file path, not a web address."}
        </p>
      ) : null}
    </div>
  );
}

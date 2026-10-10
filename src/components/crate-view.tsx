import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Search, Star, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportableAlbums, trackIncluded, trackInWorld } from "@/lib/ap/player-yaml";
import { isPlaybackSource, playbackSource } from "@/lib/ap/source";
import { catalogStatus, lookupCatalog, searchCatalog } from "@/lib/catalog";
import { useStation } from "@/lib/store";
import type { PlaybackSource, RawAlbum, RawTrack } from "@/lib/types";
import { cn } from "@/lib/utils";

type Hit = { id: string; name: string; artist: string; artwork: string; year: number | null; source?: string };
type Kind = "youtube" | "file";

export function CrateView() {
  const crate = useStation((s) => s.crate);
  const addAlbum = useStation((s) => s.addAlbum);
  const mergeAlbum = useStation((s) => s.mergeAlbum);
  const removeAlbum = useStation((s) => s.removeAlbum);
  const toggleStarter = useStation((s) => s.toggleStarter);
  const setTrackSource = useStation((s) => s.setTrackSource);
  const setTrackIncluded = useStation((s) => s.setTrackIncluded);
  const slot = useStation((s) => s.live.slot);
  const setLive = useStation((s) => s.setLive);
  const exportPack = useStation((s) => s.exportPack);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<"spotify" | "itunes" | null>(null);
  const [spotify, setSpotify] = useState(false);
  const [draft, setDraft] = useState<RawAlbum | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void catalogStatus().then((status) => setSpotify(status.spotify)).catch(() => undefined);
  }, []);

  const ready = exportableAlbums(crate);
  const readyTracks = ready.ok ? ready.albums.reduce((sum, album) => sum + album.tracks.length, 0) : 0;

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
    const existing = useStation.getState().crate.some((album) => album.id === id);
    setBusy(true);
    setLoadingId(id);
    setError("");
    try {
      const album = await lookupCatalog({ data: { id } });
      if (existing) {
        mergeAlbum(album);
        setOpenId(id);
        setDraft(null);
        return;
      }
      setDraft(album);
    } catch {
      setError("Could not load that album's tracks.");
    } finally {
      setBusy(false);
      setLoadingId(null);
    }
  }

  function addDraft(tracks: RawTrack[]) {
    if (!draft) return;
    addAlbum({ ...draft, tracks });
    setDraft(null);
    setHits((current) => current.filter((hit) => hit.id !== draft.id));
    setOpenId(draft.id);
  }

  function download() {
    if (!ready.ok) return;
    const note = ready.promotedStarter
      ? `Downloaded needlecheck-world.zip. ${ready.albums[0]!.name} starts unlocked, because no starred album had a source.`
      : "Downloaded needlecheck-world.zip.";
    exportPack();
    setNotice(note);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h2 className="font-display text-2xl font-medium tracking-tight">The crate</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Search for an album, then tick the songs that should be locations. A song stays out until it is ticked and has a
          YouTube video or a file path. Star one album to start unlocked.
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
                  disabled={busy}
                  onClick={() => void choose(hit.id)}
                >
                  {loadingId === hit.id ? "Loading…" : inCrate ? "Edit songs" : "Choose tracks"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Dialog.Root open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(40rem,calc(100dvh-2rem))] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {draft ? (
              <DraftAlbum
                key={draft.id}
                album={draft}
                busy={busy}
                onCancel={() => setDraft(null)}
                onAdd={addDraft}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {crate.length ? (
        <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
          {crate.map((album) => {
            const sourced = album.tracks.filter((track) => trackInWorld(track)).length;
            const open = openId === album.id;
            return (
              <li key={album.id}>
                <div className="flex items-center gap-3 p-3">
                  <img
                    src={album.artwork}
                    alt=""
                    className="size-14 rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{album.name}</p>
                    <p className="truncate text-xs text-muted">
                      {album.artist}
                      {album.year ? ` · ${album.year}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                      <Badge variant={sourced === 0 ? "warn" : sourced === album.tracks.length ? "check" : "default"}>
                        {sourced}/{album.tracks.length} in the world
                      </Badge>
                      {album.starter ? <Badge variant="accent">starter</Badge> : null}
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
                      aria-label={album.starter ? `Unset starter on ${album.name}` : `Set ${album.name} as starter`}
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
                    {album.tracks.map((track) => {
                      const on = trackIncluded(track);
                      const key = `${album.id}/${track.id}`;
                      const editing = editingId === key;
                      return (
                        <li key={track.id} className="border-b border-border py-3 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="size-4 shrink-0 accent-current"
                              checked={on}
                              aria-label={`Include ${track.name}`}
                              onChange={(event) => {
                                setTrackIncluded(album.id, track.id, event.target.checked);
                                if (event.target.checked && !isPlaybackSource(track.source)) setEditingId(key);
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-fg">
                                <span className="tabular-nums text-subtle">{track.trackNumber}.</span> {track.name}
                              </p>
                              {isPlaybackSource(track.source) ? (
                                <p className="truncate text-xs text-subtle">
                                  {track.source.kind === "youtube" ? track.source.id : track.source.path}
                                </p>
                              ) : on ? (
                                <p className="text-xs text-danger">Needs a source</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-expanded={editing}
                              onClick={() => setEditingId(editing ? null : key)}
                            >
                              {editing ? "Hide" : "Source"}
                            </Button>
                          </div>
                          {editing ? (
                            <SourceFields
                              name={track.name}
                              initial={track.source}
                              onChange={(source) => setTrackSource(album.id, track.id, source)}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-8 text-center text-sm text-muted shadow-[var(--shadow-border)]">
          Nothing in the crate yet. Search for an album, then choose its tracks.
        </p>
      )}

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h3 className="text-lg font-medium text-fg">Download world pack</h3>
        <p className="mt-1 text-sm text-muted">
          The zip is a generic apworld plus Needlecheck.yaml. The slot name is <span className="font-mono">name:</span> in
          that file.
        </p>
        <label className="mt-4 block max-w-sm text-xs text-subtle">
          Slot name
          <Input className="mt-1" value={slot} onChange={(event) => setLive({ slot: event.target.value })} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={download} disabled={!ready.ok}>
            Download world pack
          </Button>
          <p className="text-sm text-muted">
            {ready.ok
              ? `${readyTracks} ${readyTracks === 1 ? "track" : "tracks"} across ${ready.albums.length} ${ready.albums.length === 1 ? "album" : "albums"}.`
              : ready.reason}
          </p>
        </div>
        {ready.ok && ready.promotedStarter ? (
          <p className="mt-3 text-sm text-muted">No album is starred. The first one will start unlocked.</p>
        ) : null}
        {notice ? <p className="mt-3 text-sm text-fg">{notice}</p> : null}
      </section>
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
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const sources = useRef<Record<string, PlaybackSource | undefined>>({});
  const blocked = album.tracks.some((track) => invalid[track.id]);
  const chosen = album.tracks.filter((track) => sources.current[track.id]).length;

  return (
    <>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <img src={album.artwork} alt="" className="size-16 rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="truncate text-lg font-medium text-fg">{album.name}</Dialog.Title>
          <Dialog.Description className="truncate text-sm text-muted">{album.artist}</Dialog.Description>
          <p className="mt-1 text-xs text-subtle">
            A source is a YouTube video or a path such as music/so-what.mp3. Songs you leave blank stay on the album,
            unticked, so you can turn them on later.
          </p>
        </div>
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </Dialog.Close>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-4">
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
                setInvalid((current) => ({ ...current, [track.id]: false }));
              }}
              onInvalid={(bad) => setInvalid((current) => ({ ...current, [track.id]: bad }))}
            />
          </li>
        ))}
      </ul>
      <div className="border-t border-border p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || blocked}
            onClick={() => {
              onAdd(
                album.tracks.map((track) => {
                  const source = sources.current[track.id];
                  return { ...track, source, included: Boolean(source) };
                }),
              );
            }}
          >
            Add album{chosen ? ` · ${chosen} on` : ""}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {blocked ? <p className="mt-2 text-sm text-danger">One of those sources is not a YouTube video or a file path.</p> : null}
      </div>
    </>
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

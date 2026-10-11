import { useEffect, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { folderAsAlbum, listMedia } from "@/lib/media";
import { selectionAlbum } from "@/lib/media-names";
import { useStation } from "@/lib/store";
import type { RawAlbum } from "@/lib/types";
import { uid } from "@/lib/utils";

type Entry = { name: string; path: string };

export function LibraryBrowser({
  onPickFile,
}: {
  onPickFile?: (path: string) => void;
}) {
  const upsertLocalAlbums = useStation((s) => s.upsertLocalAlbums);
  const [path, setPath] = useState("");
  const [dirs, setDirs] = useState<Entry[]>([]);
  const [files, setFiles] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancel = false;
    setBusy(true);
    void listMedia({ data: { path } })
      .then((result) => {
        if (cancel) return;
        if (!result.ok) {
          setError(result.reason);
          setDirs([]);
          setFiles([]);
          return;
        }
        setError("");
        setDirs(result.dirs);
        setFiles(result.files);
      })
      .catch(() => {
        if (!cancel) setError("Could not read that folder.");
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [path]);

  const needle = filter.trim().toLowerCase();
  const shownDirs = needle ? dirs.filter((entry) => entry.name.toLowerCase().includes(needle)) : dirs;
  const shownFiles = needle ? files.filter((entry) => entry.name.toLowerCase().includes(needle)) : files;
  const crumbs = path ? path.split("/") : [];

  function openDir(next: string) {
    setPath(next);
    setFilter("");
    setPicked(new Set());
  }

  function togglePick(itemPath: string, on: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(itemPath);
      else next.delete(itemPath);
      return next;
    });
  }

  async function addSelected() {
    const chosenFiles = files.filter((file) => picked.has(file.path));
    const chosenDirs = dirs.filter((dir) => picked.has(dir.path));
    if (!chosenFiles.length && !chosenDirs.length) {
      setError("Select a song or a folder.");
      return;
    }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const albums: RawAlbum[] = [];
      const fromFiles = selectionAlbum(path, chosenFiles, uid("album"));
      if (fromFiles) albums.push(fromFiles);
      let truncated = false;
      const skipped: string[] = [];
      for (const dir of chosenDirs) {
        const result = await folderAsAlbum({ data: { path: dir.path, recursive: true } });
        if (!result.ok) {
          skipped.push(dir.name);
          continue;
        }
        albums.push(...result.albums);
        if (result.truncated) truncated = true;
      }
      if (!albums.length) {
        setError(skipped.length ? `Nothing to add from ${skipped.join(", ")}.` : "Select a song or a folder.");
        return;
      }
      const counts = upsertLocalAlbums(albums);
      const names = albums.length === 1 ? albums[0]!.name : `${counts.added + counts.merged + counts.same} albums`;
      const verb = counts.added && !counts.merged && !counts.same ? "Added" : counts.added || counts.merged ? "Updated" : "Already had";
      const skip = skipped.length ? ` Skipped ${skipped.join(", ")}.` : "";
      const tail = truncated ? " Stopped before every folder was added." : "";
      setNotice(`${verb} ${names}.${skip}${tail}`);
      setPicked(new Set());
    } catch {
      setError("Could not add that selection.");
    } finally {
      setBusy(false);
    }
  }

  async function addFolder(recursive: boolean) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await folderAsAlbum({ data: { path, recursive } });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      const counts = upsertLocalAlbums(result.albums);
      const names = result.albums.length === 1 ? result.albums[0]!.name : `${counts.added + counts.merged + counts.same} albums`;
      const verb = counts.added && !counts.merged && !counts.same ? "Added" : counts.added || counts.merged ? "Updated" : "Already had";
      const tail = result.truncated ? " Stopped before every folder was added." : "";
      setNotice(`${verb} ${names}.${tail}`);
    } catch {
      setError("Could not add that folder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-fg">Music folder</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            A folder laid out as artist/album uses those names, and a leading track number is dropped from the song.
            Add every album inside walks into the folders under this one. Tick songs for one album, or tick folders to add only those albums.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void addFolder(false)} disabled={busy}>
            Add this folder
          </Button>
          <Button type="button" variant="secondary" onClick={() => void addFolder(true)} disabled={busy}>
            Add every album inside
          </Button>
          <Button type="button" variant="secondary" onClick={() => void addSelected()} disabled={busy || picked.size === 0}>
            Add selected{picked.size ? ` (${picked.size})` : ""}
          </Button>
        </div>
      </div>
      <nav className="mt-3 flex flex-wrap items-center gap-1 text-sm" aria-label="Music folder">
        <button type="button" className="text-muted hover:text-fg" onClick={() => openDir("")}>
          music
        </button>
        {crumbs.map((crumb, index) => {
          const next = crumbs.slice(0, index + 1).join("/");
          return (
            <span key={next} className="flex items-center gap-1">
              <ChevronRight className="size-3 text-subtle" />
              <button type="button" className="text-muted hover:text-fg" onClick={() => openDir(next)}>
                {crumb}
              </button>
            </span>
          );
        })}
      </nav>
      <Input
        className="mt-3"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter this folder"
        aria-label="Filter this folder"
      />
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mt-2 text-sm text-fg">{notice}</p> : null}
      <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto overscroll-contain">
        {shownDirs.map((dir) => (
          <li key={dir.path} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-current"
              checked={picked.has(dir.path)}
              aria-label={`Select ${dir.name}`}
              onChange={(event) => togglePick(dir.path, event.target.checked)}
            />
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-fg hover:text-accent"
              onClick={() => openDir(dir.path)}
            >
              <Folder className="size-4 shrink-0 text-subtle" />
              <span className="truncate">{dir.name}</span>
            </button>
          </li>
        ))}
        {shownFiles.map((file) => (
          <li key={file.path} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-current"
              checked={picked.has(file.path)}
              aria-label={`Select ${file.name}`}
              onChange={(event) => togglePick(file.path, event.target.checked)}
            />
            <p className="min-w-0 flex-1 truncate text-sm text-muted">{file.name}</p>
            {onPickFile ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => onPickFile(file.path)}>
                Use
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {!shownDirs.length && !shownFiles.length ? (
        <p className="mt-3 text-sm text-muted">{busy ? "Reading the folder…" : "Nothing in this folder."}</p>
      ) : null}
      {!onPickFile ? (
        <p className="mt-3 text-xs text-subtle">Open a song’s Source to assign one of these files to it.</p>
      ) : null}
    </section>
  );
}

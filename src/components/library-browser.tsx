import { useEffect, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { folderAsAlbum, listMedia } from "@/lib/media";
import { useStation } from "@/lib/store";

type Entry = { name: string; path: string };

export function LibraryBrowser({
  onPickFile,
}: {
  onPickFile?: (path: string) => void;
}) {
  const upsertLocalAlbum = useStation((s) => s.upsertLocalAlbum);
  const [path, setPath] = useState("");
  const [dirs, setDirs] = useState<Entry[]>([]);
  const [files, setFiles] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function addFolder() {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await folderAsAlbum({ data: { path } });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      const added = upsertLocalAlbum(result.album);
      setNotice(added === "added" ? `Added ${result.album.name}.` : added === "merged" ? `Added the new songs in ${result.album.name}.` : `${result.album.name} is already in the crate.`);
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
            Add a folder as an album. The folder name is the album, and each filename is a song. Rename either after.
            File is the default source.
          </p>
        </div>
        <Button type="button" onClick={() => void addFolder()} disabled={busy}>
          Add this folder
        </Button>
      </div>
      <nav className="mt-3 flex flex-wrap items-center gap-1 text-sm" aria-label="Music folder">
        <button type="button" className="text-muted hover:text-fg" onClick={() => { setPath(""); setFilter(""); }}>
          music
        </button>
        {crumbs.map((crumb, index) => {
          const next = crumbs.slice(0, index + 1).join("/");
          return (
            <span key={next} className="flex items-center gap-1">
              <ChevronRight className="size-3 text-subtle" />
              <button type="button" className="text-muted hover:text-fg" onClick={() => { setPath(next); setFilter(""); }}>
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
      <ul className="mt-3 divide-y divide-border">
        {shownDirs.map((dir) => (
          <li key={dir.path}>
            <button
              type="button"
              className="flex w-full items-center gap-2 py-2 text-left text-sm text-fg hover:text-accent"
              onClick={() => { setPath(dir.path); setFilter(""); }}
            >
              <Folder className="size-4 shrink-0 text-subtle" />
              <span className="truncate">{dir.name}</span>
            </button>
          </li>
        ))}
        {shownFiles.map((file) => (
          <li key={file.path} className="flex items-center gap-3 py-2">
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

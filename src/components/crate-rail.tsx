import { Lock, Unlock } from "lucide-react";
import { useStation } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CrateRail() {
  const crate = useStation((s) => s.crate);
  const unlocked = useStation((s) => s.unlockedAlbumIds);
  const played = useStation((s) => s.playedTrackIds);
  const play = useStation((s) => s.play);
  const setView = useStation((s) => s.setView);

  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-subtle">Crate</h2>
        <button
          type="button"
          className="text-xs text-muted hover:text-fg"
          onClick={() => setView("crate")}
        >
          Edit
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {crate.map((album) => {
          const on = unlocked.includes(album.id);
          const done = album.tracks.filter((t) => played.includes(t.id)).length;
          return (
            <li key={album.id} className="w-20 shrink-0">
              <button
                type="button"
                disabled={!on}
                onClick={() => {
                  const first = album.tracks[0];
                  if (first) play(first.id);
                }}
                className={cn(
                  "block w-full overflow-hidden rounded-md text-left",
                  "shadow-[var(--shadow-border)] transition-opacity duration-150",
                  on ? "opacity-100" : "opacity-40",
                )}
              >
                <img
                  src={album.artwork}
                  alt=""
                  className="aspect-square w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                />
              </button>
              <p className="mt-1.5 truncate text-xs text-fg">{album.name}</p>
              <p className="flex items-center gap-1 text-xs text-subtle">
                {on ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                <span className="tabular-nums">
                  {done}/{album.tracks.length}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

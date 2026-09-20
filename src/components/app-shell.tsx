import { useEffect } from "react";
import { Disc3, Globe, LayoutGrid } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { CrateRail } from "@/components/crate-rail";
import { CrateView } from "@/components/crate-view";
import { IntroOverlay, VictoryBanner } from "@/components/overlays";
import { PlayerBar } from "@/components/player-bar";
import { Vinyl } from "@/components/vinyl";
import { WorldView } from "@/components/world-view";
import { Badge } from "@/components/ui/badge";
import { useNowPlaying, useStation } from "@/lib/store";
import { allTracks } from "@/lib/world";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/lib/types";

const NAV: { id: ViewId; label: string; icon: typeof Disc3 }[] = [
  { id: "station", label: "Station", icon: Disc3 },
  { id: "crate", label: "Crate", icon: LayoutGrid },
  { id: "world", label: "World", icon: Globe },
];

export function AppShell() {
  const view = useStation((s) => s.view);
  const setView = useStation((s) => s.setView);
  const crate = useStation((s) => s.crate);
  const unlocked = useStation((s) => s.unlockedAlbumIds);
  const checked = useStation((s) => s.checkedLocationIds);
  const seed = useStation((s) => s.seed);
  const mode = useStation((s) => s.mode);
  const liveStatus = useStation((s) => s.liveStatus);
  const isPlaying = useStation((s) => s.isPlaying);
  const track = useNowPlaying();
  const total = allTracks(crate).length;

  useEffect(() => {
    void useStation.persist.rehydrate();
    useStation.getState().hydrateEngine();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-medium tracking-tight">Needlecheck</p>
          <p className="hidden text-xs text-subtle sm:block">Late night on the multiworld</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{mode === "live" ? liveStatus : `seed ${seed}`}</Badge>
          <Badge variant="check" className="hidden sm:inline-flex">
            {checked.length}/{total}
          </Badge>
          <Badge className="hidden sm:inline-flex">
            {unlocked.length}/{crate.length} albums
          </Badge>
        </div>
      </header>

      <nav className="flex border-b border-border px-2 sm:px-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "relative flex h-12 flex-1 items-center justify-center gap-2 text-sm sm:flex-none sm:px-4",
                on ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {on ? <span className="absolute inset-x-3 bottom-0 h-px bg-accent" /> : null}
            </button>
          );
        })}
      </nav>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === "station" ? (
          <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-rows-[auto_1fr] gap-6 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden">
            <div className="flex flex-col gap-6 lg:overflow-y-auto lg:pr-2">
              <VictoryBanner />
              <Vinyl track={track} spinning={isPlaying} />
              <PlayerBar />
              <CrateRail />
            </div>
            <div className="flex min-h-80 flex-col lg:min-h-0">
              <ChatPanel />
            </div>
          </div>
        ) : null}
        {view === "crate" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <CrateView />
          </div>
        ) : null}
        {view === "world" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <WorldView />
          </div>
        ) : null}
      </main>

      <IntroOverlay />
    </div>
  );
}

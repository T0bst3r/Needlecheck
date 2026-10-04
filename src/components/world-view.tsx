import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allTracks } from "@/lib/world";
import { exportableAlbums } from "@/lib/ap/player-yaml";
import { useStation } from "@/lib/store";

export function WorldView() {
  const seed = useStation((s) => s.seed);
  const mode = useStation((s) => s.mode);
  const live = useStation((s) => s.live);
  const liveStatus = useStation((s) => s.liveStatus);
  const liveError = useStation((s) => s.liveError);
  const crate = useStation((s) => s.crate);
  const unlocked = useStation((s) => s.unlockedAlbumIds);
  const checked = useStation((s) => s.checkedLocationIds);
  const gift = useStation((s) => s.remoteGift);
  const received = useStation((s) => s.receivedItems);
  const setLive = useStation((s) => s.setLive);
  const connectLive = useStation((s) => s.connectLive);
  const disconnectLive = useStation((s) => s.disconnectLive);
  const newSeed = useStation((s) => s.newSeed);
  const resetProgress = useStation((s) => s.resetProgress);
  const exportPack = useStation((s) => s.exportPack);
  const total = allTracks(crate).length;
  const ready = exportableAlbums(crate);
  const readyTracks = ready.ok ? ready.albums.reduce((sum, album) => sum + album.tracks.length, 0) : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header>
        <h2 className="font-display text-2xl font-medium tracking-tight">The multiworld</h2>
        <p className="mt-1 text-sm text-muted">
          Demo seed plays as a solo Archipelago world with simulated neighbors. Live mode talks to a real room over the
          Archipelago protocol.
        </p>
      </header>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Demo seed</p>
            <p className="font-mono text-2xl tabular-nums text-fg">{seed}</p>
          </div>
          <Badge variant={mode === "demo" ? "check" : "default"}>{mode === "demo" ? "active" : "idle"}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-subtle">Albums</dt>
            <dd className="tabular-nums text-fg">
              {unlocked.length}/{crate.length}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Checks</dt>
            <dd className="tabular-nums text-fg">
              {checked.length}/{total}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Incoming</dt>
            <dd className="text-fg">
              {gift && !gift.granted ? `${gift.itemName.replace("Album - ", "")}` : "—"}
            </dd>
          </div>
        </dl>
        {gift && !gift.granted ? (
          <p className="mt-3 text-xs text-muted">
            {gift.itemName} is sitting in another world. It arrives after {gift.afterChecks} of your checks (
            {Math.max(0, gift.afterChecks - checked.length)} remaining).
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={newSeed}>New seed</Button>
          <Button variant="secondary" onClick={resetProgress}>
            Reset checks
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">Live room</p>
            <h3 className="text-lg font-medium text-fg">Archipelago connect</h3>
          </div>
          <Badge
            variant={liveStatus === "connected" ? "check" : liveStatus === "error" ? "danger" : "default"}
          >
            {liveStatus}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-subtle">
            Host
            <Input className="mt-1" value={live.host} onChange={(e) => setLive({ host: e.target.value })} />
          </label>
          <label className="block text-xs text-subtle">
            Port
            <Input className="mt-1" value={live.port} onChange={(e) => setLive({ port: e.target.value })} />
          </label>
          <label className="block text-xs text-subtle">
            Slot name
            <Input className="mt-1" value={live.slot} onChange={(e) => setLive({ slot: e.target.value })} />
          </label>
          <label className="block text-xs text-subtle">
            Game name
            <Input className="mt-1" value={live.game} onChange={(e) => setLive({ game: e.target.value })} />
          </label>
          <label className="block text-xs text-subtle sm:col-span-2">
            Password
            <Input
              className="mt-1"
              type="password"
              value={live.password}
              onChange={(e) => setLive({ password: e.target.value })}
            />
          </label>
        </div>
        {liveError ? <p className="mt-3 text-sm text-danger">{liveError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {liveStatus === "connected" ? (
            <Button variant="secondary" onClick={disconnectLive}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={() => void connectLive()} disabled={liveStatus === "connecting"}>
              {liveStatus === "connecting" ? "Connecting…" : "Connect"}
            </Button>
          )}
          <Button variant="outline" onClick={exportPack} disabled={!ready.ok}>
            Download world pack
          </Button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {ready.ok
            ? `${readyTracks} ${readyTracks === 1 ? "track goes" : "tracks go"} into Needlecheck.yaml, across ${ready.albums.length} ${ready.albums.length === 1 ? "album" : "albums"}. The apworld in the zip has no albums of its own. The slot name above is the YAML name.`
            : ready.reason}{" "}
          The station still plays short previews. The Discord bot plays the files. YouTube stays off there until you turn it on.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-fg">Received items</h3>
        {received.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing received yet. First plays will start the log.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {received
              .slice()
              .reverse()
              .slice(0, 24)
              .map((item) => (
                <li key={`${item.itemId}-${item.at}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{item.itemName}</p>
                    <p className="text-xs text-subtle">{item.fromPlayer}</p>
                  </div>
                  <Badge
                    variant={
                      item.classification === "progression"
                        ? "check"
                        : item.classification === "trap"
                          ? "danger"
                          : item.classification === "useful"
                            ? "accent"
                            : "default"
                    }
                  >
                    {item.classification}
                  </Badge>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

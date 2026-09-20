import { Pause, Play, Shuffle, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNowPlaying, useStation } from "@/lib/store";
import { formatTime } from "@/lib/utils";

export function PlayerBar() {
  const track = useNowPlaying();
  const isPlaying = useStation((s) => s.isPlaying);
  const shuffle = useStation((s) => s.shuffle);
  const progressMs = useStation((s) => s.progressMs);
  const durationMs = useStation((s) => s.durationMs);
  const volume = useStation((s) => s.volume);
  const play = useStation((s) => s.play);
  const pause = useStation((s) => s.pause);
  const skip = useStation((s) => s.skip);
  const toggleShuffle = useStation((s) => s.toggleShuffle);
  const setVolume = useStation((s) => s.setVolume);
  const played = useStation((s) => (track ? s.playedTrackIds.includes(track.id) : false));
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-16">
        {track ? (
          <>
            <p className="font-display text-2xl font-medium leading-tight tracking-tight text-fg sm:text-3xl">
              {track.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              {track.artist}
              <span className="text-subtle"> · </span>
              {track.albumName}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-subtle">
              {played ? "Already checked" : "First play — this is a check"}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-medium leading-tight tracking-tight text-fg sm:text-3xl">
              Silence on the channel
            </p>
            <p className="mt-1 text-sm text-muted">Drop the needle to start sphere 0.</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 text-xs tabular-nums text-subtle">{formatTime(progressMs)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-subtle">{formatTime(durationMs)}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={shuffle ? "secondary" : "ghost"}
          size="icon"
          aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
          aria-pressed={shuffle}
          onClick={toggleShuffle}
        >
          <Shuffle />
        </Button>
        <Button
          size="icon"
          className="size-14 rounded-full"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => (isPlaying ? pause() : play())}
        >
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Skip" onClick={skip}>
          <SkipForward />
        </Button>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Volume2 className="size-4 text-subtle" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
          />
        </div>
      </div>
    </div>
  );
}

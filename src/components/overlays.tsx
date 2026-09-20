import { Button } from "@/components/ui/button";
import { useStation } from "@/lib/store";

export function IntroOverlay() {
  const seen = useStation((s) => s.seenIntro);
  const dismiss = useStation((s) => s.dismissIntro);
  const play = useStation((s) => s.play);
  if (seen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Needlecheck</p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-fg">Late night on the multiworld.</h2>
        <ol className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <span className="font-medium text-fg">1. Sphere 0. </span>
            Kind of Blue starts unlocked. Everything else is an Archipelago item.
          </li>
          <li>
            <span className="font-medium text-fg">2. Drop the needle. </span>
            The first time a song plays, its location is checked. That can be another album — or something for Maya in
            Hyrule.
          </li>
          <li>
            <span className="font-medium text-fg">3. The crate grows. </span>
            Unlocked albums join the random rotation. Goal: first-play every track.
          </li>
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => {
              dismiss();
              play();
            }}
          >
            Drop the needle
          </Button>
          <Button variant="secondary" className="flex-1" onClick={dismiss}>
            Browse first
          </Button>
        </div>
      </div>
    </div>
  );
}

export function VictoryBanner() {
  const victory = useStation((s) => s.victory);
  const newSeed = useStation((s) => s.newSeed);
  if (!victory) return null;
  return (
    <div className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-sm font-medium text-fg">Crate clear. Every first play has been checked.</p>
      <button type="button" className="mt-1 text-sm text-muted hover:text-fg" onClick={newSeed}>
        Roll a new seed
      </button>
    </div>
  );
}

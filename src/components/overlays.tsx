import { Button } from "@/components/ui/button";
import { useStation } from "@/lib/store";

export function IntroOverlay() {
  const seen = useStation((s) => s.seenIntro);
  const dismiss = useStation((s) => s.dismissIntro);
  if (seen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Needlecheck</p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-fg">Build the crate.</h2>
        <ol className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <span className="font-medium text-fg">1. Search. </span>
            Pick an album. Attach a YouTube video or a file path to the tracks that should be locations.
          </li>
          <li>
            <span className="font-medium text-fg">2. Star a starter. </span>
            That album begins unlocked. The others are Archipelago items.
          </li>
          <li>
            <span className="font-medium text-fg">3. Download the world pack. </span>
            The slot name on this page is the name in the YAML.
          </li>
        </ol>
        <Button className="mt-6 w-full" onClick={dismiss}>
          Start
        </Button>
      </div>
    </div>
  );
}

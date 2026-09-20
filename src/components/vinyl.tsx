import { cn } from "@/lib/utils";
import type { Track } from "@/lib/types";

export function Vinyl({ track, spinning }: { track?: Track; spinning: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-xs lg:max-w-sm">
      <div className={cn("vinyl", spinning && "is-spinning")} aria-hidden="true">
        {track ? (
          <img
            src={track.artwork}
            alt=""
            className="vinyl-label object-cover"
            draggable={false}
          />
        ) : (
          <div className="vinyl-label bg-surface-2" />
        )}
        <div className="vinyl-hole" />
      </div>
      <div className={cn("tonearm", spinning && "is-on")} aria-hidden="true">
        <div className="absolute -top-1 left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent" />
        <div className="tonearm-shaft" />
        <div className="tonearm-head" />
      </div>
    </div>
  );
}

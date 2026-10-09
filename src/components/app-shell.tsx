import { useEffect } from "react";
import { CrateView } from "@/components/crate-view";
import { IntroOverlay } from "@/components/overlays";
import { useStation } from "@/lib/store";

export function AppShell() {
  useEffect(() => {
    void useStation.persist.rehydrate();
    useStation.getState().hydrateEngine();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <p className="font-display text-lg font-medium tracking-tight">Needlecheck</p>
        <p className="text-xs text-subtle">Late night on the multiworld</p>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <CrateView />
      </main>
      <IntroOverlay />
    </div>
  );
}

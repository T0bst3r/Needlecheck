export const TRAP_GROOVE = 2_900_000_002;
export const TRAP_SPEED = 2_900_000_003;
export const TRAP_PAUSE = 2_900_000_004;

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Slower than 0.85× or faster than 1.2×, never past 0.5× or 2×. */
export function rollSpeed(rand) {
  if (rand() < 0.5) return round2(0.5 + rand() * 0.35);
  return round2(1.2 + rand() * 0.8);
}

/** 5 to 15 seconds, inclusive. */
export function rollPauseMs(rand) {
  return 5000 + Math.floor(rand() * 10001);
}

export function planTraps(items, rand) {
  const plan = { groove: false, speed: null, pauseMs: 0 };
  for (const item of items ?? []) {
    const id = item?.item;
    if (id === TRAP_GROOVE) plan.groove = true;
    else if (id === TRAP_SPEED) plan.speed = rollSpeed(rand);
    else if (id === TRAP_PAUSE) plan.pauseMs = Math.max(plan.pauseMs, rollPauseMs(rand));
  }
  return plan;
}

export function deathSource(data) {
  if (!data || typeof data !== "object") return "Someone";
  return typeof data.source === "string" && data.source.trim() ? data.source.trim() : "Someone";
}

export function activeTraps(state, now = Date.now()) {
  const lines = [];
  if (state?.forcePlayed) lines.push("Locked groove: the next song is one already heard");
  if (state?.pendingSpeed) lines.push(`Wrong speed: the next song plays at ${state.pendingSpeed.toFixed(2)}×`);
  else if (Math.abs((state?.speed ?? 1) - 1) > 0.02) lines.push(`Wrong speed: playing at ${state.speed.toFixed(2)}×`);
  if (state?.pendingPauseMs > 0) {
    lines.push(`Tonearm lift: ${Math.round(state.pendingPauseMs / 1000)}s when the next song starts`);
  } else if (state?.pauseUntil > now) {
    const left = Math.max(1, Math.ceil((state.pauseUntil - now) / 1000));
    lines.push(`Tonearm lift: ${left}s left`);
  }
  return lines;
}

export function trapsLine(state, now = Date.now()) {
  const lines = activeTraps(state, now);
  return lines.length ? lines.join("\n") : "Traps: none";
}

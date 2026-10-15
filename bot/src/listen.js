export const LISTEN_RATIO = 0.9;

export function contentHeardMs(creditMs, playedMs, speed) {
  const rate = speed > 0 ? speed : 1;
  return Math.max(0, creditMs) + Math.max(0, playedMs) * rate;
}

/** A known length counts at 90%. An unknown length counts only if the track finishes on its own. */
export function heardEnough({ contentMs, durationMs, endedNaturally }) {
  if (durationMs > 0) return contentMs >= durationMs * LISTEN_RATIO;
  return Boolean(endedNaturally) && contentMs >= 1000;
}

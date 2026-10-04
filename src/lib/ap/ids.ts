import { hash32 } from "../rng.ts";

/** Archipelago ids. Same bases and span as apworld/needlecheck/crate.py. */
export const ITEM_BASE = 1_000_000_000;
export const LOCATION_BASE = 2_000_000_000;
export const ID_SPAN = 100_000_000;

export function apId(name: string, base: number): number {
  return base + (hash32(name) % ID_SPAN);
}

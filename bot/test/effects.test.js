import assert from "node:assert/strict";
import { test } from "node:test";
import { TRAP_GROOVE, TRAP_PAUSE, TRAP_SPEED, activeTraps, planTraps, rollPauseMs, rollSpeed, trapsLine } from "../src/effects.js";

test("speed stays between half and double, and away from normal", () => {
  for (let i = 0; i < 40; i += 1) {
    const speed = rollSpeed(Math.random);
    assert.ok(speed >= 0.5 && speed <= 2);
    assert.ok(speed <= 0.85 || speed >= 1.2);
  }
});

test("a pause lasts between 5 and 15 seconds", () => {
  for (let i = 0; i < 40; i += 1) {
    const ms = rollPauseMs(Math.random);
    assert.ok(ms >= 5000 && ms <= 15000);
  }
});

test("several traps in one packet collapse to one of each effect", () => {
  const plan = planTraps(
    [{ item: TRAP_GROOVE }, { item: TRAP_PAUSE }, { item: TRAP_PAUSE }, { item: TRAP_SPEED }, { item: 1_000_000_001 }],
    () => 0,
  );
  assert.equal(plan.groove, true);
  assert.equal(plan.speed, 0.5);
  assert.equal(plan.pauseMs, 5000);
});

test("status names each trap that is still in effect", () => {
  const now = 1_000_000;
  assert.equal(trapsLine({ speed: 1, forcePlayed: false, pendingPauseMs: 0, pauseUntil: 0 }, now), "Traps: none");
  assert.deepEqual(
    activeTraps({ forcePlayed: true, speed: 1.4, pendingSpeed: null, pendingPauseMs: 0, pauseUntil: now + 8_200 }, now),
    ["Locked groove: the next song is one already heard", "Wrong speed: playing at 1.40×", "Tonearm lift: 9s left"],
  );
  assert.deepEqual(
    activeTraps({ forcePlayed: false, speed: 1, pendingSpeed: 0.5, pendingPauseMs: 12_000, pauseUntil: 0 }, now),
    ["Wrong speed: the next song plays at 0.50×", "Tonearm lift: 12s when the next song starts"],
  );
});

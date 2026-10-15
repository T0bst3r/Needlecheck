import assert from "node:assert/strict";
import { test } from "node:test";
import { TRAP_GROOVE, TRAP_PAUSE, TRAP_SPEED, planTraps, rollPauseMs, rollSpeed } from "../src/effects.js";

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

import assert from "node:assert/strict";
import { test } from "node:test";
import { contentHeardMs, heardEnough } from "../src/listen.js";
import { chooseTrack } from "../src/queue.js";

const albums = [
  {
    id: "a",
    tracks: [
      { id: "fresh", name: "Fresh" },
      { id: "heard", name: "Heard" },
    ],
  },
];

test("a known length counts at 90 percent, not at the start", () => {
  assert.equal(heardEnough({ contentMs: 89_000, durationMs: 100_000, endedNaturally: false }), false);
  assert.equal(heardEnough({ contentMs: 90_000, durationMs: 100_000, endedNaturally: false }), true);
});

test("an unknown length counts only when the track finishes", () => {
  assert.equal(heardEnough({ contentMs: 50_000, durationMs: 0, endedNaturally: false }), false);
  assert.equal(heardEnough({ contentMs: 500, durationMs: 0, endedNaturally: true }), false);
  assert.equal(heardEnough({ contentMs: 50_000, durationMs: 0, endedNaturally: true }), true);
});

test("playback speed changes how fast the song is heard", () => {
  assert.equal(contentHeardMs(0, 10_000, 2), 20_000);
  assert.equal(contentHeardMs(30_000, 10_000, 0.5), 35_000);
});

test("a full unchecked bias still plays an unheard song", () => {
  const played = new Set(["heard"]);
  const pick = chooseTrack({
    albums,
    isUnlocked: () => true,
    isPlayed: (id) => played.has(id),
    shuffle: false,
    preferPlayed: false,
    uncheckedPercent: 100,
    rand: () => 0.99,
  });
  assert.equal(pick.id, "fresh");
});

test("a locked groove asks for a song that was already listened to", () => {
  const played = new Set(["heard"]);
  const pick = chooseTrack({
    albums,
    isUnlocked: () => true,
    isPlayed: (id) => played.has(id),
    shuffle: false,
    preferPlayed: true,
  });
  assert.equal(pick.id, "heard");
});

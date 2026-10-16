import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseTrack, freshLabel, parseUncheckedPercent } from "../src/queue.js";

const albums = [
  {
    id: "a",
    tracks: [
      { id: "heard", name: "Heard" },
      { id: "fresh", name: "Fresh" },
    ],
  },
];

function pick(uncheckedPercent, rand) {
  return chooseTrack({
    albums,
    isUnlocked: () => true,
    isPlayed: (id) => id === "heard",
    shuffle: true,
    uncheckedPercent,
    rand,
  });
}

test("the default mix is 80 percent unchecked", () => {
  assert.equal(parseUncheckedPercent(""), 80);
  assert.equal(parseUncheckedPercent("nope"), 80);
  assert.equal(parseUncheckedPercent("80"), 80);
  assert.equal(parseUncheckedPercent("0"), 0);
  assert.equal(parseUncheckedPercent("100"), 100);
});

test("100 plays an unchecked song whenever one is left", () => {
  assert.equal(pick(100, () => 0.99).id, "fresh");
});

test("80 plays unchecked most of the time and a checked song the rest", () => {
  assert.equal(pick(80, () => 0.79).id, "fresh");
  assert.equal(pick(80, () => 0.8).id, "heard");
});

test("0 picks any unlocked song, including one already checked", () => {
  const chosen = chooseTrack({
    albums,
    isUnlocked: () => true,
    isPlayed: (id) => id === "heard",
    shuffle: false,
    uncheckedPercent: 0,
    rand: () => 0,
  });
  assert.equal(chosen.id, "heard");
});

test("a locked groove still asks for a song that was already heard", () => {
  const chosen = chooseTrack({
    albums,
    isUnlocked: () => true,
    isPlayed: (id) => id === "heard",
    shuffle: false,
    uncheckedPercent: 100,
    preferPlayed: true,
    rand: () => 0,
  });
  assert.equal(chosen.id, "heard");
});

test("the status line names the three useful settings", () => {
  assert.match(freshLabel(100), /first/);
  assert.match(freshLabel(80), /80% unchecked/);
  assert.match(freshLabel(0), /equally/);
});

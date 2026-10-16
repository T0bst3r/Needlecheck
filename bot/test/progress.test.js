import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock, progressLine, progressText, ProgressBoard } from "../src/progress.js";

const track = {
  name: "So What",
  artist: "Miles Davis",
  albumName: "Kind of Blue",
  source: { kind: "file" },
};

test("the clock stays in minutes until the song passes an hour", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(84_000), "1:24");
  assert.equal(formatClock(3_661_000), "1:01:01");
});

test("a known length draws a bar and does not run past the end", () => {
  const line = progressLine({ playedMs: 90_000, durationMs: 180_000 });
  assert.match(line, /^▰{8}▱{8}  1:30 \/ 3:00$/);
  assert.match(progressLine({ playedMs: 200_000, durationMs: 180_000 }), /3:00 \/ 3:00$/);
});

test("an unknown length shows how long it has been playing", () => {
  assert.equal(progressLine({ playedMs: 12_000, durationMs: 0, paused: true }), "0:12 · paused");
});

test("silence is its own message", () => {
  assert.equal(progressText(null).description, "Silence.");
  assert.match(progressText({ track, playedMs: 1000, durationMs: 0 }).description, /Kind of Blue/);
});

test("turning the message off deletes it and stops the updates", async () => {
  let deleted = false;
  const board = new ProgressBoard({
    player: { snapshot: () => ({ track: null }), advance: false },
    intervalMs: 60_000,
  });
  board.enabled = true;
  board.arm();
  board.message = { delete: async () => { deleted = true; } };
  await board.setEnabled(false);
  assert.equal(deleted, true);
  assert.equal(board.timer, null);
  assert.equal(board.enabled, false);
});

test("a finished song does not stay on the message", async () => {
  let title = "";
  const board = new ProgressBoard({
    player: { snapshot: () => ({ track: null }), advance: true },
    intervalMs: 60_000,
  });
  board.enabled = true;
  board.epoch = 1;
  board.channel = { send: async () => ({ edit: async () => {} }) };
  board.message = {
    edit: async (body) => {
      title = body.embeds[0].data.title;
    },
  };
  board.last = "old";
  await board.tick();
  assert.equal(title, "Needlecheck");
  board.stop();
});

test("a message posted after progress is turned off is deleted", async () => {
  let release;
  let started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const reached = new Promise((resolve) => {
    started = resolve;
  });
  let deleted = 0;
  const board = new ProgressBoard({
    player: {
      snapshot: () => ({ track, playedMs: 1000, durationMs: 0, paused: false }),
      advance: true,
    },
    intervalMs: 60_000,
  });
  board.enabled = true;
  board.epoch = 1;
  board.channel = {
    send: () => {
      started();
      return gate.then(() => ({
        delete: async () => {
          deleted += 1;
        },
        edit: async () => {},
      }));
    },
  };
  const pending = board.tick();
  await reached;
  const disabling = board.setEnabled(false);
  release();
  await pending;
  await disabling;
  assert.equal(deleted, 1);
  assert.equal(board.message, null);
  assert.equal(board.timer, null);
  assert.equal(board.enabled, false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { planPlayback, playbackCounts, readySongs, resolveMedia } from "../src/media.js";

test("file paths stay inside the music folder", () => {
  const hit = resolveMedia("/music", "miles/kind of blue/so what.mp3");
  assert.equal(hit.ok, true);
  assert.equal(hit.path, "/music/miles/kind of blue/so what.mp3");
  assert.equal(hit.display, "miles/kind of blue/so what.mp3");
});

test("windows separators are accepted as relative", () => {
  const hit = resolveMedia("/music", "miles\\so what.mp3");
  assert.equal(hit.ok, true);
  assert.equal(hit.path, "/music/miles/so what.mp3");
});

test("absolute paths, urls, and parent segments are refused", () => {
  assert.equal(resolveMedia("/music", "/etc/passwd").ok, false);
  assert.equal(resolveMedia("/music", "https://example.com/a.mp3").ok, false);
  assert.equal(resolveMedia("/music", "../secret.mp3").ok, false);
  assert.equal(resolveMedia("/music", "miles/../../secret.mp3").ok, false);
  assert.equal(resolveMedia("/music", "C:/music/a.mp3").ok, false);
});

test("youtube stays off unless the backend is enabled", () => {
  const track = { name: "Freddie Freeloader", source: { kind: "youtube", id: "dQw4w9WgXcQ" } };
  const off = planPlayback(track, { youtube: false });
  assert.equal(off.ok, false);
  assert.equal(off.skip, true);
  const on = planPlayback(track, { youtube: true });
  assert.deepEqual(on, { ok: true, kind: "youtube", id: "dQw4w9WgXcQ" });
});

test("a bad video id never becomes a url", () => {
  const track = { name: "Nope", source: { kind: "youtube", id: "not a url" } };
  assert.equal(planPlayback(track, { youtube: true }).ok, false);
});

test("counts ignore youtube tracks while the backend is off", () => {
  const albums = [
    {
      tracks: [
        { source: { kind: "file", path: "a.mp3" } },
        { source: { kind: "youtube", id: "dQw4w9WgXcQ" } },
      ],
    },
  ];
  assert.deepEqual(playbackCounts(albums, false), { file: 1, youtube: 1, playable: 1 });
  assert.equal(playbackCounts(albums, true).playable, 2);
});

test("ready songs are the unlocked ones the bot can play", () => {
  const albums = [
    { id: "open", tracks: [{ source: { kind: "file" } }, { source: { kind: "youtube" } }] },
    { id: "shut", tracks: [{ source: { kind: "file" } }] },
  ];
  assert.deepEqual(readySongs(albums, (id) => id === "open", false), { ready: 1, waiting: 1 });
  assert.deepEqual(readySongs(albums, (id) => id === "open", true), { ready: 2, waiting: 0 });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { apId, ITEM_BASE, LOCATION_BASE } from "./ids.ts";
import { albumItemName, nameAlbums, trackLocationName } from "./names.ts";
import { exportableAlbums, toPlayerYaml } from "./player-yaml.ts";
import { filePath, youtubeId } from "./source.ts";
import type { Album } from "../types.ts";

test("youtube ids and file paths", () => {
  assert.equal(youtubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=1"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("not a video"), null);
  assert.equal(filePath("miles/so what.mp3"), "miles/so what.mp3");
  assert.equal(filePath("C:\\music\\so what.mp3"), "C:\\music\\so what.mp3");
  assert.equal(filePath("https://example.com/a.mp3"), null);
});

test("names and ids stay a pure function of the label", () => {
  const named = nameAlbums([
    {
      id: "268443092",
      name: "Kind of Blue",
      artist: "Miles Davis",
      tracks: [{ id: "so-what", name: "So What" }],
    },
    {
      id: "other",
      name: "Kind of Blue",
      artist: "Miles Davis",
      tracks: [{ id: "so-what", name: "So What" }],
    },
  ]);
  assert.equal(named[0]!.itemName, `${albumItemName("Kind of Blue", "Miles Davis")} (268443092)`);
  assert.equal(named[1]!.itemName, `${albumItemName("Kind of Blue", "Miles Davis")} (other)`);
  assert.equal(named[0]!.itemId, apId(named[0]!.itemName, ITEM_BASE));
  assert.equal(
    named[0]!.tracks[0]!.locationName,
    `${trackLocationName("So What", "Kind of Blue", "Miles Davis")} (268443092/so-what)`,
  );
  assert.equal(named[0]!.tracks[0]!.locationId, apId(named[0]!.tracks[0]!.locationName, LOCATION_BASE));
  assert.notEqual(named[0]!.itemId, named[1]!.itemId);
});

test("yaml keeps only sourced tracks and quotes the slot", () => {
  const album = {
    id: "268443092",
    name: "Kind of Blue",
    artist: "Miles Davis",
    artwork: "https://example.com/art.jpg",
    year: 1959,
    starter: true,
    itemId: 1,
    itemName: "Album - Kind of Blue — Miles Davis",
    tracks: [
      {
        id: "so-what",
        name: "So What",
        artist: "Miles Davis",
        previewUrl: null,
        durationMs: 1000,
        trackNumber: 1,
        albumId: "268443092",
        albumName: "Kind of Blue",
        artwork: "",
        locationId: 2,
        locationName: "First Play - So What [Kind of Blue — Miles Davis]",
        source: { kind: "file" as const, path: "miles/so what.mp3" },
      },
      {
        id: "blue",
        name: "Blue in Green",
        artist: "Miles Davis",
        previewUrl: null,
        durationMs: 1000,
        trackNumber: 3,
        albumId: "268443092",
        albumName: "Kind of Blue",
        artwork: "",
        locationId: 4,
        locationName: "First Play - Blue in Green [Kind of Blue — Miles Davis]",
        source: { kind: "file" as const, path: "miles/blue.mp3" },
        included: false,
      },
      {
        id: "freddie",
        name: "Freddie Freeloader",
        artist: "Miles Davis",
        previewUrl: null,
        durationMs: 1000,
        trackNumber: 2,
        albumId: "268443092",
        albumName: "Kind of Blue",
        artwork: "",
        locationId: 3,
        locationName: "First Play - Freddie Freeloader [Kind of Blue — Miles Davis]",
      },
    ],
  } satisfies Album;
  const ready = exportableAlbums([album]);
  assert.equal(ready.ok, true);
  if (!ready.ok) return;
  assert.equal(ready.albums[0]!.tracks.length, 1);
  const yaml = toPlayerYaml(ready.albums, 'DJ "night"');
  assert.match(yaml, /name: "DJ \\"night\\""/);
  assert.match(yaml, /kind: file/);
  assert.match(yaml, /path: "miles\/so what\.mp3"/);
  assert.doesNotMatch(yaml, /Freddie/);
  assert.doesNotMatch(yaml, /Blue in Green/);
});

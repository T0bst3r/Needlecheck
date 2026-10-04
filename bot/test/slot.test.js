import assert from "node:assert/strict";
import { test } from "node:test";
import { albumByItemId, parseSlotCrate, trackByLocationId } from "../src/slot.js";

const slot = {
  albums: [
    {
      id: "268443092",
      name: "Kind of Blue",
      artist: "Miles Davis",
      starter: true,
      item_name: "Album - Kind of Blue — Miles Davis",
      item_id: 1000000001,
      tracks: [
        {
          id: "so-what",
          name: "So What",
          location_name: "First Play - So What [Kind of Blue — Miles Davis]",
          location_id: 2000000001,
          source: { kind: "file", path: "miles/so what.mp3" },
        },
        {
          id: "freddie",
          name: "Freddie Freeloader",
          location_name: "First Play - Freddie Freeloader [Kind of Blue — Miles Davis]",
          location_id: 2000000002,
          source: { kind: "youtube", id: "dQw4w9WgXcQ" },
        },
        {
          id: "dropped",
          name: "No Source",
          location_name: "nope",
          location_id: 1,
          source: { kind: "file", path: "" },
        },
      ],
    },
  ],
};

test("slot data keeps the seed ids and both source kinds", () => {
  const albums = parseSlotCrate(slot);
  assert.equal(albums.length, 1);
  assert.equal(albums[0].starter, true);
  assert.equal(albums[0].tracks.length, 2);
  assert.equal(albums[0].tracks[0].artist, "Miles Davis");
  assert.equal(trackByLocationId(albums, 2000000002).name, "Freddie Freeloader");
  assert.equal(albumByItemId(albums, 1000000001).itemName, "Album - Kind of Blue — Miles Davis");
});

test("a room without a crate is an error, not an empty rotation", () => {
  assert.throws(() => parseSlotCrate({}), /did not send a Needlecheck crate/);
  assert.throws(() => parseSlotCrate({ albums: [] }), /no tracks/);
});

import { FILLER_NAMES, GAME_NAME } from "../flavor";
import type { Album } from "../types";

export function buildManualPack(crate: Album[]) {
  const starters = crate.filter((a) => a.starter);
  const game = {
    game: GAME_NAME,
    creator: "Needlecheck",
    filler_item_name: FILLER_NAMES[0],
    starting_items: [
      {
        items: starters.map((a) => a.itemName),
      },
    ],
  };

  const items = crate.map((a) => ({
    name: a.itemName,
    category: ["Albums"],
    classification: a.starter ? "useful" : "progression",
    count: 1,
  }));

  const locations = crate.flatMap((a) =>
    a.tracks.map((t) => ({
      name: t.locationName,
      category: [a.name],
      requires: `|${a.itemName}|`,
    })),
  );

  const regions = {
    Menu: {
      starting: true,
      connects_to: crate.map((a) => a.name),
    },
    ...Object.fromEntries(
      crate.map((a) => [
        a.name,
        {
          requires: `|${a.itemName}|`,
        },
      ]),
    ),
  };

  const yaml = [
    `name: DJ`,
    `game: ${GAME_NAME}`,
    `${GAME_NAME}:`,
    `  progression_balancing: 50`,
    `  accessibility: items`,
    ``,
  ].join("\n");

  return {
    "game.json": JSON.stringify(game, null, 2),
    "items.json": JSON.stringify(items, null, 2),
    "locations.json": JSON.stringify(locations, null, 2),
    "regions.json": JSON.stringify(regions, null, 2),
    "Needlecheck.yaml": yaml,
    "README.txt": [
      "Needlecheck — Manual for Archipelago world pack",
      "",
      "1. Install Manual for Archipelago (https://github.com/ManualForArchipelago/Manual).",
      "2. Create a new Manual apworld and drop these JSON files into it.",
      "3. Put Needlecheck.yaml in the Archipelago Players folder (rename the slot).",
      "4. Generate, host, then connect from Needlecheck → World with game name \"Needlecheck\".",
      "",
      "Items are albums. Locations are first plays of each track.",
      "A track is only in logic once its album item has been received.",
      "",
    ].join("\n"),
  };
}

export function downloadText(filename: string, contents: string, mime = "application/json") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Uncompressed ZIP so the pack is one file — no extra deps. */
export function downloadZip(filename: string, files: Record<string, string>) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  const now = dosTime(new Date());

  for (const [name, text] of Object.entries(files)) {
    const data = encoder.encode(text);
    const n = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + n.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, now.time, true);
    lv.setUint16(12, now.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    chunks.push(local, data);

    const ch = new Uint8Array(46 + n.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, now.time, true);
    cv.setUint16(14, now.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    ch.set(n, 46);
    central.push(ch);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const blob = new Blob([...chunks, ...central, end] as BlobPart[], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

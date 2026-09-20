import worldPy from "../../../apworld/needlecheck/__init__.py?raw";
import archipelagoMeta from "../../../apworld/needlecheck/archipelago.json?raw";
import gameInfo from "../../../apworld/needlecheck/docs/en_Needlecheck.md?raw";
import setupDoc from "../../../apworld/needlecheck/docs/setup_en.md?raw";
import { GAME_NAME } from "../flavor";
import type { Album } from "../types";
import { toCrateFile } from "./crate-file";

function playerYaml() {
  return [
    `name: DJ`,
    `game: ${GAME_NAME}`,
    `${GAME_NAME}: {}`,
    ``,
  ].join("\n");
}

function packReadme() {
  return [
    "Needlecheck world pack",
    "",
    "The crate was built in Needlecheck (Spotify / catalog), not in Archipelago's options page.",
    "",
    "1. Copy needlecheck.apworld into Archipelago custom_worlds (or lib/worlds).",
    "2. Copy Needlecheck.yaml into Players and set name: to your slot.",
    "3. Generate and host.",
    "4. Connect the web station or Discord bot with game name Needlecheck.",
    "",
    "crate.json is the same crate the bot loads from /data/crate.json.",
    "",
  ].join("\n");
}

export function buildWorldPack(crate: Album[]) {
  const crateJson = JSON.stringify(toCrateFile(crate), null, 2);
  const apworld = zipBytes({
    "needlecheck/__init__.py": worldPy,
    "needlecheck/archipelago.json": archipelagoMeta,
    "needlecheck/data/crate.json": crateJson,
    "needlecheck/docs/en_Needlecheck.md": gameInfo,
    "needlecheck/docs/setup_en.md": setupDoc,
  });
  return {
    "needlecheck.apworld": apworld,
    "Needlecheck.yaml": playerYaml(),
    "crate.json": crateJson,
    "README.txt": packReadme(),
  };
}

export function downloadWorldPack(crate: Album[]) {
  downloadZip("needlecheck-world.zip", buildWorldPack(crate));
}

export function downloadZip(filename: string, files: Record<string, string | Uint8Array>) {
  const blob = new Blob([zipBytes(files)] as BlobPart[], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function zipBytes(files: Record<string, string | Uint8Array>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const now = dosTime(new Date());
  let offset = 0;

  for (const [name, contents] of Object.entries(files)) {
    const data = typeof contents === "string" ? encoder.encode(contents) : contents;
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

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of [...chunks, ...central, end]) {
    out.set(c, p);
    p += c.length;
  }
  return out;
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

import worldPy from "../../../apworld/needlecheck/__init__.py?raw";
import cratePy from "../../../apworld/needlecheck/crate.py?raw";
import optionsPy from "../../../apworld/needlecheck/options.py?raw";
import archipelagoMeta from "../../../apworld/needlecheck/archipelago.json?raw";
import schema from "../../../apworld/needlecheck/crate.schema.json?raw";
import gameInfo from "../../../apworld/needlecheck/docs/en_Needlecheck.md?raw";
import setupDoc from "../../../apworld/needlecheck/docs/setup_en.md?raw";
import type { Album } from "../types";
import { toPlayerYaml } from "./player-yaml";

function packReadme(slot: string): string {
  return [
    "Needlecheck world pack",
    "",
    "The apworld is generic. Your albums are in Needlecheck.yaml, under Needlecheck.crate.",
    "A track is listed only if it has a YouTube video id or a file path.",
    "",
    "1. Copy needlecheck.apworld into Archipelago's custom_worlds folder.",
    "2. Copy Needlecheck.yaml into Players.",
    `3. The slot name is "${slot}". Change name: if you want a different one.`,
    "4. Generate and host. Connect from the station with game name Needlecheck.",
    "",
    "There is no voice client in this pack. YouTube and file paths are for the player that comes next.",
    "The station still plays short previews so you can hear the crate.",
    "",
  ].join("\n");
}

export function buildWorldPack(albums: Album[], slotName: string) {
  const slot = slotName.trim() || "DJ";
  const apworld = zipBytes({
    "needlecheck/__init__.py": worldPy,
    "needlecheck/crate.py": cratePy,
    "needlecheck/options.py": optionsPy,
    "needlecheck/archipelago.json": archipelagoMeta,
    "needlecheck/crate.schema.json": schema,
    "needlecheck/docs/en_Needlecheck.md": gameInfo,
    "needlecheck/docs/setup_en.md": setupDoc,
  });
  return {
    "needlecheck.apworld": apworld,
    "Needlecheck.yaml": toPlayerYaml(albums, slot),
    "README.txt": packReadme(slot),
  };
}

export function downloadWorldPack(albums: Album[], slotName: string) {
  downloadZip("needlecheck-world.zip", buildWorldPack(albums, slotName));
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
    const encodedName = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + encodedName.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, now.time, true);
    view.setUint16(12, now.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, encodedName.length, true);
    local.set(encodedName, 30);
    chunks.push(local, data);

    const header = new Uint8Array(46 + encodedName.length);
    const centralView = new DataView(header.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, now.time, true);
    centralView.setUint16(14, now.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, encodedName.length, true);
    centralView.setUint32(42, offset, true);
    header.set(encodedName, 46);
    central.push(header);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const chunk of [...chunks, ...central, end]) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

function dosTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day };
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { packagedApworldManifest } from "./manifest.ts";
import { zipBytes } from "./zip.ts";

/** The files that belong in needlecheck.apworld, with the container manifest stamped. */
export function apworldFiles(worldDir: string): Record<string, Uint8Array> {
  const root = path.resolve(worldDir);
  const folder = path.basename(root);
  const files: Record<string, Uint8Array> = {};

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      if (name === "__pycache__" || name.endsWith(".pyc")) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = path.relative(path.dirname(root), abs).split(path.sep).join("/");
      if (rel === `${folder}/archipelago.json`) {
        files[rel] = new TextEncoder().encode(packagedApworldManifest(readFileSync(abs, "utf8")));
      } else {
        files[rel] = new Uint8Array(readFileSync(abs));
      }
    }
  }

  walk(root);
  return files;
}

export function packApworld(worldDir: string): Uint8Array {
  return zipBytes(apworldFiles(worldDir));
}

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packApworld } from "../src/lib/ap/pack.ts";

const here = dirname(fileURLToPath(import.meta.url));
const world = resolve(here, "../apworld/needlecheck");
const out = resolve(process.argv[2] ?? resolve(here, "../dist/needlecheck.apworld"));
mkdirSync(dirname(out), { recursive: true });
const bytes = packApworld(world);
writeFileSync(out, bytes);
console.log(`Wrote ${out} (${bytes.length} bytes)`);

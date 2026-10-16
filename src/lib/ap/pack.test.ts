import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { apworldFiles, packApworld } from "./pack.ts";

const world = fileURLToPath(new URL("../../../apworld/needlecheck", import.meta.url));

test("the packed apworld stamps the container manifest and keeps the world files", () => {
  const files = apworldFiles(world);
  assert.ok(files["needlecheck/__init__.py"]);
  assert.ok(files["needlecheck/crate.py"]);
  assert.equal(files["needlecheck/__pycache__/crate.pyc"], undefined);
  const manifest = JSON.parse(new TextDecoder().decode(files["needlecheck/archipelago.json"])) as Record<string, unknown>;
  assert.equal(manifest.game, "Needlecheck");
  assert.equal(manifest.version, 7);
  assert.equal(manifest.compatible_version, 7);
  assert.equal(manifest.world_version, "0.3.0");

  const packed = packApworld(world);
  assert.equal(packed[0], 0x50);
  assert.equal(packed[1], 0x4b);
});

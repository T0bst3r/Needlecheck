import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { packagedApworldManifest } from "./manifest.ts";

test("the packaged manifest is a version 7 apworld container", () => {
  const source = readFileSync(new URL("../../../apworld/needlecheck/archipelago.json", import.meta.url), "utf8");
  const authored = JSON.parse(source) as Record<string, unknown>;
  assert.equal(authored.game, "Needlecheck");
  assert.equal(authored.version, undefined);
  assert.equal(authored.compatible_version, undefined);

  const packed = JSON.parse(packagedApworldManifest(source)) as Record<string, unknown>;
  assert.equal(packed.game, "Needlecheck");
  assert.equal(packed.world_version, "0.3.0");
  assert.equal(packed.minimum_ap_version, "0.5.0");
  assert.deepEqual(packed.authors, ["Needlecheck"]);
  assert.equal(packed.version, 7);
  assert.equal(packed.compatible_version, 7);
});

test("a manifest without a game name is refused", () => {
  assert.throws(() => packagedApworldManifest("{}"), /missing game/);
});

/** Archipelago APContainer scheme. Worlds at this version set both fields to 7. */
export const APWORLD_CONTAINER_VERSION = 7;

/**
 * Stamp the packaging fields onto the world folder's manifest.
 * Those two fields are written by the packager, not stored in the source file,
 * because the launcher adds them itself when it builds an apworld.
 * Without them Archipelago treats the zip as invalid and will refuse it in 0.7.0.
 */
export function packagedApworldManifest(source: string): string {
  const parsed: unknown = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("archipelago.json must be an object.");
  }
  const manifest = parsed as Record<string, unknown>;
  if (typeof manifest.game !== "string" || !manifest.game.trim()) {
    throw new Error("archipelago.json is missing game.");
  }
  return `${JSON.stringify(
    {
      ...manifest,
      version: APWORLD_CONTAINER_VERSION,
      compatible_version: APWORLD_CONTAINER_VERSION,
    },
    null,
    2,
  )}\n`;
}

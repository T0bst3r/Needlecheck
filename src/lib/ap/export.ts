import type { Album } from "../types";
import { toPlayerYaml } from "./player-yaml";

export function downloadPlayerYaml(albums: Album[], slotName: string) {
  const slot = slotName.trim() || "DJ";
  const blob = new Blob([toPlayerYaml(albums, slot)], { type: "application/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Needlecheck.yaml";
  a.click();
  URL.revokeObjectURL(url);
}

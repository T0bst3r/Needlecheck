export const GAME_NAME = "Needlecheck";
export const FILLER_NAME = "Liner Notes";

export function albumItemName(albumName) {
  return `Album - ${albumName}`;
}

export function trackLocationName(trackName, albumName) {
  return `First Play - ${trackName} [${albumName}]`;
}

export function hash32(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function stableId(salt, min, used) {
  let id = min + (hash32(salt) % 800000);
  while (used.has(id) || id <= 0) id += 1;
  used.add(id);
  return id;
}

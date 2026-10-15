export function parseUncheckedPercent(value, fallback = 80) {
  if (value == null || String(value).trim() === "") return fallback;
  const n = Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0 || n > 100) return fallback;
  return n;
}

export function freshLabel(percent) {
  if (percent >= 100) return "Unchecked songs play first";
  if (percent <= 0) return "Checked and unchecked songs are equally likely";
  return `About ${percent}% unchecked, ${100 - percent}% already checked`;
}

export function chooseTrack({
  albums,
  isUnlocked,
  isPlayed,
  shuffle,
  avoid,
  uncheckedPercent = 80,
  preferPlayed = false,
  rand = Math.random,
}) {
  const tracks = [];
  for (const album of albums) {
    if (!isUnlocked(album.id)) continue;
    for (const track of album.tracks) {
      if (avoid?.has(track.id)) continue;
      tracks.push(track);
    }
  }
  if (!tracks.length) return null;
  const fresh = tracks.filter((track) => !isPlayed(track.id));
  const heard = tracks.filter((track) => isPlayed(track.id));
  let pool = tracks;
  if (preferPlayed && heard.length) {
    pool = heard;
  } else if (fresh.length && heard.length) {
    const bias = Math.min(100, Math.max(0, uncheckedPercent));
    if (bias >= 100 || (bias > 0 && rand() < bias / 100)) pool = fresh;
    else if (bias > 0) pool = heard;
  } else if (fresh.length) {
    pool = fresh;
  }
  if (!shuffle) {
    for (const album of albums) {
      if (!isUnlocked(album.id)) continue;
      const hit = album.tracks.find((track) => pool.some((candidate) => candidate.id === track.id));
      if (hit) return hit;
    }
  }
  return pool[Math.floor(rand() * pool.length)];
}

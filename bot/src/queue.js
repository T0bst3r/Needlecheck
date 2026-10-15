export function chooseTrack({ albums, isUnlocked, isPlayed, shuffle, avoid, preferPlayed }) {
  const tracks = [];
  for (const album of albums) {
    if (!isUnlocked(album.id)) continue;
    for (const track of album.tracks) {
      if (avoid?.has(track.id)) continue;
      tracks.push(track);
    }
  }
  if (!tracks.length) return null;
  let pool = tracks;
  if (preferPlayed) {
    const played = tracks.filter((track) => isPlayed(track.id));
    if (played.length) pool = played;
  } else {
    const fresh = tracks.filter((track) => !isPlayed(track.id));
    if (fresh.length) pool = fresh;
  }
  if (!shuffle) {
    for (const album of albums) {
      if (!isUnlocked(album.id)) continue;
      const hit = album.tracks.find((track) => pool.some((candidate) => candidate.id === track.id));
      if (hit) return hit;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

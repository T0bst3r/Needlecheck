import { create } from "zustand";
import { persist } from "zustand/middleware";
import { audioEngine } from "./audio-engine";
import { isPlaybackSource } from "./ap/source";
import { exportableAlbums, trackInWorld } from "./ap/player-yaml";
import { ArchipelagoClient } from "./ap/protocol";
import { HELP, LOCAL_COMMANDS, parseCommand } from "./commands";
import { DEFAULT_CRATE } from "./default-crate";
import { BOT_NAME, GAME_NAME, REMOTE_PLAYERS } from "./flavor";
import { newSeed } from "./rng";
import type { Album, ChatMessage, ItemClass, LiveConfig, Placement, PlaybackSource, RawAlbum, RawTrack, ReceivedItem, RemoteGift, Track, ViewId } from "./types";
import { albumById, albumByItemId, allTracks, buildCrate, generateWorld, trackById } from "./world";
import { uid } from "./utils";

export const DEFAULT_SEED = 48291;

let liveClient: ArchipelagoClient | null = null;
let startedFor: string | null = null;
let trapTimer: number | null = null;

function toRaw(album: Album): RawAlbum {
  return {
    id: album.id,
    name: album.name,
    artist: album.artist,
    artwork: album.artwork,
    year: album.year,
    spotifyId: album.spotifyId,
    source: album.source,
    tracks: album.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      previewUrl: t.previewUrl,
      durationMs: t.durationMs,
      trackNumber: t.trackNumber,
      spotifyId: t.spotifyId,
      source: t.source,
      included: t.included,
    })),
  };
}

function msg(partial: Omit<ChatMessage, "id" | "at">): ChatMessage {
  return { id: uid("m"), at: Date.now(), ...partial };
}

function classifyTone(c: ItemClass): string {
  if (c === "progression") return "progression";
  if (c === "useful") return "useful";
  if (c === "trap") return "trap";
  return "filler";
}

function introMessages(seed: number, starter: Album | undefined, total: number): ChatMessage[] {
  const n = starter?.tracks.length ?? 0;
  return [
    msg({
      kind: "system",
      author: "system",
      text: `${BOT_NAME} is online. Demo seed ${seed}. ${total} first-play locations in the crate.`,
    }),
    msg({
      kind: "bot",
      author: BOT_NAME,
      text: starter
        ? `Starter album unlocked: ${starter.name} — ${starter.artist}. Sphere 0 is ${n} tracks. First plays are checks. Unlocked albums join the rotation.`
        : "Add an album to the crate to begin.",
    }),
    msg({
      kind: "bot",
      author: BOT_NAME,
      text: "Type /play to drop the needle, or /help for commands.",
    }),
  ];
}

type StationState = {
  crate: Album[];
  seed: number;
  mode: "demo" | "live";
  live: LiveConfig;
  liveStatus: "idle" | "connecting" | "connected" | "error";
  liveError: string;
  placements: Record<number, Placement>;
  remoteGift: RemoteGift | null;
  unlockedAlbumIds: string[];
  checkedLocationIds: number[];
  receivedItems: ReceivedItem[];
  playedTrackIds: string[];
  nowPlayingId: string | null;
  queue: string[];
  isPlaying: boolean;
  shuffle: boolean;
  volume: number;
  progressMs: number;
  durationMs: number;
  chat: ChatMessage[];
  view: ViewId;
  victory: boolean;
  seenIntro: boolean;
  encoreAlbumId: string | null;
  searchBusy: boolean;

  hydrateEngine: () => void;
  setView: (view: ViewId) => void;
  setLive: (patch: Partial<LiveConfig>) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  play: (trackId?: string) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
  sendCommand: (text: string) => void;
  addAlbum: (raw: RawAlbum) => void;
  mergeAlbum: (raw: RawAlbum) => boolean;
  removeAlbum: (id: string) => void;
  toggleStarter: (id: string) => void;
  setTrackSource: (albumId: string, trackId: string, source: PlaybackSource | undefined) => void;
  setTrackIncluded: (albumId: string, trackId: string, included: boolean) => void;
  renameAlbum: (id: string, name: string, artist: string) => void;
  renameTrack: (albumId: string, trackId: string, name: string) => void;
  removeTrack: (albumId: string, trackId: string) => void;
  addTrack: (albumId: string, track: RawTrack) => void;
  upsertLocalAlbum: (raw: RawAlbum) => "added" | "merged" | "same";
  upsertLocalAlbums: (raws: RawAlbum[]) => { added: number; merged: number; same: number };
  newSeed: () => void;
  resetProgress: () => void;
  connectLive: () => Promise<void>;
  disconnectLive: () => void;
  exportPack: () => void;
  dismissIntro: () => void;
};

function unlockedTracks(s: Pick<StationState, "crate" | "unlockedAlbumIds">): Track[] {
  return s.crate.filter((a) => s.unlockedAlbumIds.includes(a.id)).flatMap((a) => a.tracks);
}

function pickNext(s: StationState): Track | undefined {
  if (s.queue.length) {
    const id = s.queue[0]!;
    return trackById(s.crate, id);
  }
  const pool = unlockedTracks(s);
  if (!pool.length) return undefined;
  if (s.encoreAlbumId) {
    const fromAlbum = pool.filter((t) => t.albumId === s.encoreAlbumId && t.id !== s.nowPlayingId);
    if (fromAlbum.length) return fromAlbum[Math.floor(Math.random() * fromAlbum.length)];
  }
  const unplayed = pool.filter((t) => !s.playedTrackIds.includes(t.id));
  const source = unplayed.length ? unplayed : pool;
  if (!s.shuffle && s.nowPlayingId) {
    const cur = trackById(s.crate, s.nowPlayingId);
    if (cur) {
      const album = albumById(s.crate, cur.albumId);
      const next = album?.tracks.find((t) => t.trackNumber === cur.trackNumber + 1);
      if (next && s.unlockedAlbumIds.includes(next.albumId)) return next;
    }
  }
  const avoid = source.filter((t) => t.id !== s.nowPlayingId);
  const bag = avoid.length ? avoid : source;
  return bag[Math.floor(Math.random() * bag.length)];
}

function applyBootstrap(seed = DEFAULT_SEED): Pick<
  StationState,
  | "crate"
  | "seed"
  | "placements"
  | "remoteGift"
  | "unlockedAlbumIds"
  | "checkedLocationIds"
  | "receivedItems"
  | "playedTrackIds"
  | "nowPlayingId"
  | "queue"
  | "isPlaying"
  | "progressMs"
  | "durationMs"
  | "chat"
  | "victory"
  | "encoreAlbumId"
> {
  const crate = buildCrate([], []);
  const world = generateWorld(crate, seed);
  const starter = crate.find((a) => a.starter);
  return {
    crate,
    seed,
    ...world,
    checkedLocationIds: [],
    receivedItems: [],
    playedTrackIds: [],
    nowPlayingId: null,
    queue: [],
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,
    chat: introMessages(seed, starter, allTracks(crate).length),
    victory: false,
    encoreAlbumId: null,
  };
}

export const useStation = create<StationState>()(
  persist(
    (set, get) => {
      const push = (m: Omit<ChatMessage, "id" | "at">) =>
        set((s) => ({ chat: [...s.chat, msg(m)].slice(-120) }));

      const grantItem = (item: Omit<ReceivedItem, "at">) => {
        const s = get();
        if (s.receivedItems.some((r) => r.itemId === item.itemId && r.itemName === item.itemName)) {
          return;
        }
        const album = albumByItemId(s.crate, item.itemId);
        const receivedItems = [...s.receivedItems, { ...item, at: Date.now() }];
        let unlockedAlbumIds = s.unlockedAlbumIds;
        if (album && !unlockedAlbumIds.includes(album.id)) {
          unlockedAlbumIds = [...unlockedAlbumIds, album.id];
        }
        set({ receivedItems, unlockedAlbumIds });
        push({
          kind: "item",
          author: BOT_NAME,
          text: album
            ? `${item.fromPlayer} sent ${item.itemName}. ${album.name} joins the rotation.`
            : `${item.fromPlayer} sent ${item.itemName} (${classifyTone(item.classification)}).`,
          art: album?.artwork,
          classification: item.classification,
        });

        if (item.classification === "trap") {
          if (item.itemName === "Needle Scratch") {
            push({ kind: "bot", author: BOT_NAME, text: "Needle scratch. Skipping." });
            window.setTimeout(() => get().skip(), 400);
          } else if (item.itemName === "Dead Air") {
            push({ kind: "bot", author: BOT_NAME, text: "Dead air on the channel." });
            get().pause();
            if (trapTimer) window.clearTimeout(trapTimer);
            trapTimer = window.setTimeout(() => get().skip(), 1800);
          } else if (item.itemName === "Misfile") {
            push({ kind: "bot", author: BOT_NAME, text: "Misfile — the next cue is out of order." });
          }
        } else if (item.classification === "useful") {
          if (item.itemName === "Encore") {
            const cur = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined;
            if (cur) set({ encoreAlbumId: cur.albumId });
            push({ kind: "bot", author: BOT_NAME, text: "Encore: staying on this album." });
          } else if (item.itemName === "Double A-Side") {
            const cur = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined;
            const album = cur ? albumById(s.crate, cur.albumId) : undefined;
            const extra = album?.tracks.find((t) => t.id !== cur?.id);
            if (extra) set({ queue: [extra.id, ...get().queue] });
            push({ kind: "bot", author: BOT_NAME, text: "Double A-side queued." });
          } else if (item.itemName === "Request Line") {
            const locked = s.crate.find((a) => !get().unlockedAlbumIds.includes(a.id));
            if (locked) {
              const loc = Object.values(get().placements).find((p) => p.itemId === locked.itemId);
              const host = allTracks(get().crate).find((t) => t.locationId === loc?.locationId);
              push({
                kind: "bot",
                author: BOT_NAME,
                text: host
                  ? `Request line: ${locked.itemName} is on ${host.locationName}.`
                  : `${locked.itemName} is still somewhere in the multiworld.`,
              });
            }
          }
        }

        const after = get();
        const total = allTracks(after.crate).length;
        if (total > 0 && after.playedTrackIds.length >= total && !after.victory) {
          set({ victory: true });
          push({
            kind: "system",
            author: "system",
            text: "Goal complete. Every track has had its first play. The crate is clear.",
          });
        }
      };

      const handleCheck = (track: Track) => {
        const s = get();
        if (s.checkedLocationIds.includes(track.locationId)) return;
        const checkedLocationIds = [...s.checkedLocationIds, track.locationId];
        const playedTrackIds = s.playedTrackIds.includes(track.id) ? s.playedTrackIds : [...s.playedTrackIds, track.id];
        set({ checkedLocationIds, playedTrackIds });

        if (s.mode === "live" && liveClient?.connected) {
          const id = liveClient.locationNameToId.get(track.locationName) ?? track.locationId;
          liveClient.checkLocations([id]);
          push({
            kind: "check",
            author: BOT_NAME,
            text: `First play — checked ${track.locationName}.`,
            art: track.artwork,
          });
        } else {
          const place = s.placements[track.locationId];
          if (!place) {
            push({
              kind: "check",
              author: BOT_NAME,
              text: `First play — checked ${track.locationName}.`,
              art: track.artwork,
            });
          } else if (place.destPlayer === "remote") {
            push({
              kind: "multi",
              author: BOT_NAME,
              text: `Checked ${track.locationName}. Sent ${place.itemName} to ${place.destName} (${place.destGame}).`,
              art: track.artwork,
              classification: place.classification,
            });
          } else {
            push({
              kind: "check",
              author: BOT_NAME,
              text: `First play — checked ${track.locationName}.`,
              art: track.artwork,
            });
            grantItem({
              itemId: place.itemId,
              itemName: place.itemName,
              classification: place.classification,
              fromPlayer: "Your world",
              locationName: track.locationName,
            });
          }
        }

        const after = get();
        if (after.mode === "demo" && after.remoteGift && !after.remoteGift.granted) {
          if (after.checkedLocationIds.length >= after.remoteGift.afterChecks) {
            const gift = after.remoteGift;
            set({ remoteGift: { ...gift, granted: true } });
            const from = REMOTE_PLAYERS[after.checkedLocationIds.length % REMOTE_PLAYERS.length]!;
            grantItem({
              itemId: gift.itemId,
              itemName: gift.itemName,
              classification: "progression",
              fromPlayer: `${from.name} (${from.game})`,
            });
          }
        }
      };

      const startTrack = (track: Track, queued = false) => {
        startedFor = null;
        set((s) => ({
          nowPlayingId: track.id,
          isPlaying: true,
          progressMs: 0,
          durationMs: track.previewUrl ? Math.min(track.durationMs, 30000) : 12000,
          queue: queued ? s.queue.filter((id) => id !== track.id) : s.queue,
          encoreAlbumId: s.encoreAlbumId === track.albumId ? null : s.encoreAlbumId,
        }));
        push({
          kind: "bot",
          author: BOT_NAME,
          text: `Now playing: ${track.name} — ${track.artist} · ${track.albumName}`,
          art: track.artwork,
        });
        void audioEngine.play(track.previewUrl, track.previewUrl ? Math.min(track.durationMs, 30000) : 12000);
      };

      return {
        ...applyBootstrap(),
        mode: "demo",
        live: {
          host: "archipelago.gg",
          port: "38281",
          slot: "DJ",
          password: "",
          game: GAME_NAME,
        },
        liveStatus: "idle",
        liveError: "",
        shuffle: true,
        volume: 0.85,
        view: "crate",
        seenIntro: false,
        searchBusy: false,

        hydrateEngine: () => {
          audioEngine.setVolume(get().volume);
          audioEngine.attach({
            onTime: (currentMs, durationMs) => set({ progressMs: currentMs, durationMs }),
            onStarted: () => {
              const s = get();
              const track = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined;
              if (!track) return;
              if (startedFor === track.id) return;
              startedFor = track.id;
              handleCheck(track);
            },
            onEnded: () => {
              const s = get();
              if (!s.isPlaying) return;
              const next = pickNext(get());
              if (next) startTrack(next, true);
              else set({ isPlaying: false, nowPlayingId: null });
            },
            onError: (message) => push({ kind: "system", author: "system", text: message }),
          });
        },

        setView: (view) => set({ view }),
        setLive: (patch) => set((s) => ({ live: { ...s.live, ...patch } })),
        setVolume: (v) => {
          audioEngine.setVolume(v);
          set({ volume: v });
        },
        toggleShuffle: () => {
          const next = !get().shuffle;
          set({ shuffle: next });
          push({ kind: "bot", author: BOT_NAME, text: next ? "Shuffle on. Rotation is random across unlocked albums." : "Shuffle off. Playing album order." });
        },

        play: (trackId) => {
          const s = get();
          if (trackId) {
            const t = trackById(s.crate, trackId);
            if (!t) return;
            if (!s.unlockedAlbumIds.includes(t.albumId)) {
              push({ kind: "bot", author: BOT_NAME, text: `${t.albumName} is still locked. Find its album item first.` });
              return;
            }
            startTrack(t);
            return;
          }
          if (s.nowPlayingId && !s.isPlaying) {
            get().resume();
            return;
          }
          const next = pickNext(s);
          if (!next) {
            push({ kind: "bot", author: BOT_NAME, text: "Nothing in rotation. Unlock an album or add one to the crate." });
            return;
          }
          startTrack(next, s.queue[0] === next.id);
        },

        pause: () => {
          audioEngine.pause();
          set({ isPlaying: false });
        },
        resume: () => {
          const s = get();
          if (!s.nowPlayingId) {
            get().play();
            return;
          }
          audioEngine.resume();
          set({ isPlaying: true });
        },
        skip: () => {
          const next = pickNext(get());
          if (next) startTrack(next, true);
          else {
            audioEngine.stop();
            set({ isPlaying: false, nowPlayingId: null });
          }
        },
        stop: () => {
          audioEngine.stop();
          set({ isPlaying: false, nowPlayingId: null, progressMs: 0 });
        },

        sendCommand: (text) => {
          const parsed = parseCommand(text);
          if (!parsed) return;
          push({ kind: "user", author: "You", text: text.startsWith("/") ? text : `/${text}` });
          const s = get();
          const { name, arg } = parsed;

          if (s.mode === "live" && liveClient?.connected && !LOCAL_COMMANDS.has(name)) {
            liveClient.say(text);
            return;
          }

          switch (name) {
            case "help":
              push({ kind: "bot", author: BOT_NAME, text: HELP });
              break;
            case "play": {
              if (!arg) {
                get().play();
                break;
              }
              const q = arg.toLowerCase();
              const tracks = unlockedTracks(get());
              const hit =
                tracks.find((t) => t.name.toLowerCase() === q) ||
                tracks.find((t) => t.name.toLowerCase().includes(q)) ||
                tracks.find((t) => t.albumName.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
              if (hit) get().play(hit.id);
              else {
                const locked = get().crate.find(
                  (a) =>
                    !get().unlockedAlbumIds.includes(a.id) &&
                    (a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)),
                );
                push({
                  kind: "bot",
                  author: BOT_NAME,
                  text: locked
                    ? `${locked.name} is in the crate but still locked behind its Archipelago item.`
                    : `Nothing unlocked matches “${arg}”.`,
                });
              }
              break;
            }
            case "pause":
              get().pause();
              push({ kind: "bot", author: BOT_NAME, text: "Paused." });
              break;
            case "resume":
            case "unpause":
              get().resume();
              break;
            case "skip":
            case "next":
              get().skip();
              break;
            case "stop":
              get().stop();
              push({ kind: "bot", author: BOT_NAME, text: "Stopped." });
              break;
            case "shuffle":
              get().toggleShuffle();
              break;
            case "np":
            case "nowplaying":
            case "now-playing": {
              const t = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined;
              push({
                kind: "bot",
                author: BOT_NAME,
                text: t ? `Now playing: ${t.name} — ${t.artist} · ${t.albumName}` : "Silence on the channel.",
                art: t?.artwork,
              });
              break;
            }
            case "queue": {
              const q = s.queue.map((id) => trackById(s.crate, id)?.name).filter(Boolean);
              push({
                kind: "bot",
                author: BOT_NAME,
                text: q.length ? `Queue: ${q.join(" · ")}` : "Queue is empty. Rotation picks from unlocked albums.",
              });
              break;
            }
            case "crate":
            case "unlocks": {
              const lines = s.crate.map((a) => {
                const on = s.unlockedAlbumIds.includes(a.id);
                const done = a.tracks.filter((t) => s.playedTrackIds.includes(t.id)).length;
                return `${on ? "unlocked" : "locked"}  ${a.name} — ${a.artist}  ${done}/${a.tracks.length}`;
              });
              push({ kind: "bot", author: BOT_NAME, text: lines.join("\n") || "Crate is empty." });
              break;
            }
            case "hint": {
              const q = arg.toLowerCase();
              const album = arg
                ? s.crate.find((a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q))
                : s.crate.find((a) => !s.unlockedAlbumIds.includes(a.id));
              if (!album) {
                push({ kind: "bot", author: BOT_NAME, text: "No matching album." });
                break;
              }
              if (s.unlockedAlbumIds.includes(album.id)) {
                push({ kind: "bot", author: BOT_NAME, text: `${album.name} is already in rotation.` });
                break;
              }
              const loc = Object.values(s.placements).find((p) => p.itemId === album.itemId);
              const host = allTracks(s.crate).find((t) => t.locationId === loc?.locationId);
              push({
                kind: "bot",
                author: BOT_NAME,
                text: host
                  ? `${album.itemName} is sitting on ${host.locationName}.`
                  : s.remoteGift?.itemId === album.itemId
                    ? `${album.itemName} is in another world. It arrives after ${s.remoteGift.afterChecks} of your checks.`
                    : `${album.itemName} is still in the multiworld.`,
              });
              break;
            }
            case "status": {
              const total = allTracks(s.crate).length;
              push({
                kind: "bot",
                author: BOT_NAME,
                text: [
                  `Mode ${s.mode} · seed ${s.seed}`,
                  `Albums ${s.unlockedAlbumIds.length}/${s.crate.length}`,
                  `Checks ${s.checkedLocationIds.length}/${total}`,
                  s.remoteGift && !s.remoteGift.granted
                    ? `Incoming gift in ${Math.max(0, s.remoteGift.afterChecks - s.checkedLocationIds.length)} checks`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              });
              break;
            }
            default:
              get().play();
              if (name !== "play") {
                /* already handled play without arg as fallback */
              }
          }
        },

        addAlbum: (raw) => {
          const s = get();
          if (s.crate.some((a) => a.id === raw.id)) {
            push({ kind: "bot", author: BOT_NAME, text: `${raw.name} is already in the crate.` });
            return;
          }
          const album = { ...raw, tracks: raw.tracks };
          const starters = s.crate.filter((a) => a.starter).map((a) => a.id);
          const crate = buildCrate([...s.crate.map(toRaw), album], starters);
          const added = crate.find((a) => a.id === album.id)!;
          const inWorld = added.tracks.filter((track) => trackInWorld(track)).length;
          set({ crate });
          push({
            kind: "system",
            author: "system",
            text: `Added ${added.name} — ${added.artist}. ${inWorld} of ${added.tracks.length} songs are in the world.`,
            art: added.artwork,
          });
        },

        mergeAlbum: (raw) => {
          const s = get();
          const existing = s.crate.find((album) => album.id === raw.id);
          if (!existing) return false;
          const previous = new Map(existing.tracks.map((track) => [track.id, track]));
          const tracks: RawTrack[] = raw.tracks.map((track) => {
            const kept = previous.get(track.id);
            if (!kept) return { ...track, included: false, source: undefined };
            return { ...track, source: kept.source, included: kept.included };
          });
          for (const track of existing.tracks) {
            if (tracks.some((item) => item.id === track.id)) continue;
            tracks.push({
              id: track.id,
              name: track.name,
              artist: track.artist,
              previewUrl: track.previewUrl,
              durationMs: track.durationMs,
              trackNumber: track.trackNumber,
              spotifyId: track.spotifyId,
              source: track.source,
              included: track.included,
            });
          }
          const starters = s.crate.filter((album) => album.starter).map((album) => album.id);
          const nextRaw = s.crate.map((album) => (album.id === raw.id ? { ...toRaw(album), tracks } : toRaw(album)));
          set({ crate: buildCrate(nextRaw, starters) });
          return true;
        },

        removeAlbum: (id) => {
          const s = get();
          const gone = s.crate.find((a) => a.id === id);
          const crate = s.crate.filter((a) => a.id !== id);
          const unlockedAlbumIds = s.unlockedAlbumIds.filter((x) => x !== id);
          const playing = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined;
          const stopNow = playing?.albumId === id;
          if (stopNow) audioEngine.stop();
          set({
            crate,
            unlockedAlbumIds,
            nowPlayingId: stopNow ? null : s.nowPlayingId,
            isPlaying: stopNow ? false : s.isPlaying,
            queue: s.queue.filter((tid) => crate.some((a) => a.tracks.some((t) => t.id === tid))),
          });
          push({ kind: "system", author: "system", text: `Removed ${gone?.name ?? "album"} from the crate.` });
        },

        toggleStarter: (id) => {
          const s = get();
          const album = s.crate.find((a) => a.id === id);
          if (!album) return;
          const crate = s.crate.map((a) => (a.id === id ? { ...a, starter: !a.starter } : a));
          if (!crate.some((a) => a.starter) && crate[0]) crate[0] = { ...crate[0], starter: true };
          set({ crate });
        },

        setTrackSource: (albumId, trackId, source) => {
          const album = get().crate.find((entry) => entry.id === albumId);
          const track = album?.tracks.find((entry) => entry.id === trackId);
          if (!track) return;
          if (source && !isPlaybackSource(source)) return;
          set({
            crate: get().crate.map((entry) =>
              entry.id === albumId
                ? {
                    ...entry,
                    tracks: entry.tracks.map((item) => (item.id === trackId ? { ...item, source } : item)),
                  }
                : entry,
            ),
          });
        },

        setTrackIncluded: (albumId, trackId, included) => {
          const album = get().crate.find((entry) => entry.id === albumId);
          if (!album?.tracks.some((track) => track.id === trackId)) return;
          set({
            crate: get().crate.map((entry) =>
              entry.id === albumId
                ? {
                    ...entry,
                    tracks: entry.tracks.map((item) => (item.id === trackId ? { ...item, included } : item)),
                  }
                : entry,
            ),
          });
        },

        renameAlbum: (id, name, artist) => {
          const nextName = name.trim();
          const nextArtist = artist.trim();
          if (!nextName || !nextArtist) return;
          const s = get();
          const album = s.crate.find((entry) => entry.id === id);
          if (!album || (album.name === nextName && album.artist === nextArtist)) return;
          const starters = s.crate.filter((entry) => entry.starter).map((entry) => entry.id);
          const next = s.crate.map(toRaw).map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  name: nextName,
                  artist: nextArtist,
                  tracks: entry.tracks.map((track) => ({
                    ...track,
                    artist: track.artist === album.artist ? nextArtist : track.artist,
                  })),
                }
              : entry,
          );
          set({ crate: buildCrate(next, starters) });
        },

        renameTrack: (albumId, trackId, name) => {
          const nextName = name.trim();
          if (!nextName) return;
          const s = get();
          const album = s.crate.find((entry) => entry.id === albumId);
          const track = album?.tracks.find((entry) => entry.id === trackId);
          if (!album || !track || track.name === nextName) return;
          const starters = s.crate.filter((entry) => entry.starter).map((entry) => entry.id);
          const next = s.crate.map(toRaw).map((entry) =>
            entry.id === albumId
              ? { ...entry, tracks: entry.tracks.map((item) => (item.id === trackId ? { ...item, name: nextName } : item)) }
              : entry,
          );
          set({ crate: buildCrate(next, starters) });
        },

        removeTrack: (albumId, trackId) => {
          const s = get();
          const album = s.crate.find((entry) => entry.id === albumId);
          if (!album?.tracks.some((track) => track.id === trackId)) return;
          const stopNow = s.nowPlayingId === trackId;
          if (stopNow) audioEngine.stop();
          const starters = s.crate.filter((entry) => entry.starter).map((entry) => entry.id);
          const next = s.crate.map(toRaw).map((entry) =>
            entry.id === albumId
              ? {
                  ...entry,
                  tracks: entry.tracks
                    .filter((track) => track.id !== trackId)
                    .map((track, index) => ({ ...track, trackNumber: index + 1 })),
                }
              : entry,
          );
          set({
            crate: buildCrate(next, starters),
            nowPlayingId: stopNow ? null : s.nowPlayingId,
            isPlaying: stopNow ? false : s.isPlaying,
          });
        },

        addTrack: (albumId, track) => {
          const s = get();
          const album = s.crate.find((entry) => entry.id === albumId);
          if (!album || album.tracks.some((item) => item.id === track.id)) return;
          const starters = s.crate.filter((entry) => entry.starter).map((entry) => entry.id);
          const next = s.crate.map(toRaw).map((entry) =>
            entry.id === albumId
              ? {
                  ...entry,
                  tracks: [
                    ...entry.tracks,
                    { ...track, artist: track.artist || entry.artist, trackNumber: entry.tracks.length + 1 },
                  ],
                }
              : entry,
          );
          set({ crate: buildCrate(next, starters) });
        },

        upsertLocalAlbum: (raw) => {
          const result = get().upsertLocalAlbums([raw]);
          if (result.added) return "added";
          if (result.merged) return "merged";
          return "same";
        },

        upsertLocalAlbums: (raws) => {
          const counts = { added: 0, merged: 0, same: 0 };
          if (!raws.length) return counts;
          const s = get();
          const next = s.crate.map(toRaw);
          for (const raw of raws) {
            const index = next.findIndex((album) => album.id === raw.id);
            if (index < 0) {
              next.push(raw);
              counts.added += 1;
              continue;
            }
            const known = new Set(next[index]!.tracks.map((track) => track.id));
            const extras = raw.tracks.filter((track) => !known.has(track.id));
            if (!extras.length) {
              counts.same += 1;
              continue;
            }
            next[index] = { ...next[index]!, tracks: [...next[index]!.tracks, ...extras] };
            counts.merged += 1;
          }
          if (counts.added || counts.merged) {
            const starters = s.crate.filter((album) => album.starter).map((album) => album.id);
            set({ crate: buildCrate(next, starters) });
          }
          return counts;
        },

        newSeed: () => {
          audioEngine.stop();
          const s = get();
          const seed = newSeed();
          const starters = s.crate.filter((a) => a.starter).map((a) => a.id);
          const crate = buildCrate(s.crate.map(toRaw), starters);
          const world = generateWorld(crate, seed);
          const starter = crate.find((a) => a.starter);
          set({
            crate,
            seed,
            ...world,
            checkedLocationIds: [],
            receivedItems: [],
            playedTrackIds: [],
            nowPlayingId: null,
            queue: [],
            isPlaying: false,
            progressMs: 0,
            victory: false,
            encoreAlbumId: null,
            chat: introMessages(seed, starter, allTracks(crate).length),
            mode: "demo",
          });
        },

        resetProgress: () => {
          audioEngine.stop();
          const s = get();
          const starters = s.crate.filter((a) => a.starter).map((a) => a.id);
          const unlocked = starters.length ? starters : s.crate[0] ? [s.crate[0].id] : [];
          set({
            unlockedAlbumIds: unlocked,
            checkedLocationIds: [],
            receivedItems: [],
            playedTrackIds: [],
            nowPlayingId: null,
            queue: [],
            isPlaying: false,
            progressMs: 0,
            victory: false,
            encoreAlbumId: null,
            remoteGift: s.remoteGift ? { ...s.remoteGift, granted: false } : null,
            chat: introMessages(s.seed, s.crate.find((a) => a.starter), allTracks(s.crate).length),
          });
        },

        connectLive: async () => {
          get().disconnectLive();
          const cfg = get().live;
          set({ liveStatus: "connecting", liveError: "", mode: "live" });
          const client = new ArchipelagoClient({
            onStatus: (status, detail) => {
              if (status === "connected") set({ liveStatus: "connected", liveError: "" });
              else if (status === "error") set({ liveStatus: "error", liveError: detail ?? "Failed" });
              else if (status === "disconnected") set((st) => ({ liveStatus: st.liveStatus === "connecting" ? "error" : "idle" }));
              else set({ liveStatus: "connecting" });
            },
            onPrint: (text) => push({ kind: "multi", author: "Archipelago", text }),
            onItems: (items) => {
              for (const it of items) {
                const name = liveClient?.itemIdToName.get(it.item) ?? `Item ${it.item}`;
                const album = get().crate.find((a) => a.itemName === name || a.itemId === it.item);
                grantItem({
                  itemId: album?.itemId ?? it.item,
                  itemName: name,
                  classification: album ? "progression" : "filler",
                  fromPlayer: "Archipelago",
                });
              }
            },
            onChecked: (locs) =>
              set((st) => ({
                checkedLocationIds: Array.from(new Set([...st.checkedLocationIds, ...locs])),
              })),
            onDataPackage: () => undefined,
            onConnected: (info) => {
              push({
                kind: "system",
                author: "system",
                text: `Connected as slot ${info.slot}. ${info.checked.length} locations already checked.`,
              });
              set((st) => ({
                checkedLocationIds: Array.from(new Set([...st.checkedLocationIds, ...info.checked])),
              }));
            },
          });
          liveClient = client;
          try {
            await client.connect(cfg);
            set({ mode: "live", liveStatus: "connected" });
            push({ kind: "system", author: "system", text: `Live multiworld on ${cfg.host}:${cfg.port}. First plays will send LocationChecks.` });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Connect failed";
            set({ liveStatus: "error", liveError: message, mode: "demo" });
            push({ kind: "system", author: "system", text: `Live connect failed: ${message}. Staying in demo seed.` });
          }
        },

        disconnectLive: () => {
          liveClient?.disconnect();
          liveClient = null;
          set({ liveStatus: "idle", mode: "demo" });
        },

        exportPack: () => {
          const s = get();
          const ready = exportableAlbums(s.crate);
          if (!ready.ok) {
            push({ kind: "system", author: "system", text: ready.reason });
            return;
          }
          if (ready.promotedStarter) {
            const id = ready.albums[0]!.id;
            set({
              crate: get().crate.map((album) => (album.id === id ? { ...album, starter: true } : album)),
            });
          }
          void import("./ap/export").then(({ downloadPlayerYaml }) => {
            downloadPlayerYaml(ready.albums, s.live.slot);
            push({
              kind: "system",
              author: "system",
              text: ready.promotedStarter
                ? `Downloaded Needlecheck.yaml. ${ready.albums[0]!.name} starts unlocked, because no starred album had a source.`
                : "Downloaded Needlecheck.yaml.",
            });
          });
        },

        dismissIntro: () => set({ seenIntro: true }),
      };
    },
    {
      name: "needlecheck-v1",
      version: 2,
      skipHydration: true,
      migrate: (persisted, version) => {
        if (version >= 2 || !persisted || typeof persisted !== "object") return persisted;
        const state = persisted as {
          crate?: Album[];
          unlockedAlbumIds?: string[];
        };
        const demoIds = new Set(DEFAULT_CRATE.map((album) => album.id));
        const crate = (state.crate ?? []).filter((album) => {
          if (!demoIds.has(album.id)) return true;
          return album.tracks.some((track) => isPlaybackSource(track.source));
        });
        const kept = new Set(crate.map((album) => album.id));
        return {
          ...state,
          crate,
          unlockedAlbumIds: (state.unlockedAlbumIds ?? []).filter((id) => kept.has(id)),
          seenIntro: false,
        };
      },
      partialize: (s) => ({
        crate: s.crate,
        seed: s.seed,
        mode: s.mode,
        live: s.live,
        placements: s.placements,
        remoteGift: s.remoteGift,
        unlockedAlbumIds: s.unlockedAlbumIds,
        checkedLocationIds: s.checkedLocationIds,
        receivedItems: s.receivedItems,
        playedTrackIds: s.playedTrackIds,
        shuffle: s.shuffle,
        volume: s.volume,
        chat: s.chat.slice(-80),
        victory: s.victory,
        seenIntro: s.seenIntro,
      }),
    },
  ),
);

export function useNowPlaying(): Track | undefined {
  return useStation((s) => (s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : undefined));
}

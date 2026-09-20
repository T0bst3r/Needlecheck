import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
import { a as SkipForward, c as Play, d as LockOpen, f as LayoutGrid, i as Star, l as Pause, m as Disc3, o as Shuffle, p as Globe, r as Trash2, s as Search, t as Volume2, u as Lock } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DAzIPY8s.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var BOT_NAME = "Needlecheck";
var GAME_NAME = "Needlecheck";
var FILLER_NAMES = [
	"Liner Notes",
	"Radio ID",
	"Cue Sheet",
	"Quiet Room",
	"White Label",
	"Runout Groove",
	"Set List",
	"Monitor Mix",
	"Test Tone",
	"Inner Sleeve"
];
var USEFUL_NAMES = [
	"Encore",
	"Request Line",
	"Double A-Side"
];
var TRAP_NAMES = [
	"Dead Air",
	"Needle Scratch",
	"Misfile"
];
var REMOTE_PLAYERS = [
	{
		name: "Maya",
		game: "A Link to the Past"
	},
	{
		name: "Rook",
		game: "Factorio"
	},
	{
		name: "Jun",
		game: "Hollow Knight"
	}
];
var REMOTE_ITEMS = [
	"Master Sword",
	"Pegasus Boots",
	"Factory Block",
	"Mothwing Cloak",
	"Vengeful Spirit",
	"Green Tunic",
	"Hookshot",
	"Lumafly Lantern"
];
function albumItemName(albumName) {
	return `Album - ${albumName}`;
}
function trackLocationName(trackName, albumName) {
	return `First Play - ${trackName} [${albumName}]`;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatTime(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "0:00";
	const total = Math.floor(ms / 1e3);
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function uid(prefix = "id") {
	return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
var badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums", {
	variants: { variant: {
		default: "bg-surface-2 text-muted",
		accent: "bg-fg text-bg",
		check: "bg-check/15 text-check",
		warn: "bg-warn/15 text-warn",
		danger: "bg-danger/15 text-danger"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
	type,
	className: cn("flex h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)]", "placeholder:text-subtle", "transition-[box-shadow] duration-150 ease-out", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", "disabled:cursor-not-allowed disabled:opacity-40", className),
	ref,
	...props
}));
Input.displayName = "Input";
function parseCommand(input) {
	const text = input.trim();
	if (!text) return null;
	const body = text.startsWith("/") ? text.slice(1) : text;
	const sp = body.indexOf(" ");
	return {
		name: (sp === -1 ? body : body.slice(0, sp)).toLowerCase(),
		arg: (sp === -1 ? "" : body.slice(sp + 1)).trim()
	};
}
var HELP = [
	"/play [song or album] — play from the unlocked crate",
	"/pause /resume /skip — transport",
	"/shuffle — toggle random rotation",
	"/np — now playing",
	"/crate — locked vs unlocked albums",
	"/hint [album] — scout where an album is sitting",
	"/status — sphere, checks, seed",
	"/help — this list"
].join("\n");
var LOCAL_COMMANDS = /* @__PURE__ */ new Set([
	"play",
	"pause",
	"resume",
	"unpause",
	"skip",
	"next",
	"shuffle",
	"np",
	"nowplaying",
	"now-playing",
	"queue",
	"crate",
	"unlocks",
	"hint",
	"status",
	"help",
	"stop"
]);
var SILENT_MS = 12e3;
var AudioEngine = class {
	audio = null;
	handlers = {};
	raf = 0;
	silentUntil = 0;
	silentStart = 0;
	usingSilent = false;
	volume = .85;
	attach(handlers) {
		this.handlers = handlers;
		this.ensure();
	}
	ensure() {
		if (this.audio || typeof Audio === "undefined") return;
		const audio = new Audio();
		audio.preload = "auto";
		audio.volume = this.volume;
		audio.addEventListener("timeupdate", () => {
			if (this.usingSilent) return;
			this.handlers.onTime?.(audio.currentTime * 1e3, (audio.duration || 0) * 1e3);
		});
		audio.addEventListener("ended", () => {
			if (!this.usingSilent) this.handlers.onEnded?.();
		});
		audio.addEventListener("playing", () => {
			if (!this.usingSilent) this.handlers.onStarted?.();
		});
		audio.addEventListener("error", () => {
			this.handlers.onError?.("Preview failed to load.");
		});
		this.audio = audio;
	}
	setVolume(v) {
		this.volume = Math.min(1, Math.max(0, v));
		if (this.audio) this.audio.volume = this.volume;
	}
	async play(url, durationMs) {
		this.ensure();
		this.stopSilent();
		if (!url) {
			this.startSilent(durationMs ?? SILENT_MS);
			return;
		}
		this.usingSilent = false;
		const audio = this.audio;
		if (!audio) {
			this.startSilent(durationMs ?? SILENT_MS);
			return;
		}
		audio.pause();
		audio.src = url;
		try {
			await audio.play();
		} catch {
			this.startSilent(Math.min(durationMs ?? SILENT_MS, 3e4));
		}
	}
	pause() {
		this.audio?.pause();
		if (this.usingSilent) this.stopSilent(false);
	}
	resume() {
		if (this.usingSilent) {
			this.startSilent(this.silentUntil - this.silentStart, true);
			return;
		}
		this.audio?.play().catch(() => void 0);
	}
	stop() {
		this.stopSilent();
		if (this.audio) {
			this.audio.pause();
			this.audio.removeAttribute("src");
		}
	}
	startSilent(durationMs, fromResume = false) {
		this.usingSilent = true;
		if (!fromResume) {
			this.silentStart = performance.now();
			this.silentUntil = this.silentStart + durationMs;
			this.handlers.onStarted?.();
		}
		const tick = () => {
			if (!this.usingSilent) return;
			const now = performance.now();
			const dur = this.silentUntil - this.silentStart;
			const cur = Math.min(dur, now - this.silentStart);
			this.handlers.onTime?.(cur, dur);
			if (now >= this.silentUntil) {
				this.usingSilent = false;
				this.handlers.onEnded?.();
				return;
			}
			this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
	}
	stopSilent(reset = true) {
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
		if (reset) this.usingSilent = false;
	}
};
var audioEngine = new AudioEngine();
function toWsUrl(host, port) {
	const raw = host.trim();
	if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
		if (raw.includes(":", 6) && !raw.match(/:\d+$/)) return raw;
		if (/\d+$/.test(raw) || raw.includes("/")) return raw;
		return `${raw}:${port.trim()}`;
	}
	const h = raw.replace(/\/$/, "") || "archipelago.gg";
	const p = port.trim() || "38281";
	return `${h.includes("archipelago.gg") || h.includes(".") ? "wss" : "ws"}://${h}:${p}`;
}
var ArchipelagoClient = class {
	ws = null;
	handlers;
	locationNameToId = /* @__PURE__ */ new Map();
	itemIdToName = /* @__PURE__ */ new Map();
	itemNameToId = /* @__PURE__ */ new Map();
	constructor(handlers) {
		this.handlers = handlers;
	}
	get connected() {
		return this.ws?.readyState === WebSocket.OPEN;
	}
	async connect(opts) {
		this.disconnect();
		const url = toWsUrl(opts.host, opts.port);
		this.handlers.onStatus("connecting", url);
		await new Promise((resolve, reject) => {
			let settled = false;
			const ws = new WebSocket(url);
			this.ws = ws;
			const fail = (msg) => {
				if (settled) return;
				settled = true;
				this.handlers.onStatus("error", msg);
				reject(new Error(msg));
			};
			ws.onerror = () => fail("Could not reach the Archipelago server.");
			ws.onclose = () => {
				this.handlers.onStatus("disconnected");
				if (!settled) fail("Connection closed.");
			};
			ws.onopen = () => {};
			ws.onmessage = (ev) => {
				let packets = [];
				try {
					packets = JSON.parse(String(ev.data));
				} catch {
					return;
				}
				for (const pkt of packets) if (pkt.cmd === "RoomInfo") this.send([{
					cmd: "GetDataPackage",
					games: pkt.games ?? []
				}, {
					cmd: "Connect",
					password: opts.password || "",
					game: opts.game,
					name: opts.slot,
					uuid: crypto.randomUUID?.() ?? `${Date.now()}`,
					version: {
						major: 0,
						minor: 6,
						build: 2,
						class: "Version"
					},
					items_handling: 7,
					tags: ["AP", "Needlecheck"],
					slot_data: true
				}]);
				else if (pkt.cmd === "DataPackage") {
					const g = pkt.data?.games;
					if (g) {
						this.ingestPackage(g);
						this.handlers.onDataPackage(g);
					}
				} else if (pkt.cmd === "Connected") {
					if (!settled) {
						settled = true;
						this.handlers.onStatus("connected");
						resolve();
					}
					this.handlers.onConnected({
						slot: pkt.slot,
						checked: pkt.checked_locations ?? [],
						missing: pkt.missing_locations ?? [],
						players: (pkt.players ?? []).map((p) => ({
							name: p.name,
							alias: p.alias,
							slot: p.slot
						}))
					});
				} else if (pkt.cmd === "ConnectionRefused") {
					const errors = pkt.errors ?? ["refused"];
					fail(errors.join(", "));
				} else if (pkt.cmd === "ReceivedItems") {
					const items = pkt.items ?? [];
					this.handlers.onItems(items, pkt.index ?? 0);
				} else if (pkt.cmd === "PrintJSON") {
					const text = flattenPrint(pkt);
					if (text) this.handlers.onPrint(text);
				} else if (pkt.cmd === "RoomUpdate") {
					const checked = pkt.checked_locations;
					if (checked?.length) this.handlers.onChecked(checked);
				}
			};
		});
	}
	checkLocations(ids) {
		if (!ids.length || !this.connected) return;
		this.send([{
			cmd: "LocationChecks",
			locations: ids
		}]);
	}
	say(text) {
		if (!this.connected || !text.trim()) return;
		this.send([{
			cmd: "Say",
			text: text.trim()
		}]);
	}
	disconnect() {
		if (this.ws) {
			this.ws.onclose = null;
			this.ws.onerror = null;
			this.ws.onmessage = null;
			try {
				this.ws.close();
			} catch {}
		}
		this.ws = null;
	}
	ingestPackage(games) {
		for (const g of Object.values(games)) {
			for (const [name, id] of Object.entries(g.location_name_to_id ?? {})) this.locationNameToId.set(name, id);
			for (const [name, id] of Object.entries(g.item_name_to_id ?? {})) {
				this.itemNameToId.set(name, id);
				this.itemIdToName.set(id, name);
			}
		}
	}
	send(packets) {
		if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(packets));
	}
};
function flattenPrint(pkt) {
	if (typeof pkt.data === "string") return pkt.data;
	const parts = pkt.data;
	if (Array.isArray(parts)) return parts.map((p) => p.text ?? "").join("");
	return "";
}
/** Baked Night Shift crate — real iTunes catalog + 30s previews. */
var DEFAULT_CRATE = [
	{
		"id": "1109714933",
		"name": "In Rainbows",
		"artist": "Radiohead",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/600x600bb.jpg",
		"year": 2007,
		"tracks": [
			{
				"id": "1109715066",
				"name": "15 Step",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/79/90/a579906e-5bc2-24a8-43b6-81d2a042eb18/mzaf_14665977354765177718.plus.aac.p.m4a",
				"durationMs": 237293,
				"trackNumber": 1
			},
			{
				"id": "1109715161",
				"name": "Bodysnatchers",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e4/2a/01/e42a018f-ec7b-e7fa-5034-6050d339a5ef/mzaf_5464120641250363278.plus.aac.p.m4a",
				"durationMs": 242293,
				"trackNumber": 2
			},
			{
				"id": "1109715165",
				"name": "Nude",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b0/d6/9d/b0d69d33-0683-8f06-b768-95f0056af16f/mzaf_17403465269284578717.plus.aac.p.m4a",
				"durationMs": 255387,
				"trackNumber": 3
			},
			{
				"id": "1109715168",
				"name": "Weird Fishes / Arpeggi",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/3a/12/eb/3a12ebaf-89c1-1ac9-6821-3a1de510ef51/mzaf_14543910941982290973.plus.aac.p.m4a",
				"durationMs": 318187,
				"trackNumber": 4
			},
			{
				"id": "1109715293",
				"name": "All I Need",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8e/c3/d5/8ec3d546-17d7-3322-662d-e09a89fbefd8/mzaf_7126755987197906481.plus.aac.p.m4a",
				"durationMs": 228747,
				"trackNumber": 5
			},
			{
				"id": "1109715308",
				"name": "Faust Arp",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9c/82/92/9c82920e-c90a-1e0a-1e60-bf604bae80d9/mzaf_3298592383350408547.plus.aac.p.m4a",
				"durationMs": 129680,
				"trackNumber": 6
			},
			{
				"id": "1109715309",
				"name": "Reckoner",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d9/84/2b/d9842b3d-350e-3c36-3681-df31588ab202/mzaf_1179366535087719219.plus.aac.p.m4a",
				"durationMs": 290213,
				"trackNumber": 7
			},
			{
				"id": "1109715467",
				"name": "House of Cards",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e7/7f/49/e77f4904-d37a-deed-9237-6fd6f88615e3/mzaf_9468509769421853320.plus.aac.p.m4a",
				"durationMs": 328293,
				"trackNumber": 8
			},
			{
				"id": "1109715469",
				"name": "Jigsaw Falling Into Place",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/76/0b/04/760b0415-ed76-cc02-b688-1a49789dbc34/mzaf_10830186063789872228.plus.aac.p.m4a",
				"durationMs": 248893,
				"trackNumber": 9
			},
			{
				"id": "1109715479",
				"name": "Videotape",
				"artist": "Radiohead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8f/04/26/8f0426ef-4d1b-c1e7-dcde-dfb868f2c52a/mzaf_6071995543397747319.plus.aac.p.m4a",
				"durationMs": 279634,
				"trackNumber": 10
			}
		]
	},
	{
		"id": "268443092",
		"name": "Kind of Blue",
		"artist": "Miles Davis",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music/7f/9f/d6/mzi.vtnaewef.jpg/600x600bb.jpg",
		"year": 1959,
		"tracks": [
			{
				"id": "268443097",
				"name": "So What",
				"artist": "Miles Davis",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/54/e8/0a/54e80a8b-1d60-6b59-e908-6fd65c4ff783/mzaf_2469862574651846302.plus.aac.p.m4a",
				"durationMs": 547983,
				"trackNumber": 1
			},
			{
				"id": "268443113",
				"name": "Freddie Freeloader",
				"artist": "Miles Davis",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/47/a1/16/47a116d0-40e5-a1ed-6a52-d8af1e21deb0/mzaf_8345337894870074911.plus.aac.p.m4a",
				"durationMs": 588411,
				"trackNumber": 2
			},
			{
				"id": "268443131",
				"name": "Blue In Green",
				"artist": "Miles Davis",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/af/5d/60/af5d603d-d0db-c066-3fe6-54bb2b51bdfb/mzaf_1714770531795139058.plus.aac.p.m4a",
				"durationMs": 335939,
				"trackNumber": 3
			},
			{
				"id": "268443200",
				"name": "All Blues",
				"artist": "Miles Davis",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/fd/e6/68fde6cb-d822-989b-b355-66cf8f8a67a4/mzaf_15826989764965426693.plus.aac.p.m4a",
				"durationMs": 692897,
				"trackNumber": 4
			},
			{
				"id": "268443216",
				"name": "Flamenco Sketches",
				"artist": "Miles Davis",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f1/50/34/f15034d6-05e2-952c-3e86-f767c079c8bb/mzaf_6910963868402689544.plus.aac.p.m4a",
				"durationMs": 561105,
				"trackNumber": 5
			}
		]
	},
	{
		"id": "1440653096",
		"name": "Dummy",
		"artist": "Portishead",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c1/71/93/c1719342-df7d-e9c5-c87c-53dae5afb289/00042282855329.rgb.jpg/600x600bb.jpg",
		"year": 1994,
		"tracks": [
			{
				"id": "1440653098",
				"name": "Mysterons",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4d/a8/96/4da89648-aab8-f129-983c-88eadbc41127/mzaf_10046411872083790441.plus.aac.p.m4a",
				"durationMs": 305240,
				"trackNumber": 1
			},
			{
				"id": "1440653101",
				"name": "Sour Times",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7e/f6/e3/7ef6e383-ff78-f34f-4824-78be29bc7aae/mzaf_2959336855850238077.plus.aac.p.m4a",
				"durationMs": 252267,
				"trackNumber": 2
			},
			{
				"id": "1440653106",
				"name": "Strangers",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a8/ee/e7/a8eee7c5-b311-a657-ce85-6448c43c787a/mzaf_16776633165317330451.plus.aac.p.m4a",
				"durationMs": 237600,
				"trackNumber": 3
			},
			{
				"id": "1440653107",
				"name": "It Could Be Sweet",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/98/78/82/987882c0-5b71-8e93-2baa-0483aa4aa25f/mzaf_15168525430095011375.plus.aac.p.m4a",
				"durationMs": 257160,
				"trackNumber": 4
			},
			{
				"id": "1440653108",
				"name": "Wandering Star",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/89/e8/5d/89e85d4c-6631-fe68-7c4e-a3e84dd03ee0/mzaf_6423228021913800423.plus.aac.p.m4a",
				"durationMs": 293200,
				"trackNumber": 5
			},
			{
				"id": "1440653109",
				"name": "It's a Fire",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/dd/1b/a5dd1b66-d89e-0e1c-9c71-473f262c304f/mzaf_15608238577360154209.plus.aac.p.m4a",
				"durationMs": 226200,
				"trackNumber": 6
			},
			{
				"id": "1440653110",
				"name": "Numb",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8a/8d/42/8a8d42dc-9bb4-14e1-ff97-1cc5c72cffb9/mzaf_14671208066758137299.plus.aac.p.m4a",
				"durationMs": 235800,
				"trackNumber": 7
			},
			{
				"id": "1440653203",
				"name": "Roads",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f4/94/3f/f4943f50-be3b-629b-3612-68e32a1a7c8f/mzaf_12088733510844922268.plus.aac.p.m4a",
				"durationMs": 303973,
				"trackNumber": 8
			},
			{
				"id": "1440653204",
				"name": "Pedestal",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/de/79/0a/de790a43-e116-ba7f-7720-357f1a60505e/mzaf_2285304572877661197.plus.aac.p.m4a",
				"durationMs": 220400,
				"trackNumber": 9
			},
			{
				"id": "1440653205",
				"name": "Biscuit",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ba/df/1c/badf1c88-c5e4-40d8-b14c-65b4801d0711/mzaf_8837222660693281886.plus.aac.p.m4a",
				"durationMs": 302600,
				"trackNumber": 10
			},
			{
				"id": "1440653206",
				"name": "Glory Box",
				"artist": "Portishead",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/40/b2/a4/40b2a45b-eacf-818f-7af6-f7f8b3885230/mzaf_16256497095178600689.plus.aac.p.m4a",
				"durationMs": 308627,
				"trackNumber": 11
			}
		]
	},
	{
		"id": "697194953",
		"name": "Discovery",
		"artist": "Daft Punk",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg",
		"year": 2001,
		"tracks": [
			{
				"id": "697195462",
				"name": "One More Time",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5d/93/d8/5d93d83f-ad1e-da4d-1d79-9937bdff24ec/mzaf_14396932211949300852.plus.aac.p.m4a",
				"durationMs": 320357,
				"trackNumber": 1
			},
			{
				"id": "697195570",
				"name": "Aerodynamic",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0e/ab/8f/0eab8f87-87db-9501-110a-ad681b23ca0f/mzaf_16233060439128880755.plus.aac.p.m4a",
				"durationMs": 212547,
				"trackNumber": 2
			},
			{
				"id": "697195633",
				"name": "Digital Love",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/df/43/5b/df435bbf-129a-ec94-cebb-8c83e3a261e2/mzaf_13417326183095861767.plus.aac.p.m4a",
				"durationMs": 301373,
				"trackNumber": 3
			},
			{
				"id": "697195787",
				"name": "Harder Better Faster Stronger",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8d/a4/4e/8da44e8f-9705-6182-686c-332714c54671/mzaf_17406318046701183138.plus.aac.p.m4a",
				"durationMs": 224693,
				"trackNumber": 4
			},
			{
				"id": "697195813",
				"name": "Crescendolls",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e5/23/e9/e523e9ba-033e-b879-da3d-461d9b8b78bc/mzaf_8375481395149044603.plus.aac.p.m4a",
				"durationMs": 211640,
				"trackNumber": 5
			},
			{
				"id": "697195819",
				"name": "Nightvision",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8d/00/b2/8d00b2e1-0672-03f0-df9f-cc011626fe06/mzaf_18422326861735268875.plus.aac.p.m4a",
				"durationMs": 104467,
				"trackNumber": 6
			},
			{
				"id": "697195890",
				"name": "Superheroes",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ae/88/90/ae88903e-3f28-527f-1df2-f80a20b9adff/mzaf_9476856611102807301.plus.aac.p.m4a",
				"durationMs": 237800,
				"trackNumber": 7
			},
			{
				"id": "697195929",
				"name": "High Life",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/20/60/bc/2060bcff-569f-9f03-b5ab-d000d235896f/mzaf_152906689635921771.plus.aac.p.m4a",
				"durationMs": 201800,
				"trackNumber": 8
			},
			{
				"id": "697195941",
				"name": "Something About Us",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e5/6e/07/e56e0775-d44c-fc79-a8d8-78b46a825738/mzaf_9538225478116277548.plus.aac.p.m4a",
				"durationMs": 232667,
				"trackNumber": 9
			},
			{
				"id": "697195991",
				"name": "Voyager",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/d3/cf/60d3cf87-d9ac-03e5-a057-032b94cfd59e/mzaf_11149912225012968836.plus.aac.p.m4a",
				"durationMs": 227867,
				"trackNumber": 10
			},
			{
				"id": "697196125",
				"name": "Veridis Quo",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/cc/c4/e0ccc4af-ad90-59fe-9a7c-9c32d1a3c380/mzaf_2643765405421046671.plus.aac.p.m4a",
				"durationMs": 345187,
				"trackNumber": 11
			},
			{
				"id": "697196212",
				"name": "Short Circuit",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/85/a1/84/85a18405-2694-c9e2-c4eb-aa696b33d170/mzaf_11653878276245735503.plus.aac.p.m4a",
				"durationMs": 206867,
				"trackNumber": 12
			},
			{
				"id": "697196420",
				"name": "Face to Face",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ab/7e/7e/ab7e7e17-1803-4bb9-ff55-e3e8409925ca/mzaf_13376909038790853248.plus.aac.p.m4a",
				"durationMs": 240173,
				"trackNumber": 13
			},
			{
				"id": "697196490",
				"name": "Too Long",
				"artist": "Daft Punk",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/cb/b5/06/cbb506be-6759-9384-04a5-51fd5295cd9c/mzaf_13436507164328567604.plus.aac.p.m4a",
				"durationMs": 600293,
				"trackNumber": 14
			}
		]
	},
	{
		"id": "594061854",
		"name": "Rumours",
		"artist": "Fleetwood Mac",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4d/13/ba/4d13bac3-d3d5-7581-2c74-034219eadf2b/081227970949.jpg/600x600bb.jpg",
		"year": 1977,
		"tracks": [
			{
				"id": "594061855",
				"name": "Second Hand News",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4f/69/e6/4f69e68c-224c-39ce-e80c-6015940fb338/mzaf_8292619002307513028.plus.aac.p.m4a",
				"durationMs": 176307,
				"trackNumber": 1
			},
			{
				"id": "594061856",
				"name": "Dreams",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/d4/37/e7/d437e72a-c41b-332c-f196-bee295a9d673/mzaf_11574904347171701919.plus.aac.p.m4a",
				"durationMs": 257800,
				"trackNumber": 2
			},
			{
				"id": "594061857",
				"name": "Never Going Back Again",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/cc/40/a3/cc40a34c-abd6-9d92-0550-334961e8d97f/mzaf_3772783327912029759.plus.aac.p.m4a",
				"durationMs": 134400,
				"trackNumber": 3
			},
			{
				"id": "594061858",
				"name": "Don't Stop",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e4/ca/f0/e4caf07f-d12b-798a-8575-955769b944c8/mzaf_15645522731642409606.plus.aac.p.m4a",
				"durationMs": 193347,
				"trackNumber": 4
			},
			{
				"id": "594061859",
				"name": "Go Your Own Way",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d1/37/68/d1376853-ec1e-cce0-4ac9-2e98fc9d9c51/mzaf_7672022765745493173.plus.aac.p.m4a",
				"durationMs": 223613,
				"trackNumber": 5
			},
			{
				"id": "594061860",
				"name": "Songbird",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e2/e3/ed/e2e3edd6-396e-af02-2f25-a1d782a3c9ad/mzaf_17496093408504582747.plus.aac.p.m4a",
				"durationMs": 200813,
				"trackNumber": 6
			},
			{
				"id": "594061861",
				"name": "The Chain",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9e/f8/31/9ef83126-c5cf-f526-c26d-0c25895e4d9b/mzaf_9883179573566934970.plus.aac.p.m4a",
				"durationMs": 268200,
				"trackNumber": 7
			},
			{
				"id": "594061862",
				"name": "You Make Loving Fun",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cb/f1/5e/cbf15e46-6ec5-3ece-c618-cc89cf782d81/mzaf_16883027089202369242.plus.aac.p.m4a",
				"durationMs": 213693,
				"trackNumber": 8
			},
			{
				"id": "594061863",
				"name": "I Don't Want to Know",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fc/25/17/fc2517ca-af33-0270-ec21-38f9e337716c/mzaf_12026291331578309195.plus.aac.p.m4a",
				"durationMs": 196853,
				"trackNumber": 9
			},
			{
				"id": "594061864",
				"name": "Oh Daddy",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/19/ef/b6/19efb6a6-7ae2-a223-f94d-926a96972b61/mzaf_4427680510731131816.plus.aac.p.m4a",
				"durationMs": 236240,
				"trackNumber": 10
			},
			{
				"id": "594061865",
				"name": "Gold Dust Woman",
				"artist": "Fleetwood Mac",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/66/53/04/6653043a-1f8f-24c0-5b34-d0ecc585a290/mzaf_16896501534090061915.plus.aac.p.m4a",
				"durationMs": 295627,
				"trackNumber": 11
			}
		]
	},
	{
		"id": "1468202477",
		"name": "Blue Train",
		"artist": "John Coltrane",
		"artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6e/1a/13/6e1a134d-8f6f-d90f-b855-ea69436a2e8b/17UM1IM45370.rgb.jpg/600x600bb.jpg",
		"year": 1957,
		"tracks": [
			{
				"id": "1468202479",
				"name": "Blue Train (Remastered)",
				"artist": "John Coltrane",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/42/74/bd/4274bd86-1026-af36-de93-ba8ac03e9f8d/mzaf_9135411222931316696.plus.aac.p.m4a",
				"durationMs": 643128,
				"trackNumber": 1
			},
			{
				"id": "1468202480",
				"name": "Moment's Notice (Remastered)",
				"artist": "John Coltrane",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5c/ce/27/5cce27ee-9e85-22fa-a9ee-d4b58419156a/mzaf_1849383418212950843.plus.aac.p.m4a",
				"durationMs": 550189,
				"trackNumber": 2
			},
			{
				"id": "1468202482",
				"name": "Locomotion (Remastered)",
				"artist": "John Coltrane",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ec/95/02/ec95024a-5cd2-fd8b-c3e4-2c956d6dbac9/mzaf_3564519483171032333.plus.aac.p.m4a",
				"durationMs": 434624,
				"trackNumber": 3
			},
			{
				"id": "1468202483",
				"name": "I'm Old Fashioned (Remastered)",
				"artist": "John Coltrane",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/52/56/ab/5256ab61-0cc7-2815-44b3-63d20c132713/mzaf_7589924622666780795.plus.aac.p.m4a",
				"durationMs": 479024,
				"trackNumber": 4
			},
			{
				"id": "1468202484",
				"name": "Lazy Bird (Remastered)",
				"artist": "John Coltrane",
				"previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7b/80/ac/7b80acd9-0f01-e2e4-e26d-78b84e4f08fc/mzaf_1990400803837147500.plus.aac.p.m4a",
				"durationMs": 427342,
				"trackNumber": 5
			}
		]
	}
];
/** Mulberry32 — deterministic, tiny, good enough for a demo seed. */
function mulberry32(seed) {
	let a = seed >>> 0;
	return function next() {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function pick(arr, rand) {
	return arr[Math.floor(rand() * arr.length)];
}
function hash32(input) {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
function stableId(salt, min, used) {
	let id = min + hash32(salt) % 8e5;
	while (used.has(id) || id <= 0) id += 1;
	used.add(id);
	return id;
}
function newSeed() {
	return Math.floor(Math.random() * 9e4) + 1e4 | 0;
}
function buildCrate(raw, starterIds) {
	const used = /* @__PURE__ */ new Set();
	const starters = starterIds.filter((id) => raw.some((a) => a.id === id));
	const effectiveStarters = starters.length ? starters : raw[0] ? [raw[0].id] : [];
	return raw.map((album) => {
		const itemName = albumItemName(album.name);
		const itemId = stableId(`item:${album.id}`, 1e6, used);
		const tracks = album.tracks.map((t) => ({
			...t,
			albumId: album.id,
			albumName: album.name,
			artwork: album.artwork,
			locationName: trackLocationName(t.name, album.name),
			locationId: stableId(`loc:${t.id}`, 3e6, used)
		}));
		return {
			...album,
			itemId,
			itemName,
			starter: effectiveStarters.includes(album.id),
			tracks
		};
	});
}
function generateWorld(crate, seed) {
	const rand = mulberry32(seed);
	const used = /* @__PURE__ */ new Set([...crate.map((a) => a.itemId), ...crate.flatMap((a) => a.tracks.map((t) => t.locationId))]);
	const starters = crate.filter((a) => a.starter);
	const unlockedAlbumIds = (starters.length ? starters : crate[0] ? [crate[0]] : []).map((a) => a.id);
	const poolAlbums = crate.filter((a) => !unlockedAlbumIds.includes(a.id));
	let giftAlbum = null;
	const localAlbums = [...poolAlbums];
	if (localAlbums.length >= 3) {
		const idx = Math.floor(rand() * localAlbums.length);
		giftAlbum = localAlbums.splice(idx, 1)[0] ?? null;
	}
	const all = crate.flatMap((a) => a.tracks);
	const placements = {};
	const placedLoc = /* @__PURE__ */ new Set();
	const isAlbumPlaced = (album) => Object.values(placements).some((p) => p.itemId === album.itemId && p.destPlayer === "self");
	const reachable = () => all.filter((t) => {
		const album = crate.find((a) => a.id === t.albumId);
		if (!album) return false;
		return unlockedAlbumIds.includes(album.id) || isAlbumPlaced(album);
	});
	const remainingAlbums = [...localAlbums];
	let guard = 0;
	while (remainingAlbums.length && guard++ < 40) {
		const reach = reachable().filter((t) => !placedLoc.has(t.locationId)).sort((a, b) => a.trackNumber - b.trackNumber);
		if (!reach.length) break;
		const album = remainingAlbums.shift();
		const window = reach.slice(0, Math.max(1, Math.min(4, reach.length)));
		const loc = window[Math.floor(rand() * window.length)] ?? reach[0];
		placements[loc.locationId] = {
			locationId: loc.locationId,
			itemId: album.itemId,
			itemName: album.itemName,
			classification: "progression",
			destPlayer: "self"
		};
		placedLoc.add(loc.locationId);
	}
	const leftovers = all.filter((t) => !placedLoc.has(t.locationId));
	for (const album of remainingAlbums) {
		const loc = leftovers.shift();
		if (!loc) break;
		placements[loc.locationId] = {
			locationId: loc.locationId,
			itemId: album.itemId,
			itemName: album.itemName,
			classification: "progression",
			destPlayer: "self"
		};
		placedLoc.add(loc.locationId);
	}
	const empty = all.filter((t) => !placedLoc.has(t.locationId));
	const remoteCount = Math.min(8, Math.max(3, Math.floor(empty.length * .12)));
	for (let i = 0; i < remoteCount && empty.length; i++) {
		const loc = empty.shift();
		const player = pick(REMOTE_PLAYERS, rand);
		const item = pick(REMOTE_ITEMS, rand);
		placements[loc.locationId] = {
			locationId: loc.locationId,
			itemId: stableId(`remote:${loc.locationId}:${item}`, 4e6, used),
			itemName: item,
			classification: "filler",
			destPlayer: "remote",
			destName: player.name,
			destGame: player.game
		};
		placedLoc.add(loc.locationId);
	}
	for (const loc of empty) {
		const roll = rand();
		let classification = "filler";
		let name = pick(FILLER_NAMES, rand);
		if (roll > .92) {
			classification = "trap";
			name = pick(TRAP_NAMES, rand);
		} else if (roll > .82) {
			classification = "useful";
			name = pick(USEFUL_NAMES, rand);
		}
		placements[loc.locationId] = {
			locationId: loc.locationId,
			itemId: stableId(`fill:${loc.locationId}:${name}`, 2e6, used),
			itemName: name,
			classification,
			destPlayer: "self"
		};
		placedLoc.add(loc.locationId);
	}
	const starterTrackCount = crate.filter((a) => unlockedAlbumIds.includes(a.id)).reduce((n, a) => n + a.tracks.length, 0);
	return {
		placements,
		remoteGift: giftAlbum ? {
			itemId: giftAlbum.itemId,
			itemName: giftAlbum.itemName,
			albumId: giftAlbum.id,
			afterChecks: Math.max(4, Math.min(8, Math.ceil(starterTrackCount * .8))),
			granted: false
		} : null,
		unlockedAlbumIds
	};
}
function allTracks(crate) {
	return crate.flatMap((a) => a.tracks);
}
function trackById(crate, id) {
	for (const a of crate) {
		const t = a.tracks.find((x) => x.id === id);
		if (t) return t;
	}
}
function albumById(crate, id) {
	return crate.find((a) => a.id === id);
}
function albumByItemId(crate, itemId) {
	return crate.find((a) => a.itemId === itemId);
}
var DEFAULT_SEED = 48291;
var DEFAULT_STARTER_ID = "268443092";
var liveClient = null;
var startedFor = null;
var trapTimer = null;
function toRaw(album) {
	return {
		id: album.id,
		name: album.name,
		artist: album.artist,
		artwork: album.artwork,
		year: album.year,
		tracks: album.tracks.map((t) => ({
			id: t.id,
			name: t.name,
			artist: t.artist,
			previewUrl: t.previewUrl,
			durationMs: t.durationMs,
			trackNumber: t.trackNumber
		}))
	};
}
function msg(partial) {
	return {
		id: uid("m"),
		at: Date.now(),
		...partial
	};
}
function classifyTone(c) {
	if (c === "progression") return "progression";
	if (c === "useful") return "useful";
	if (c === "trap") return "trap";
	return "filler";
}
function introMessages(seed, starter, total) {
	const n = starter?.tracks.length ?? 0;
	return [
		msg({
			kind: "system",
			author: "system",
			text: `${BOT_NAME} is online. Demo seed ${seed}. ${total} first-play locations in the crate.`
		}),
		msg({
			kind: "bot",
			author: BOT_NAME,
			text: starter ? `Starter album unlocked: ${starter.name} — ${starter.artist}. Sphere 0 is ${n} tracks. First plays are checks. Unlocked albums join the rotation.` : "Add an album to the crate to begin."
		}),
		msg({
			kind: "bot",
			author: BOT_NAME,
			text: "Type /play to drop the needle, or /help for commands."
		})
	];
}
function unlockedTracks(s) {
	return s.crate.filter((a) => s.unlockedAlbumIds.includes(a.id)).flatMap((a) => a.tracks);
}
function pickNext(s) {
	if (s.queue.length) {
		const id = s.queue[0];
		return trackById(s.crate, id);
	}
	const pool = unlockedTracks(s);
	if (!pool.length) return void 0;
	if (s.encoreAlbumId) {
		const fromAlbum = pool.filter((t) => t.albumId === s.encoreAlbumId && t.id !== s.nowPlayingId);
		if (fromAlbum.length) return fromAlbum[Math.floor(Math.random() * fromAlbum.length)];
	}
	const unplayed = pool.filter((t) => !s.playedTrackIds.includes(t.id));
	const source = unplayed.length ? unplayed : pool;
	if (!s.shuffle && s.nowPlayingId) {
		const cur = trackById(s.crate, s.nowPlayingId);
		if (cur) {
			const next = albumById(s.crate, cur.albumId)?.tracks.find((t) => t.trackNumber === cur.trackNumber + 1);
			if (next && s.unlockedAlbumIds.includes(next.albumId)) return next;
		}
	}
	const avoid = source.filter((t) => t.id !== s.nowPlayingId);
	const bag = avoid.length ? avoid : source;
	return bag[Math.floor(Math.random() * bag.length)];
}
function applyBootstrap(seed = DEFAULT_SEED) {
	const crate = buildCrate(DEFAULT_CRATE, [DEFAULT_STARTER_ID]);
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
		encoreAlbumId: null
	};
}
var useStation = create()(persist((set, get) => {
	const push = (m) => set((s) => ({ chat: [...s.chat, msg(m)].slice(-120) }));
	const grantItem = (item) => {
		const s = get();
		if (s.receivedItems.some((r) => r.itemId === item.itemId && r.itemName === item.itemName)) return;
		const album = albumByItemId(s.crate, item.itemId);
		const receivedItems = [...s.receivedItems, {
			...item,
			at: Date.now()
		}];
		let unlockedAlbumIds = s.unlockedAlbumIds;
		if (album && !unlockedAlbumIds.includes(album.id)) unlockedAlbumIds = [...unlockedAlbumIds, album.id];
		set({
			receivedItems,
			unlockedAlbumIds
		});
		push({
			kind: "item",
			author: BOT_NAME,
			text: album ? `${item.fromPlayer} sent ${item.itemName}. ${album.name} joins the rotation.` : `${item.fromPlayer} sent ${item.itemName} (${classifyTone(item.classification)}).`,
			art: album?.artwork,
			classification: item.classification
		});
		if (item.classification === "trap") {
			if (item.itemName === "Needle Scratch") {
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Needle scratch. Skipping."
				});
				window.setTimeout(() => get().skip(), 400);
			} else if (item.itemName === "Dead Air") {
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Dead air on the channel."
				});
				get().pause();
				if (trapTimer) window.clearTimeout(trapTimer);
				trapTimer = window.setTimeout(() => get().skip(), 1800);
			} else if (item.itemName === "Misfile") push({
				kind: "bot",
				author: BOT_NAME,
				text: "Misfile — the next cue is out of order."
			});
		} else if (item.classification === "useful") {
			if (item.itemName === "Encore") {
				const cur = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0;
				if (cur) set({ encoreAlbumId: cur.albumId });
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Encore: staying on this album."
				});
			} else if (item.itemName === "Double A-Side") {
				const cur = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0;
				const extra = (cur ? albumById(s.crate, cur.albumId) : void 0)?.tracks.find((t) => t.id !== cur?.id);
				if (extra) set({ queue: [extra.id, ...get().queue] });
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Double A-side queued."
				});
			} else if (item.itemName === "Request Line") {
				const locked = s.crate.find((a) => !get().unlockedAlbumIds.includes(a.id));
				if (locked) {
					const loc = Object.values(get().placements).find((p) => p.itemId === locked.itemId);
					const host = allTracks(get().crate).find((t) => t.locationId === loc?.locationId);
					push({
						kind: "bot",
						author: BOT_NAME,
						text: host ? `Request line: ${locked.itemName} is on ${host.locationName}.` : `${locked.itemName} is still somewhere in the multiworld.`
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
				text: "Goal complete. Every track has had its first play. The crate is clear."
			});
		}
	};
	const handleCheck = (track) => {
		const s = get();
		if (s.checkedLocationIds.includes(track.locationId)) return;
		set({
			checkedLocationIds: [...s.checkedLocationIds, track.locationId],
			playedTrackIds: s.playedTrackIds.includes(track.id) ? s.playedTrackIds : [...s.playedTrackIds, track.id]
		});
		if (s.mode === "live" && liveClient?.connected) {
			const id = liveClient.locationNameToId.get(track.locationName) ?? track.locationId;
			liveClient.checkLocations([id]);
			push({
				kind: "check",
				author: BOT_NAME,
				text: `First play — checked ${track.locationName}.`,
				art: track.artwork
			});
		} else {
			const place = s.placements[track.locationId];
			if (!place) push({
				kind: "check",
				author: BOT_NAME,
				text: `First play — checked ${track.locationName}.`,
				art: track.artwork
			});
			else if (place.destPlayer === "remote") push({
				kind: "multi",
				author: BOT_NAME,
				text: `Checked ${track.locationName}. Sent ${place.itemName} to ${place.destName} (${place.destGame}).`,
				art: track.artwork,
				classification: place.classification
			});
			else {
				push({
					kind: "check",
					author: BOT_NAME,
					text: `First play — checked ${track.locationName}.`,
					art: track.artwork
				});
				grantItem({
					itemId: place.itemId,
					itemName: place.itemName,
					classification: place.classification,
					fromPlayer: "Your world",
					locationName: track.locationName
				});
			}
		}
		const after = get();
		if (after.mode === "demo" && after.remoteGift && !after.remoteGift.granted) {
			if (after.checkedLocationIds.length >= after.remoteGift.afterChecks) {
				const gift = after.remoteGift;
				set({ remoteGift: {
					...gift,
					granted: true
				} });
				const from = REMOTE_PLAYERS[after.checkedLocationIds.length % REMOTE_PLAYERS.length];
				grantItem({
					itemId: gift.itemId,
					itemName: gift.itemName,
					classification: "progression",
					fromPlayer: `${from.name} (${from.game})`
				});
			}
		}
	};
	const startTrack = (track, queued = false) => {
		startedFor = null;
		set((s) => ({
			nowPlayingId: track.id,
			isPlaying: true,
			progressMs: 0,
			durationMs: track.previewUrl ? Math.min(track.durationMs, 3e4) : 12e3,
			queue: queued ? s.queue.filter((id) => id !== track.id) : s.queue,
			encoreAlbumId: s.encoreAlbumId === track.albumId ? null : s.encoreAlbumId
		}));
		push({
			kind: "bot",
			author: BOT_NAME,
			text: `Now playing: ${track.name} — ${track.artist} · ${track.albumName}`,
			art: track.artwork
		});
		audioEngine.play(track.previewUrl, track.previewUrl ? Math.min(track.durationMs, 3e4) : 12e3);
	};
	return {
		...applyBootstrap(),
		mode: "demo",
		live: {
			host: "archipelago.gg",
			port: "38281",
			slot: "DJ",
			password: "",
			game: GAME_NAME
		},
		liveStatus: "idle",
		liveError: "",
		shuffle: true,
		volume: .85,
		view: "station",
		seenIntro: false,
		searchBusy: false,
		hydrateEngine: () => {
			audioEngine.setVolume(get().volume);
			audioEngine.attach({
				onTime: (currentMs, durationMs) => set({
					progressMs: currentMs,
					durationMs
				}),
				onStarted: () => {
					const s = get();
					const track = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0;
					if (!track) return;
					if (startedFor === track.id) return;
					startedFor = track.id;
					handleCheck(track);
				},
				onEnded: () => {
					if (!get().isPlaying) return;
					const next = pickNext(get());
					if (next) startTrack(next, true);
					else set({
						isPlaying: false,
						nowPlayingId: null
					});
				},
				onError: (message) => push({
					kind: "system",
					author: "system",
					text: message
				})
			});
		},
		setView: (view) => set({ view }),
		setLive: (patch) => set((s) => ({ live: {
			...s.live,
			...patch
		} })),
		setVolume: (v) => {
			audioEngine.setVolume(v);
			set({ volume: v });
		},
		toggleShuffle: () => {
			const next = !get().shuffle;
			set({ shuffle: next });
			push({
				kind: "bot",
				author: BOT_NAME,
				text: next ? "Shuffle on. Rotation is random across unlocked albums." : "Shuffle off. Playing album order."
			});
		},
		play: (trackId) => {
			const s = get();
			if (trackId) {
				const t = trackById(s.crate, trackId);
				if (!t) return;
				if (!s.unlockedAlbumIds.includes(t.albumId)) {
					push({
						kind: "bot",
						author: BOT_NAME,
						text: `${t.albumName} is still locked. Find its album item first.`
					});
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
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Nothing in rotation. Unlock an album or add one to the crate."
				});
				return;
			}
			startTrack(next, s.queue[0] === next.id);
		},
		pause: () => {
			audioEngine.pause();
			set({ isPlaying: false });
		},
		resume: () => {
			if (!get().nowPlayingId) {
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
				set({
					isPlaying: false,
					nowPlayingId: null
				});
			}
		},
		stop: () => {
			audioEngine.stop();
			set({
				isPlaying: false,
				nowPlayingId: null,
				progressMs: 0
			});
		},
		sendCommand: (text) => {
			const parsed = parseCommand(text);
			if (!parsed) return;
			push({
				kind: "user",
				author: "You",
				text: text.startsWith("/") ? text : `/${text}`
			});
			const s = get();
			const { name, arg } = parsed;
			if (s.mode === "live" && liveClient?.connected && !LOCAL_COMMANDS.has(name)) {
				liveClient.say(text);
				return;
			}
			switch (name) {
				case "help":
					push({
						kind: "bot",
						author: BOT_NAME,
						text: HELP
					});
					break;
				case "play": {
					if (!arg) {
						get().play();
						break;
					}
					const q = arg.toLowerCase();
					const tracks = unlockedTracks(get());
					const hit = tracks.find((t) => t.name.toLowerCase() === q) || tracks.find((t) => t.name.toLowerCase().includes(q)) || tracks.find((t) => t.albumName.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
					if (hit) get().play(hit.id);
					else {
						const locked = get().crate.find((a) => !get().unlockedAlbumIds.includes(a.id) && (a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)));
						push({
							kind: "bot",
							author: BOT_NAME,
							text: locked ? `${locked.name} is in the crate but still locked behind its Archipelago item.` : `Nothing unlocked matches “${arg}”.`
						});
					}
					break;
				}
				case "pause":
					get().pause();
					push({
						kind: "bot",
						author: BOT_NAME,
						text: "Paused."
					});
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
					push({
						kind: "bot",
						author: BOT_NAME,
						text: "Stopped."
					});
					break;
				case "shuffle":
					get().toggleShuffle();
					break;
				case "np":
				case "nowplaying":
				case "now-playing": {
					const t = s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0;
					push({
						kind: "bot",
						author: BOT_NAME,
						text: t ? `Now playing: ${t.name} — ${t.artist} · ${t.albumName}` : "Silence on the channel.",
						art: t?.artwork
					});
					break;
				}
				case "queue": {
					const q = s.queue.map((id) => trackById(s.crate, id)?.name).filter(Boolean);
					push({
						kind: "bot",
						author: BOT_NAME,
						text: q.length ? `Queue: ${q.join(" · ")}` : "Queue is empty. Rotation picks from unlocked albums."
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
					push({
						kind: "bot",
						author: BOT_NAME,
						text: lines.join("\n") || "Crate is empty."
					});
					break;
				}
				case "hint": {
					const q = arg.toLowerCase();
					const album = arg ? s.crate.find((a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)) : s.crate.find((a) => !s.unlockedAlbumIds.includes(a.id));
					if (!album) {
						push({
							kind: "bot",
							author: BOT_NAME,
							text: "No matching album."
						});
						break;
					}
					if (s.unlockedAlbumIds.includes(album.id)) {
						push({
							kind: "bot",
							author: BOT_NAME,
							text: `${album.name} is already in rotation.`
						});
						break;
					}
					const loc = Object.values(s.placements).find((p) => p.itemId === album.itemId);
					const host = allTracks(s.crate).find((t) => t.locationId === loc?.locationId);
					push({
						kind: "bot",
						author: BOT_NAME,
						text: host ? `${album.itemName} is sitting on ${host.locationName}.` : s.remoteGift?.itemId === album.itemId ? `${album.itemName} is in another world. It arrives after ${s.remoteGift.afterChecks} of your checks.` : `${album.itemName} is still in the multiworld.`
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
							s.remoteGift && !s.remoteGift.granted ? `Incoming gift in ${Math.max(0, s.remoteGift.afterChecks - s.checkedLocationIds.length)} checks` : ""
						].filter(Boolean).join("\n")
					});
					break;
				}
				default:
					get().play();
					if (name !== "play") {}
			}
		},
		addAlbum: (raw) => {
			const s = get();
			if (s.crate.some((a) => a.id === raw.id)) {
				push({
					kind: "bot",
					author: BOT_NAME,
					text: `${raw.name} is already in the crate.`
				});
				return;
			}
			if (!raw.tracks.length) {
				push({
					kind: "system",
					author: "system",
					text: "That album has no playable tracks."
				});
				return;
			}
			const starters = s.crate.filter((a) => a.starter).map((a) => a.id);
			const crate = buildCrate([...s.crate.map(toRaw), raw], starters);
			const added = crate.find((a) => a.id === raw.id);
			const placements = { ...s.placements };
			for (const t of added.tracks) placements[t.locationId] = {
				locationId: t.locationId,
				itemId: t.locationId + 11,
				itemName: "Liner Notes",
				classification: "filler",
				destPlayer: "self"
			};
			const host = unlockedTracks(s).find((t) => !s.checkedLocationIds.includes(t.locationId));
			if (host) {
				placements[host.locationId] = {
					locationId: host.locationId,
					itemId: added.itemId,
					itemName: added.itemName,
					classification: "progression",
					destPlayer: "self"
				};
				push({
					kind: "system",
					author: "system",
					text: `Added ${added.name} — ${added.artist}. ${added.tracks.length} first-play locations. The album item is now sitting on an unlocked track.`,
					art: added.artwork
				});
				set({
					crate,
					placements
				});
			} else {
				push({
					kind: "system",
					author: "system",
					text: `Added ${added.name} — ${added.artist}. It will arrive as a multiworld gift after a few more checks.`,
					art: added.artwork
				});
				set({
					crate,
					placements,
					remoteGift: {
						itemId: added.itemId,
						itemName: added.itemName,
						albumId: added.id,
						afterChecks: s.checkedLocationIds.length + 3,
						granted: false
					}
				});
			}
		},
		removeAlbum: (id) => {
			const s = get();
			if (s.crate.length <= 1) {
				push({
					kind: "bot",
					author: BOT_NAME,
					text: "Keep at least one album in the crate."
				});
				return;
			}
			const gone = s.crate.find((a) => a.id === id);
			const crate = s.crate.filter((a) => a.id !== id);
			const unlockedAlbumIds = s.unlockedAlbumIds.filter((x) => x !== id);
			const stopNow = (s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0)?.albumId === id;
			if (stopNow) audioEngine.stop();
			set({
				crate,
				unlockedAlbumIds,
				nowPlayingId: stopNow ? null : s.nowPlayingId,
				isPlaying: stopNow ? false : s.isPlaying,
				queue: s.queue.filter((tid) => crate.some((a) => a.tracks.some((t) => t.id === tid)))
			});
			push({
				kind: "system",
				author: "system",
				text: `Removed ${gone?.name ?? "album"} from the crate.`
			});
		},
		toggleStarter: (id) => {
			const s = get();
			if (!s.crate.find((a) => a.id === id)) return;
			const crate = s.crate.map((a) => a.id === id ? {
				...a,
				starter: !a.starter
			} : a);
			if (!crate.some((a) => a.starter) && crate[0]) crate[0] = {
				...crate[0],
				starter: true
			};
			set({ crate });
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
				mode: "demo"
			});
		},
		resetProgress: () => {
			audioEngine.stop();
			const s = get();
			const starters = s.crate.filter((a) => a.starter).map((a) => a.id);
			set({
				unlockedAlbumIds: starters.length ? starters : s.crate[0] ? [s.crate[0].id] : [],
				checkedLocationIds: [],
				receivedItems: [],
				playedTrackIds: [],
				nowPlayingId: null,
				queue: [],
				isPlaying: false,
				progressMs: 0,
				victory: false,
				encoreAlbumId: null,
				remoteGift: s.remoteGift ? {
					...s.remoteGift,
					granted: false
				} : null,
				chat: introMessages(s.seed, s.crate.find((a) => a.starter), allTracks(s.crate).length)
			});
		},
		connectLive: async () => {
			get().disconnectLive();
			const cfg = get().live;
			set({
				liveStatus: "connecting",
				liveError: "",
				mode: "live"
			});
			const client = new ArchipelagoClient({
				onStatus: (status, detail) => {
					if (status === "connected") set({
						liveStatus: "connected",
						liveError: ""
					});
					else if (status === "error") set({
						liveStatus: "error",
						liveError: detail ?? "Failed"
					});
					else if (status === "disconnected") set((st) => ({ liveStatus: st.liveStatus === "connecting" ? "error" : "idle" }));
					else set({ liveStatus: "connecting" });
				},
				onPrint: (text) => push({
					kind: "multi",
					author: "Archipelago",
					text
				}),
				onItems: (items) => {
					for (const it of items) {
						const name = liveClient?.itemIdToName.get(it.item) ?? `Item ${it.item}`;
						const album = get().crate.find((a) => a.itemName === name || a.itemId === it.item);
						grantItem({
							itemId: album?.itemId ?? it.item,
							itemName: name,
							classification: album ? "progression" : "filler",
							fromPlayer: "Archipelago"
						});
					}
				},
				onChecked: (locs) => set((st) => ({ checkedLocationIds: Array.from(/* @__PURE__ */ new Set([...st.checkedLocationIds, ...locs])) })),
				onDataPackage: () => void 0,
				onConnected: (info) => {
					push({
						kind: "system",
						author: "system",
						text: `Connected as slot ${info.slot}. ${info.checked.length} locations already checked.`
					});
					set((st) => ({ checkedLocationIds: Array.from(/* @__PURE__ */ new Set([...st.checkedLocationIds, ...info.checked])) }));
				}
			});
			liveClient = client;
			try {
				await client.connect(cfg);
				set({
					mode: "live",
					liveStatus: "connected"
				});
				push({
					kind: "system",
					author: "system",
					text: `Live multiworld on ${cfg.host}:${cfg.port}. First plays will send LocationChecks.`
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : "Connect failed";
				set({
					liveStatus: "error",
					liveError: message,
					mode: "demo"
				});
				push({
					kind: "system",
					author: "system",
					text: `Live connect failed: ${message}. Staying in demo seed.`
				});
			}
		},
		disconnectLive: () => {
			liveClient?.disconnect();
			liveClient = null;
			set({
				liveStatus: "idle",
				mode: "demo"
			});
		},
		exportPack: () => {
			import("./export-McTEKMhH.mjs").then(({ buildManualPack, downloadZip }) => {
				downloadZip("needlecheck-apworld.zip", buildManualPack(get().crate));
				push({
					kind: "system",
					author: "system",
					text: "Downloaded needlecheck-apworld.zip — Manual JSON + YAML for generation."
				});
			});
		},
		dismissIntro: () => set({ seenIntro: true })
	};
}, {
	name: "needlecheck-v1",
	skipHydration: true,
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
		seenIntro: s.seenIntro
	})
}));
function useNowPlaying() {
	return useStation((s) => s.nowPlayingId ? trackById(s.crate, s.nowPlayingId) : void 0);
}
function classBadge(c) {
	if (c === "progression") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "check",
		children: "progression"
	});
	if (c === "useful") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "accent",
		children: "useful"
	});
	if (c === "trap") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "danger",
		children: "trap"
	});
	if (c === "filler") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "filler" });
	return null;
}
function toCommand(t) {
	if (t.startsWith("/")) return t;
	const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
	if (LOCAL_COMMANDS.has(first)) return `/${t}`;
	return `/play ${t}`;
}
function Row({ m }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("flex gap-3 rounded-md px-2 py-2", m.kind === "user" && "bg-surface-2/60"),
		children: [m.art ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: m.art,
			alt: "",
			className: "mt-0.5 size-9 shrink-0 rounded-sm object-cover outline outline-1 -outline-offset-1 outline-fg/10"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-0.5 size-9 shrink-0 rounded-sm bg-surface-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium text-fg",
					children: m.author
				}), classBadge(m.classification)]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 whitespace-pre-wrap text-sm leading-snug text-muted",
				children: m.text
			})]
		})]
	});
}
function ChatPanel() {
	const chat = useStation((s) => s.chat);
	const send = useStation((s) => s.sendCommand);
	const [value, setValue] = (0, import_react.useState)("");
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [chat.length]);
	function onSubmit(e) {
		e.preventDefault();
		const t = value.trim();
		if (!t) return;
		send(toCommand(t));
		setValue("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 flex-1 flex-col rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-2 flex items-center justify-between px-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wide text-subtle",
					children: "Channel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium text-fg",
					children: "#listening-room"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-subtle",
					children: "Slash commands"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: scroller,
				className: "min-h-0 flex-1 space-y-1 overflow-y-auto pr-1",
				children: chat.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { m }, m.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
				onSubmit,
				className: "mt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value,
					onChange: (e) => setValue(e.target.value),
					placeholder: "/play, /skip, /crate, /hint, /help",
					"aria-label": "Command",
					autoComplete: "off"
				})
			})
		]
	});
}
function CrateRail() {
	const crate = useStation((s) => s.crate);
	const unlocked = useStation((s) => s.unlockedAlbumIds);
	const played = useStation((s) => s.playedTrackIds);
	const play = useStation((s) => s.play);
	const setView = useStation((s) => s.setView);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-3 flex items-end justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-xs font-medium uppercase tracking-wide text-subtle",
			children: "Crate"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "text-xs text-muted hover:text-fg",
			onClick: () => setView("crate"),
			children: "Edit"
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "flex gap-3 overflow-x-auto pb-1",
		children: crate.map((album) => {
			const on = unlocked.includes(album.id);
			const done = album.tracks.filter((t) => played.includes(t.id)).length;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "w-20 shrink-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !on,
						onClick: () => {
							const first = album.tracks[0];
							if (first) play(first.id);
						},
						className: cn("block w-full overflow-hidden rounded-md text-left", "shadow-[var(--shadow-border)] transition-opacity duration-150", on ? "opacity-100" : "opacity-40"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: album.artwork,
							alt: "",
							className: "aspect-square w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 truncate text-xs text-fg",
						children: album.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-1 text-xs text-subtle",
						children: [on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "size-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tabular-nums",
							children: [
								done,
								"/",
								album.tracks.length
							]
						})]
					})
				]
			}, album.id);
		})
	})] });
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-fg text-bg hover:opacity-90",
			secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:bg-surface",
			ghost: "text-fg hover:bg-surface-2",
			outline: "text-fg shadow-[var(--shadow-border)] hover:bg-surface-2"
		},
		size: {
			default: "h-11 rounded-md px-4 text-sm",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-12 rounded-md px-5 text-base",
			icon: "size-11 rounded-md",
			"icon-sm": "size-9 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var searchAlbums = createServerFn({ method: "POST" }).validator(object({ term: string().min(1).max(80) })).handler(createSsrRpc("1c08fdc5b93f312d1c3a51498448424082f4fdbf63b254f5e79e5a05c6deb8d5"));
var lookupAlbum = createServerFn({ method: "POST" }).validator(object({ id: string().min(1) })).handler(createSsrRpc("63a9678028e4224977439984827b3fa26bd82dcb53ccd8b82680e1e4876ec638"));
function CrateView() {
	const crate = useStation((s) => s.crate);
	const unlocked = useStation((s) => s.unlockedAlbumIds);
	const played = useStation((s) => s.playedTrackIds);
	const addAlbum = useStation((s) => s.addAlbum);
	const removeAlbum = useStation((s) => s.removeAlbum);
	const toggleStarter = useStation((s) => s.toggleStarter);
	const [term, setTerm] = (0, import_react.useState)("");
	const [hits, setHits] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	async function search(e) {
		e.preventDefault();
		if (!term.trim()) return;
		setBusy(true);
		setError("");
		try {
			const results = await searchAlbums({ data: { term: term.trim() } });
			setHits(results);
			if (!results.length) setError("No albums matched that search.");
		} catch {
			setError("Catalog search failed. Try again in a moment.");
		} finally {
			setBusy(false);
		}
	}
	async function add(id) {
		setBusy(true);
		setError("");
		try {
			const album = await lookupAlbum({ data: { id } });
			addAlbum(album);
			setHits((h) => h.filter((x) => x.id !== id));
		} catch {
			setError("Could not load that album's tracks.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-5xl flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-medium tracking-tight",
				children: "The crate"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 max-w-xl text-sm text-muted",
				children: "Albums you add become Archipelago items. Each track is a location, checked the first time it plays. Starter albums begin unlocked as sphere 0."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: search,
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: term,
						onChange: (e) => setTerm(e.target.value),
						placeholder: "Search the catalog — artist or album",
						className: "pl-10",
						"aria-label": "Search albums"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: "Search"
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-danger",
				children: error
			}) : null,
			hits.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
				children: hits.map((hit) => {
					const inCrate = crate.some((a) => a.id === hit.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg bg-surface p-2 shadow-[var(--shadow-border)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: hit.artwork,
								alt: "",
								className: "aspect-square w-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 truncate text-sm text-fg",
								children: hit.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted",
								children: hit.artist
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: inCrate ? "secondary" : "default",
								className: "mt-2 w-full",
								disabled: inCrate || busy,
								onClick: () => add(hit.id),
								children: inCrate ? "In crate" : "Add"
							})
						]
					}, hit.id);
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]",
				children: crate.map((album) => {
					const on = unlocked.includes(album.id);
					const done = album.tracks.filter((t) => played.includes(t.id)).length;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: album.artwork,
								alt: "",
								className: cn("size-14 rounded-md object-cover outline outline-1 -outline-offset-1 outline-fg/10", !on && "opacity-50")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-medium text-fg",
										children: album.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "truncate text-xs text-muted",
										children: [album.artist, album.year ? ` · ${album.year}` : ""]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle",
										children: [
											on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "size-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-3" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "tabular-nums",
												children: [
													done,
													"/",
													album.tracks.length,
													" first plays"
												]
											}),
											album.starter ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "accent",
												children: "starter"
											}) : null,
											on && !album.starter ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: "check",
												children: "unlocked"
											}) : null
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": album.starter ? "Unset starter" : "Set as starter",
									onClick: () => toggleStarter(album.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: cn("size-4", album.starter && "fill-accent text-accent") })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									"aria-label": `Remove ${album.name}`,
									onClick: () => removeAlbum(album.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
								})]
							})
						]
					}, album.id);
				})
			})
		]
	});
}
function IntroOverlay() {
	const seen = useStation((s) => s.seenIntro);
	const dismiss = useStation((s) => s.dismissIntro);
	const play = useStation((s) => s.play);
	if (seen) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wide text-subtle",
					children: "Needlecheck"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-3xl font-medium tracking-tight text-fg",
					children: "First play is a check."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-5 space-y-3 text-sm leading-relaxed text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-fg",
							children: "1. Sphere 0. "
						}), "Kind of Blue starts unlocked. Everything else is an Archipelago item."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-fg",
							children: "2. Drop the needle. "
						}), "The first time a song plays, its location is checked. That can be another album — or something for Maya in Hyrule."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-fg",
							children: "3. The crate grows. "
						}), "Unlocked albums join the random rotation. Goal: first-play every track."] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-2 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "flex-1",
						onClick: () => {
							dismiss();
							play();
						},
						children: "Drop the needle"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "flex-1",
						onClick: dismiss,
						children: "Browse first"
					})]
				})
			]
		})
	});
}
function VictoryBanner() {
	const victory = useStation((s) => s.victory);
	const newSeed = useStation((s) => s.newSeed);
	if (!victory) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium text-fg",
			children: "Crate clear. Every first play has been checked."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "mt-1 text-sm text-muted hover:text-fg",
			onClick: newSeed,
			children: "Roll a new seed"
		})]
	});
}
function PlayerBar() {
	const track = useNowPlaying();
	const isPlaying = useStation((s) => s.isPlaying);
	const shuffle = useStation((s) => s.shuffle);
	const progressMs = useStation((s) => s.progressMs);
	const durationMs = useStation((s) => s.durationMs);
	const volume = useStation((s) => s.volume);
	const play = useStation((s) => s.play);
	const pause = useStation((s) => s.pause);
	const skip = useStation((s) => s.skip);
	const toggleShuffle = useStation((s) => s.toggleShuffle);
	const setVolume = useStation((s) => s.setVolume);
	const played = useStation((s) => track ? s.playedTrackIds.includes(track.id) : false);
	const pct = durationMs > 0 ? Math.min(100, progressMs / durationMs * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-16",
				children: track ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl font-medium leading-tight tracking-tight text-fg sm:text-3xl",
						children: track.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							track.artist,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: " · "
							}),
							track.albumName
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs uppercase tracking-wide text-subtle",
						children: played ? "Already checked" : "First play — this is a check"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl font-medium leading-tight tracking-tight text-fg sm:text-3xl",
					children: "Silence on the channel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Drop the needle to start sphere 0."
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-10 text-xs tabular-nums text-subtle",
						children: formatTime(progressMs)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-1 flex-1 overflow-hidden rounded-full bg-surface-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-accent transition-[width] duration-150 ease-linear",
							style: { width: `${pct}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-10 text-right text-xs tabular-nums text-subtle",
						children: formatTime(durationMs)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: shuffle ? "secondary" : "ghost",
						size: "icon",
						"aria-label": shuffle ? "Shuffle on" : "Shuffle off",
						"aria-pressed": shuffle,
						onClick: toggleShuffle,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						className: "size-14 rounded-full",
						"aria-label": isPlaying ? "Pause" : "Play",
						onClick: () => isPlaying ? pause() : play(),
						children: isPlaying ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5 translate-x-px" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "Skip",
						onClick: skip,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto hidden items-center gap-2 sm:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4 text-subtle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: 1,
							step: .01,
							value: volume,
							"aria-label": "Volume",
							onChange: (e) => setVolume(Number(e.target.value)),
							className: "h-1 w-24 cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
						})]
					})
				]
			})
		]
	});
}
function Vinyl({ track, spinning }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mx-auto w-full max-w-xs lg:max-w-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("vinyl", spinning && "is-spinning"),
			"aria-hidden": "true",
			children: [track ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: track.artwork,
				alt: "",
				className: "vinyl-label object-cover",
				draggable: false
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vinyl-label bg-surface-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vinyl-hole" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("tonearm", spinning && "is-on"),
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-1 left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tonearm-shaft" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tonearm-head" })
			]
		})]
	});
}
function WorldView() {
	const seed = useStation((s) => s.seed);
	const mode = useStation((s) => s.mode);
	const live = useStation((s) => s.live);
	const liveStatus = useStation((s) => s.liveStatus);
	const liveError = useStation((s) => s.liveError);
	const crate = useStation((s) => s.crate);
	const unlocked = useStation((s) => s.unlockedAlbumIds);
	const checked = useStation((s) => s.checkedLocationIds);
	const gift = useStation((s) => s.remoteGift);
	const received = useStation((s) => s.receivedItems);
	const setLive = useStation((s) => s.setLive);
	const connectLive = useStation((s) => s.connectLive);
	const disconnectLive = useStation((s) => s.disconnectLive);
	const newSeed = useStation((s) => s.newSeed);
	const resetProgress = useStation((s) => s.resetProgress);
	const exportPack = useStation((s) => s.exportPack);
	const total = allTracks(crate).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-3xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-medium tracking-tight",
				children: "The multiworld"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Demo seed plays as a solo Archipelago world with simulated neighbors. Live mode talks to a real room over the Archipelago protocol."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-wide text-subtle",
							children: "Demo seed"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-2xl tabular-nums text-fg",
							children: seed
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: mode === "demo" ? "check" : "default",
							children: mode === "demo" ? "active" : "idle"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-4 grid grid-cols-3 gap-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Albums"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "tabular-nums text-fg",
								children: [
									unlocked.length,
									"/",
									crate.length
								]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Checks"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "tabular-nums text-fg",
								children: [
									checked.length,
									"/",
									total
								]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Incoming"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-fg",
								children: gift && !gift.granted ? `${gift.itemName.replace("Album - ", "")}` : "—"
							})] })
						]
					}),
					gift && !gift.granted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs text-muted",
						children: [
							gift.itemName,
							" is sitting in another world. It arrives after ",
							gift.afterChecks,
							" of your checks (",
							Math.max(0, gift.afterChecks - checked.length),
							" remaining)."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: newSeed,
							children: "New seed"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: resetProgress,
							children: "Reset checks"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-wide text-subtle",
							children: "Live room"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-medium text-fg",
							children: "Archipelago connect"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: liveStatus === "connected" ? "check" : liveStatus === "error" ? "danger" : "default",
							children: liveStatus
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-subtle",
								children: ["Host", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1",
									value: live.host,
									onChange: (e) => setLive({ host: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-subtle",
								children: ["Port", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1",
									value: live.port,
									onChange: (e) => setLive({ port: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-subtle",
								children: ["Slot name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1",
									value: live.slot,
									onChange: (e) => setLive({ slot: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-subtle",
								children: ["Game name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1",
									value: live.game,
									onChange: (e) => setLive({ game: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs text-subtle sm:col-span-2",
								children: ["Password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1",
									type: "password",
									value: live.password,
									onChange: (e) => setLive({ password: e.target.value })
								})]
							})
						]
					}),
					liveError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-danger",
						children: liveError
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [liveStatus === "connected" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: disconnectLive,
							children: "Disconnect"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => void connectLive(),
							disabled: liveStatus === "connecting",
							children: liveStatus === "connecting" ? "Connecting…" : "Connect"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: exportPack,
							children: "Download world pack"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm leading-relaxed text-muted",
						children: "Full-length Discord voice playback needs a bot token and a voice server this preview cannot host. Needlecheck is the listening client: 30-second catalog previews, first plays as location checks, album items unlocking the rotation. Generate with the Manual pack, host a room, then connect here with the same slot and game name."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium text-fg",
				children: "Received items"
			}), received.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Nothing received yet. First plays will start the log."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]",
				children: received.slice().reverse().slice(0, 24).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-3 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-fg",
							children: item.itemName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-subtle",
							children: item.fromPlayer
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: item.classification === "progression" ? "check" : item.classification === "trap" ? "danger" : item.classification === "useful" ? "accent" : "default",
						children: item.classification
					})]
				}, `${item.itemId}-${item.at}`))
			})] })
		]
	});
}
var NAV = [
	{
		id: "station",
		label: "Station",
		icon: Disc3
	},
	{
		id: "crate",
		label: "Crate",
		icon: LayoutGrid
	},
	{
		id: "world",
		label: "World",
		icon: Globe
	}
];
function AppShell() {
	const view = useStation((s) => s.view);
	const setView = useStation((s) => s.setView);
	const crate = useStation((s) => s.crate);
	const unlocked = useStation((s) => s.unlockedAlbumIds);
	const checked = useStation((s) => s.checkedLocationIds);
	const seed = useStation((s) => s.seed);
	const mode = useStation((s) => s.mode);
	const liveStatus = useStation((s) => s.liveStatus);
	const isPlaying = useStation((s) => s.isPlaying);
	const track = useNowPlaying();
	const total = allTracks(crate).length;
	(0, import_react.useEffect)(() => {
		useStation.persist.rehydrate();
		useStation.getState().hydrateEngine();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-medium tracking-tight",
						children: "Needlecheck"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden text-xs text-subtle sm:block",
						children: "First play is a check"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: mode === "live" ? liveStatus : `seed ${seed}` }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							variant: "check",
							className: "hidden sm:inline-flex",
							children: [
								checked.length,
								"/",
								total
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							className: "hidden sm:inline-flex",
							children: [
								unlocked.length,
								"/",
								crate.length,
								" albums"
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex border-b border-border px-2 sm:px-4",
				children: NAV.map((item) => {
					const Icon = item.icon;
					const on = view === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setView(item.id),
						className: cn("relative flex h-12 flex-1 items-center justify-center gap-2 text-sm sm:flex-none sm:px-4", on ? "text-fg" : "text-muted hover:text-fg"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
							item.label,
							on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-x-3 bottom-0 h-px bg-accent" }) : null
						]
					}, item.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex min-h-0 flex-1 flex-col overflow-hidden",
				children: [
					view === "station" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-rows-[auto_1fr] gap-6 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-6 lg:overflow-y-auto lg:pr-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VictoryBanner, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Vinyl, {
									track,
									spinning: isPlaying
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerBar, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrateRail, {})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex min-h-80 flex-col lg:min-h-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPanel, {})
						})]
					}) : null,
					view === "crate" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-h-0 flex-1 overflow-y-auto p-4 sm:p-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrateView, {})
					}) : null,
					view === "world" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-h-0 flex-1 overflow-y-auto p-4 sm:p-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldView, {})
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroOverlay, {})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { FILLER_NAMES as n, GAME_NAME as r, routes_exports as t };

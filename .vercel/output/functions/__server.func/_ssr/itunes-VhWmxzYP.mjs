import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/itunes-VhWmxzYP.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function art600(url) {
	if (!url) return "";
	return url.replace("100x100bb", "600x600bb").replace("100x100", "600x600");
}
function toRawAlbum(album, tracks) {
	const rawTracks = tracks.filter((t) => t.wrapperType === "track" && t.trackName).map((t) => ({
		id: String(t.trackId),
		name: t.trackName,
		artist: t.artistName,
		previewUrl: t.previewUrl ?? null,
		durationMs: t.trackTimeMillis || 3e4,
		trackNumber: t.trackNumber || 0
	})).sort((a, b) => a.trackNumber - b.trackNumber);
	return {
		id: String(album.collectionId),
		name: album.collectionName,
		artist: album.artistName,
		artwork: art600(album.artworkUrl100),
		year: album.releaseDate ? Number(album.releaseDate.slice(0, 4)) || null : null,
		tracks: rawTracks
	};
}
var searchAlbums_createServerFn_handler = createServerRpc({
	id: "1c08fdc5b93f312d1c3a51498448424082f4fdbf63b254f5e79e5a05c6deb8d5",
	name: "searchAlbums",
	filename: "src/lib/itunes.ts"
}, (opts) => searchAlbums.__executeServer(opts));
var searchAlbums = createServerFn({ method: "POST" }).validator(object({ term: string().min(1).max(80) })).handler(searchAlbums_createServerFn_handler, async ({ data }) => {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(data.term)}&entity=album&limit=12`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("Catalog search failed");
	return ((await res.json()).results ?? []).filter((r) => r.collectionId && r.collectionName).map((r) => ({
		id: String(r.collectionId),
		name: r.collectionName,
		artist: r.artistName,
		artwork: art600(r.artworkUrl100),
		year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) || null : null
	}));
});
var lookupAlbum_createServerFn_handler = createServerRpc({
	id: "63a9678028e4224977439984827b3fa26bd82dcb53ccd8b82680e1e4876ec638",
	name: "lookupAlbum",
	filename: "src/lib/itunes.ts"
}, (opts) => lookupAlbum.__executeServer(opts));
var lookupAlbum = createServerFn({ method: "POST" }).validator(object({ id: string().min(1) })).handler(lookupAlbum_createServerFn_handler, async ({ data }) => {
	const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(data.id)}&entity=song`;
	const res = await fetch(url);
	if (!res.ok) throw new Error("Album lookup failed");
	const rows = (await res.json()).results ?? [];
	const album = rows.find((r) => r.collectionType === "Album" || r.wrapperType === "collection");
	const tracks = rows.filter((r) => r.wrapperType === "track");
	if (!album) throw new Error("Album not found");
	return toRawAlbum(album, tracks);
});
//#endregion
export { lookupAlbum_createServerFn_handler, searchAlbums_createServerFn_handler };

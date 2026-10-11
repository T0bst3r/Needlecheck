import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { albumFromPickedFiles, albumIdentity, folderAlbum, folderAlbums, libraryStatus, listLibrary, relativeMediaPath, songTitle, trackTitle } from "./media-library.ts";

test("relative paths stay inside the music folder", () => {
  assert.deepEqual(relativeMediaPath(""), { ok: true, parts: [] });
  assert.deepEqual(relativeMediaPath("miles/so what.mp3"), { ok: true, parts: ["miles", "so what.mp3"] });
  assert.equal(relativeMediaPath("../secret").ok, false);
  assert.equal(relativeMediaPath("/etc/passwd").ok, false);
  assert.equal(relativeMediaPath("https://example.com/a.mp3").ok, false);
});

test("song titles drop the audio extension and a leading track number", () => {
  assert.equal(songTitle("01 - So What.mp3"), "01 - So What");
  assert.equal(songTitle("notes.txt"), "notes.txt");
  assert.equal(trackTitle("01 - So What.mp3"), "So What");
  assert.equal(trackTitle("02.Freddie.wma"), "Freddie");
  assert.equal(trackTitle("So What.flac"), "So What");
  assert.equal(albumIdentity("Miles Davis/Kind of Blue", "music").artist, "Miles Davis");
  assert.equal(albumIdentity("Kind of Blue", "music").artist, "Local");
});

test("the library is on when a music folder is set, unless this is the hosted site", () => {
  assert.deepEqual(libraryStatus({}), { local: false });
  assert.equal(libraryStatus({ MEDIA_ROOT: "/music" }).local, true);
  assert.equal(libraryStatus({ NEEDLECHECK_ONLINE: "1", MEDIA_ROOT: "/music" }).local, false);
  assert.equal(libraryStatus({ NEEDLECHECK_ONLINE: "1" }).local, false);
});

test("a folder becomes an album and a symlink cannot leave it", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "needlecheck-media-"));
  const outside = await mkdtemp(path.join(tmpdir(), "needlecheck-outside-"));
  await mkdir(path.join(root, "miles"), { recursive: true });
  await writeFile(path.join(root, "miles", "02 Blue.flac"), "");
  await writeFile(path.join(root, "miles", "01 So What.mp3"), "");
  await writeFile(path.join(root, "miles", "notes.txt"), "nope");
  await writeFile(path.join(outside, "secret.mp3"), "");
  await symlink(outside, path.join(root, "escape"));

  const listed = await listLibrary(root, "miles");
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  assert.deepEqual(listed.files.map((file) => file.name), ["01 So What.mp3", "02 Blue.flac"]);

  const escaped = await listLibrary(root, "escape");
  assert.equal(escaped.ok, false);

  const album = await folderAlbum(root, "miles");
  assert.equal(album.ok, true);
  if (!album.ok) return;
  assert.equal(album.album.name, "miles");
  assert.equal(album.album.artist, "Local");
  assert.equal(album.album.tracks[0]!.name, "So What");
  assert.equal(album.album.tracks[0]!.source?.kind, "file");
  assert.equal(album.album.tracks.length, 2);
});

test("artist/album/song names each album, including wma, and a recursive add keeps them separate", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "needlecheck-artist-"));
  const blue = path.join(root, "Miles Davis", "Kind of Blue");
  const sketches = path.join(root, "Miles Davis", "Sketches of Spain");
  await mkdir(blue, { recursive: true });
  await mkdir(sketches, { recursive: true });
  await writeFile(path.join(blue, "01 - So What.mp3"), "");
  await writeFile(path.join(blue, "02 Freddie Freeloader.wma"), "");
  await writeFile(path.join(sketches, "Concierto.flac"), "");

  const listed = await listLibrary(root, "Miles Davis/Kind of Blue");
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  assert.deepEqual(listed.files.map((file) => file.name), ["01 - So What.mp3", "02 Freddie Freeloader.wma"]);

  const one = await folderAlbum(root, "Miles Davis/Kind of Blue");
  assert.equal(one.ok, true);
  if (!one.ok) return;
  assert.equal(one.album.artist, "Miles Davis");
  assert.equal(one.album.name, "Kind of Blue");
  assert.deepEqual(one.album.tracks.map((track) => track.name), ["So What", "Freddie Freeloader"]);

  const many = await folderAlbums(root, "Miles Davis", true);
  assert.equal(many.ok, true);
  if (!many.ok) return;
  assert.deepEqual(
    many.albums.map((album) => album.name),
    ["Kind of Blue", "Sketches of Spain"],
  );
  assert.equal(many.albums.every((album) => album.artist === "Miles Davis"), true);

  const oneSong = await albumFromPickedFiles(root, "Miles Davis/Kind of Blue", ["Miles Davis/Kind of Blue/01 - So What.mp3"]);
  assert.equal(oneSong.ok, true);
  if (!oneSong.ok) return;
  assert.equal(oneSong.album.name, "Kind of Blue");
  assert.equal(oneSong.album.tracks.length, 1);
  assert.equal(oneSong.album.tracks[0]!.name, "So What");
  assert.notEqual(oneSong.album.id, "folder:Miles Davis/Kind of Blue");

  const whole = await albumFromPickedFiles(root, "Miles Davis/Kind of Blue", listed.files.map((file) => file.path));
  assert.equal(whole.ok, true);
  if (!whole.ok) return;
  assert.equal(whole.album.id, "folder:Miles Davis/Kind of Blue");
  assert.equal(whole.album.tracks.length, 2);
});

import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { folderAlbum, libraryStatus, listLibrary, relativeMediaPath, songTitle } from "./media-library.ts";

test("relative paths stay inside the music folder", () => {
  assert.deepEqual(relativeMediaPath(""), { ok: true, parts: [] });
  assert.deepEqual(relativeMediaPath("miles/so what.mp3"), { ok: true, parts: ["miles", "so what.mp3"] });
  assert.equal(relativeMediaPath("../secret").ok, false);
  assert.equal(relativeMediaPath("/etc/passwd").ok, false);
  assert.equal(relativeMediaPath("https://example.com/a.mp3").ok, false);
});

test("song titles drop the audio extension", () => {
  assert.equal(songTitle("01 - So What.mp3"), "01 - So What");
  assert.equal(songTitle("notes.txt"), "notes.txt");
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
  assert.equal(album.album.tracks[0]!.name, "01 So What");
  assert.equal(album.album.tracks[0]!.source?.kind, "file");
  assert.equal(album.album.tracks.length, 2);
});

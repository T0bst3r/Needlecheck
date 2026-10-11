# Station

The station is the crate builder. Search a catalog, attach a playback source, star the album that starts unlocked, and download the world pack. It does not play the crate. The Discord bot does, from the file path or YouTube id on each track.

Late night on the multiworld.

## Building a crate

The page starts empty. Search uses Spotify when server credentials are set, and the public catalog otherwise. Choosing an album opens it in a dialog with a source field on every song. A filled-in YouTube video or file path ticks that song. Songs you leave blank stay on the album, unticked, so you can turn them on later. An album already in the crate can be opened from the list. **Source** there is a separate click, and a closed song shows its video id or file path.

- **YouTube** — a video URL or an 11-character id. The bot plays it only after YouTube is turned on.
- **File** — a path the bot will open in its music folder, such as `miles/so what.mp3`. The file is not uploaded, and the station does not check that it exists.

Unticking a song leaves its path in place. Clearing the path does not remove the tick. A song is in the world only when it is ticked and has a source.

**Download world pack** writes `needlecheck-world.zip`: a generic `needlecheck.apworld` plus `Needlecheck.yaml`. The slot name on the page becomes `name:` in the YAML. The button stays off until at least one track has a source.

The crate is stored in the browser. Albums that shipped with the old demo and never got a source are dropped.

## Local music folder

The builder lists a music folder whenever `MEDIA_ROOT` is set. That is the default in Docker: `docker compose up` starts the bot and `needlecheck-builder`, both mounting `MUSIC_DIR` from `.env` (default `./music`) at `/music`. The page is at [http://localhost:8080](http://localhost:8080). File is the default source, and the file field suggests matches as you type. Change `MUSIC_DIR` to point both containers at another folder. Do not change the path inside the container.

`NEEDLECHECK_ONLINE=1` turns that off. The page keeps typed file paths and catalog search, and does not read the disk. Use it for a public copy. Leave it unset on your own machine.

Without Docker, the same thing is:

```
MEDIA_ROOT=./music npm run dev
```

**New album** adds an empty album you can rename and fill with **Add song**. **Add this folder** makes an album from the audio files in the current folder, not from folders inside it. **Add every album inside** walks those folders and adds each one that has songs. Tick songs and use **Add selected** to keep only those. A path like `Artist/Album/01 - So What.mp3` becomes artist Artist, album Album, and song So What. A folder sitting directly in the music folder stays artist `Local`. The filename, without a leading track number or its extension, is the song name. Open the album to rename it, rename a song, remove a song, or add one. That works for a Spotify album too. Adding the same folder again only appends files that were not already on it. The list scrolls on its own once the folder is long.

Paths written into the YAML are relative to that folder, which is what the bot expects.

The package and container are `needlecheck-builder`. The bot package is `needlecheck-bot`. Neither package is published. The images are `ghcr.io/t0bst3r/needlecheck` and `ghcr.io/t0bst3r/needlecheck-builder`.

## Spotify

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for the station's server (client credentials, no user login). Search and track lists then come from Spotify. Those credentials do not play audio.

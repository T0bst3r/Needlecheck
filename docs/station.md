# Station

The station is the crate builder. Search a catalog, attach a playback source, star the album that starts unlocked, and download the world pack. It does not play the crate. The Discord bot does, from the file path or YouTube id on each track.

Late night on the multiworld.

## Building a crate

The page starts empty. Search uses Spotify when server credentials are set, and the public catalog otherwise. Choosing an album opens it in a dialog with a source field on every song. A filled-in YouTube video or file path ticks that song. Songs you leave blank stay on the album, unticked, so you can turn them on later. An album already in the crate can be opened from the list. **Source** there is a separate click, and a closed song shows `youtube:` or `file:` in front of its path.

- **YouTube** — a video URL or an 11-character id. The bot plays it only after YouTube is turned on.
- **File** — a path the bot will open in its music folder, such as `miles/so what.mp3`. The file is not uploaded, and the station does not check that it exists.

Unticking a song leaves its path in place. Clearing the path does not remove the tick. A song is in the world only when it is ticked and has a source.

**Download world pack** writes `needlecheck-world.zip`: a generic `needlecheck.apworld` plus `Needlecheck.yaml`. The slot name on the page becomes `name:` in the YAML. The button stays off until at least one track has a source.

The crate is stored in the browser. Albums that shipped with the old demo and never got a source are dropped.

## Spotify

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for the station's server (client credentials, no user login). Search and track lists then come from Spotify. Those credentials do not play audio.

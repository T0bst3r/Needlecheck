# Station

The station is the web listening room. Use it to build a crate, try the demo seed, or connect to a generated room. It does not stream full tracks. The Discord bot does, from the file path on each track.

Late night on the multiworld.

## Views

**Station** — vinyl, now playing, chat. `/play`, `/skip`, `/crate`, `/hint`, `/status`, `/help`. Unlocked albums rotate. Locked albums stay on the rail until their item arrives. What you hear is a short catalog preview, or silence when the catalog has none.

**Crate** — search and decide what the world contains. Spotify is used when server credentials are set. Otherwise search uses the public catalog. Opening an album lets you attach a playback source to each track:

- **YouTube** — a video URL or an 11-character id. Stored. The station does not play it. The bot plays it only after YouTube is turned on.
- **File** — a path the bot will open in its music folder, such as `miles/so what.mp3`. The file is not uploaded, and the station does not check that it exists.

Add puts only the tracks that have a source into the crate as world tracks. The albums shipped with the demo can still play previews, but they are left out of the YAML until you attach a source. Star a starter for sphere 0.

**World** — demo seed, or a live Archipelago connection. **Download world pack** writes `needlecheck-world.zip`: a generic `needlecheck.apworld` plus `Needlecheck.yaml` whose `name:` is the slot name on this page. The button stays off until at least one track has a source.

## Demo vs live

| Mode | What happens |
| --- | --- |
| Demo | Local generator. Starter album unlocked. Other albums sit on your locations or arrive from a neighbor after a few checks. |
| Live | Archipelago protocol. First plays send location checks. Album items unlock rotation. Anything you type that is not a local command is sent as chat. |

Progress is stored in the browser. Reset checks from the World tab.

## Spotify

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for the station's server (client credentials, no user login). Search and track lists then come from Spotify. Those credentials do not play audio. Previews, when they exist, still come from the catalog URL on the track.

## Commands

- `/play` `/pause` `/resume` `/skip` `/stop`
- `/shuffle` `/np`
- `/crate` `/hint` `/status` `/help`

## First plays

The first time a track starts, that is a check. In live mode the station sends `LocationChecks` for `First Play - {track} [{album} — {artist}]`, preferring the id from the room. In demo mode the local placement table decides what comes back.

The goal line in the station is still "every track in the crate has been played." The Archipelago goal is narrower: collect every album item. Extra first plays are filler checks.

# Station

The Needlecheck station is the web listening room in this repo. Use it to build the crate, try a demo seed, or connect live to Archipelago. Discord is not required.

Late night on the multiworld.

## Views

**Station** — vinyl, now playing, chat. Type `/play`, `/skip`, `/crate`, `/hint`, `/status`, `/help` in the chat. Unlocked albums rotate; locked albums stay on the crate rail until their item arrives.

**Crate** — search and assemble the world. If Spotify client credentials are set on the server, search hits come from Spotify. Otherwise the public iTunes catalog is used (30-second previews still play from iTunes when available). Star an album for sphere 0. This crate is what gets baked into the apworld — nothing is configured in Archipelago's options creator.

**World** — demo seed with simulated multiworld neighbors, or live connect (host / port / slot / game `Needlecheck`). **Download apworld** writes `needlecheck-world.zip` with the apworld, a YAML with no album options, and `crate.json` for the bot.

## Demo vs live

| Mode | What happens |
| --- | --- |
| Demo | Local generator. Starter album unlocked. Other albums sit on your locations or arrive as a "gift" after a few checks. Neighbors (Maya, Rook, Jun) receive filler you check. |
| Live | Archipelago protocol. First plays send location checks. Received album items unlock rotation. Chat lines that are not local commands are sent as `Say`. |

Progress (crate, checks, chat) is stored in the browser. Reset checks from the World tab if you want a clean demo.

## Spotify on the station

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in the station's server environment (client credentials, no user OAuth). Search and album lookup then use Spotify. Previews in the browser still come from whatever the catalog returns (Spotify preview URLs when present, otherwise silence until you use the Discord bot for full tracks).

Without those keys the station stays fully usable on the public catalog.

## Commands (chat)

Same verbs as the Discord bot, typed in the station chat:

- `/play [song or album]`
- `/pause` `/resume` `/skip` `/stop`
- `/shuffle`
- `/np`
- `/crate`
- `/hint [album]`
- `/status`
- `/help`

## First plays

The first time a track starts, Needlecheck records a check. In live mode that is a real `LocationChecks` packet using the datapackage id for `First Play - {track} [{album}]`. In demo mode the local placement table is rolled: you might receive the next album, send an item to a neighbor, or get liner notes.

When every track has been played once, the crate is clear (goal).

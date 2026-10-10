# Needlecheck

Late night on the multiworld.

Needlecheck is an [Archipelago](https://archipelago.gg) listening-room randomizer. You pick albums. Those albums are items. The first time a song would play, that is a location check.

The world itself is generic. The albums, the tracks, which album starts unlocked, and how each track will be played are a list in the player YAML. The station writes that list. Archipelago's options page does not.

## What plays

| Piece | Role |
| --- | --- |
| **Station** | Search a catalog, attach a source to each track you want, and download the world pack. |
| **apworld** | One world for every slot. It reads `Needlecheck.crate` and builds items and locations from it. |
| **Discord bot** | Plays the crate from the room. Files in a music folder first. YouTube only if you turn it on. |

A track is not a location until it has a source:

- `youtube` — a video id. The bot plays it only when YouTube is turned on. The station never does.
- `file` — a path relative to the bot's music folder. Not uploaded.

Spotify, when credentials are set, is only a search index for the station. The bot never asks Spotify for audio.

## A seed

1. In the station, search and attach a YouTube video or a file path to the tracks you want. Star a starter album. `docker compose up` also starts the builder at `http://localhost:8080` with `./music` as the folder. `NEEDLECHECK_ONLINE=1` hides that folder.
2. Download the world pack from that same page. The slot name there is the YAML name.
3. Put `needlecheck.apworld` in Archipelago's custom worlds folder and `Needlecheck.yaml` in `Players`. Generate and host.
4. `/connect` the bot with that slot name. The bot reads the crate from the room.

Details: [Archipelago setup](docs/archipelago.md), [the station](docs/station.md), and [the Discord bot](docs/discord-bot.md).

Received `Album - {album} — {artist}` items unlock that album. The goal is to collect every album.

## Repo

```
apworld/needlecheck/   generic Archipelago world and the crate schema
bot/                   Discord voice bot
docs/                  setup
src/                   station
```

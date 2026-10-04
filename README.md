# Needlecheck

Late night on the multiworld.

Needlecheck is an [Archipelago](https://archipelago.gg) listening-room randomizer. You pick albums. Those albums are items. The first time a song would play, that is a location check.

The world itself is generic. The albums, the tracks, which album starts unlocked, and how each track will be played are a list in the player YAML. The station writes that list. Archipelago's options page does not.

## What plays

| Piece | Role |
| --- | --- |
| **Station** | Search a catalog, attach a source to each track you want, export the YAML, play a short preview, connect to a room. |
| **apworld** | One world for every slot. It reads `Needlecheck.crate` and builds items and locations from it. |

A track is not a location until it has a source:

- `youtube` — a video id. Not streamed by this version.
- `file` — a path you will have on the player machine later. Not uploaded.

Spotify, when credentials are set, is only a search index. There is no voice client in this cut.

## A seed

1. In the station, open **Crate**, search, and attach a YouTube video or a file path to the tracks you want. Star a starter album.
2. **World** → **Download world pack**.
3. Put `needlecheck.apworld` in Archipelago's custom worlds folder and `Needlecheck.yaml` in `Players`. Generate and host.
4. Connect the station with game name `Needlecheck`.

Details: [Archipelago setup](docs/archipelago.md) and [the station](docs/station.md).

Received `Album - {album} — {artist}` items unlock that album. The goal is to collect every album.

## Repo

```
apworld/needlecheck/   generic Archipelago world and the crate schema
docs/                  setup
src/                   station
```

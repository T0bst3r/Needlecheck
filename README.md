# Needlecheck

Late night on the multiworld.

Needlecheck is an [Archipelago](https://archipelago.gg) listening-room randomizer. You pick a crate of albums. Those albums are items. The first time a song plays, that is a location check. Unlocked albums join the random rotation.

The crate is built **in Needlecheck** (Spotify search in the station, or `/crate` on the Discord bot) — not in Archipelago's options page. Downloading the world pack bakes the crate into `needlecheck.apworld` and a YAML with no album options.

## Pieces

| Piece | What it is |
| --- | --- |
| **Station** | Web client: crate builder, demo seed, live Archipelago connect, 30-second previews |
| **apworld** | Custom Archipelago world. Albums = items, first plays = locations |
| **Discord bot** | Voice client that streams unlocked tracks and sends checks. Hosted as a Docker image |

## How a seed works

1. Build a crate in the [station](docs/station.md) (search Spotify, star a starter album for sphere 0).
2. Download the world pack from the World tab. Put `needlecheck.apworld` in Archipelago's custom worlds folder and `Needlecheck.yaml` in `Players`.
3. Generate and host as usual. See [Archipelago setup](docs/archipelago.md).
4. Connect the station **or** run the [Discord bot](docs/discord-bot.md) against that room.

Received `Album - {name}` items unlock rotation. Playing a track for the first time checks `First Play - {track} [{album}]`.

## Discord bot image

On every merge to `main`, GitHub Actions builds and pushes:

`ghcr.io/t0bst3r/needlecheck:latest`

```yaml
services:
  needlecheck:
    image: ghcr.io/t0bst3r/needlecheck:latest
    env_file: .env
    volumes:
      - ./crate.json:/data/crate.json
      - needlecheck-data:/data
```

Copy `.env.example` to `.env`. Full hosting steps: [docs/discord-bot.md](docs/discord-bot.md).

Spotify is **metadata only** (client credentials). Discord playback is resolved through yt-dlp / ffmpeg. Spotify audio is never streamed.

## Station (this repo's web app)

The station is a late-night listening room you can use without Discord:

- **Crate** — search Spotify (or the public catalog fallback) and assemble the world
- **Station** — vinyl, chat commands (`/play`, `/skip`, `/crate`, `/hint`), first-play checks
- **World** — demo seed with simulated neighbors, or live connect to a real room, plus **Download apworld**

## Repo layout

```
apworld/needlecheck/   Archipelago world (crate baked into data/crate.json)
bot/                   Discord bot
docs/                  Hosting and setup
src/                   Station (TanStack Start)
Dockerfile             Bot image
.github/workflows/     GHCR publish on main
```

## Docs

- [Discord bot hosting](docs/discord-bot.md)
- [Archipelago setup](docs/archipelago.md)
- [Station](docs/station.md)

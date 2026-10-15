# Discord bot

The bot joins a voice channel and plays the crate from the room it is connected to. Album items unlock rotation. The first time a track actually starts, that location is checked.

Audio does not come from Spotify. Spotify in the station is only a search index.

| Source in the YAML | What the bot does |
| --- | --- |
| `file` | Plays that path inside the music folder. This is the normal path. |
| `youtube` | Does nothing until you turn YouTube on. There is no search fallback. |

## 1. Discord application

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Bot tab: add a bot and copy the token into `DISCORD_TOKEN`.
3. OAuth2 → URL Generator. Scopes: `bot`, `applications.commands`. Permissions: Connect, Speak, Send Messages, Embed Links.
4. Invite the bot. Copy the application id into `DISCORD_CLIENT_ID`.
5. Optional: `DISCORD_GUILD_ID` registers slash commands on that server immediately. Without it, global commands can take up to an hour.

Slash commands do not need the message content intent.

## 2. Music folder

Paths in the YAML are relative to `MEDIA_ROOT` (default `/music` in the image). They are not uploaded by the station. `docker compose up` starts the builder beside the bot, on port 8080, reading the same host folder. See [the station](station.md).

```text
Needlecheck.yaml                         music folder
miles/so what.mp3                 →      /music/miles/so what.mp3
```

The bot refuses absolute paths, URLs, and `..`. A missing file is skipped (or reported, if you asked for that track). It is not replaced with a YouTube search.

## 3. YouTube, off by default

Set `YOUTUBE=1`, or in Discord run `/youtube enabled:True`. Either one only affects tracks whose source is already a video id. Turning it off does not require a new seed.

`/youtube` lasts until the process restarts. The env value is what it comes back as.

This rebroadcasts that YouTube audio into a voice channel. YouTube's terms do not allow that. Leave it off unless you have decided the risk is yours. A cookies file (`YTDLP_COOKIES`) only matters when YouTube is on and the host is being blocked.

## 4. Archipelago

`/connect` is how you point the bot at a room:

```text
/connect host:archipelago.gg slot:DJ port:38281
```

The same command replaces the current room. You do not edit the env or restart to change servers. The bot drops the previous crate and reads `slot_data` from the new room: albums, starters, location ids, and the file or video id on each track.

`AP_HOST` and `AP_SLOT` are optional. If both are set, the process connects once at startup. `/connect` still overrides that without a restart.

The slot name must match the YAML `name:`. The game name defaults to `Needlecheck`. `archipelago.gg` uses `wss`. A local or LAN host uses `ws`.

### Same machine, bot in Docker

The container shares the host's network. Use the same address as the tracker:

```text
/connect host:127.0.0.1 slot:DJ port:38281
```

`host.docker.internal` reaches the machine through the Docker bridge, which often cannot see a server that the tracker reaches on `127.0.0.1`. Tailscale Funnel is not required for this.

On Docker Desktop for Mac or Windows, host networking does not reach the machine. Remove `network_mode: host` from the compose file and use `host:host.docker.internal` instead.

## 5. Image

Merges to `main` publish `ghcr.io/t0bst3r/needlecheck` (the bot) and `ghcr.io/t0bst3r/needlecheck-builder` (the page).

The repository is private, so the package is private until you change that.

```sh
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker pull ghcr.io/t0bst3r/needlecheck:latest
```

After the first publish, open the package → Package settings, and grant this repo access to it.

## 6. Run

Copy `.env.example` to `.env`. Put audio files in the folder named by `MUSIC_DIR` (default `./music`) so the relative paths match the YAML. Then:

```sh
docker compose up -d
```

The bot container is `needlecheck`. The page is `needlecheck-builder` at `http://localhost:8080`. Both mount `MUSIC_DIR` at `/music`. The builder lists that folder unless `NEEDLECHECK_ONLINE=1`.

The image includes ffmpeg and yt-dlp. yt-dlp is unused while `YOUTUBE=0`. The bot is the container's main process and stops on `SIGTERM`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token |
| `DISCORD_CLIENT_ID` | recommended | Application id |
| `DISCORD_GUILD_ID` | no | Instant command registration |
| `AP_HOST` | no | Auto-connect. Leave empty and use `/connect` |
| `AP_PORT` | no | Default `38281` |
| `AP_SLOT` | with `AP_HOST` | Slot name |
| `AP_PASSWORD` | no | Room password |
| `AP_GAME` | no | Default `Needlecheck` |
| `MUSIC_DIR` | no | Host folder mounted at `/music` in both containers. Default `./music`. Change this, not the mount |
| `MEDIA_ROOT` | no | Path inside the container. Compose sets `/music` |
| `NEEDLECHECK_ONLINE` | no | `1` hides the music folder on the builder. The bot ignores it. |
| `YOUTUBE` | no | `1` enables video-id tracks. Default off |
| `UNCHECKED_PERCENT` | no | Chance the next song is still unchecked, from 0 to 100. Default `80`. `100` always prefers one. `0` picks any unlocked song. `/fresh` changes it until restart |
| `YTDLP_COOKIES` | no | Only used when YouTube is on |
| `ANNOUNCE_CHANNEL_ID` | no | Unlocks, checks, and room text |

## 7. Commands

| Command | What it does |
| --- | --- |
| `/connect host: slot:` | Join a room and load its crate. Optional `port`, `password`, `game` |
| `/disconnect` | Leave the room and drop the crate |
| `/join` | Join your voice channel and start rotation |
| `/leave` | Disconnect voice |
| `/play [query]` | An unlocked track, or whatever the rotation picks |
| `/pause` `/resume` `/skip` `/stop` | Transport |
| `/shuffle` | Random, or album order |
| `/fresh percent:` | How often the next song is still unchecked. `80` is about 80% unchecked and 20% already checked |
| `/np` | Now playing, and whether it is a file or YouTube |
| `/crate list` | Locked, unlocked, file count, video count |
| `/youtube enabled:` | Optional backend, on or off |
| `/status` `/help` | Room and what can play |

`/fresh` chooses that mix. `100` plays an unchecked song whenever one is left. `0` picks any unlocked song, checked or not. The default is `80`: about four of every five songs are still unchecked, and the fifth is one you already heard. If only one of those groups is left, that group plays. Locked albums stay silent until their item arrives. Starters are unlocked as soon as the room connects. The default can be set with `UNCHECKED_PERCENT`. `/fresh` lasts until the bot restarts.

## 8. What this bot does not do

It does not edit the crate. Change albums in the station, download a new YAML, and generate again. A seed that is already running keeps the crate it was generated with.

It does not play catalog previews. That is the station.

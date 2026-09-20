# Discord bot — hosting and setup

The Needlecheck bot joins a voice channel, plays unlocked albums, and talks to an Archipelago room. Album items from the multiworld are added to the rotation. The first play of each song is a location check.

Spotify is used for **catalog metadata only**. Audio is resolved with yt-dlp (typically YouTube) and ffmpeg. This is required: Discord bots must not stream Spotify audio.

## 1. Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. **Bot** tab: Add a bot. Copy the token (`DISCORD_TOKEN`).
3. Enable **Message Content Intent** only if you later add prefix commands; slash commands do not need it. Default Needlecheck uses slash commands + voice.
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Use Voice Activity` (or just Connect + Speak + Send Messages)
5. Invite the bot to your server with the generated URL.
6. Copy the application ID into `DISCORD_CLIENT_ID`.

Optional: set `DISCORD_GUILD_ID` to your server id so slash commands register immediately. Without it, global commands can take up to an hour.

## 2. Spotify credentials (catalog)

Create a Spotify app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Use **Client Credentials** — no redirect URI, no user login.

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. If they are missing, album search falls back to the public iTunes catalog.

These keys never receive or play Spotify audio.

## 3. Image

Merges to `main` publish `ghcr.io/t0bst3r/needlecheck`. Tags: `latest`, `sha-<commit>`.

The repository is private, so the package is private until you change that. Pull with a GitHub token that can `read:packages`:

```sh
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker pull ghcr.io/t0bst3r/needlecheck:latest
```

First publish: after this workflow runs on `main`, open the package on GitHub → **Package settings** → grant the repo (and any other repos/users that should pull) access.

## 4. Run with Compose

Copy `.env.example` to `.env` and fill it in. Mount the **same** `crate.json` that was baked into the apworld you generated with:

```yaml
services:
  needlecheck:
    image: ghcr.io/t0bst3r/needlecheck:latest
    restart: unless-stopped
    env_file: .env
    environment:
      CRATE_PATH: /data/crate.json
    volumes:
      - ./crate.json:/data/crate.json
      - needlecheck-data:/data

volumes:
  needlecheck-data:
```

Then:

```sh
docker compose up -d
```

The bundled `docker-compose.yml` at the repo root is this layout. A default crate is seeded if `/data/crate.json` is missing — replace it with the crate from your world pack before connecting to a generated seed.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token |
| `DISCORD_CLIENT_ID` | recommended | Application id |
| `DISCORD_GUILD_ID` | no | Instant command registration |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | for Spotify search | Catalog |
| `AP_HOST` | no | Auto-connect host (`archipelago.gg` or a `ws://` URL). Use `/connect` if empty |
| `AP_PORT` | no | Default `38281` |
| `AP_SLOT` | with `AP_HOST` | Slot name (must match YAML `name:`) |
| `AP_PASSWORD` | no | Room password |
| `AP_GAME` | no | Default `Needlecheck` |
| `CRATE_PATH` | no | Default `/data/crate.json` |
| `ANNOUNCE_CHANNEL_ID` | no | Channel for unlock / first-play messages |
| `YTDLP_COOKIES` | no | Path to a Netscape cookies file if YouTube blocks the host |

Local Archipelago servers should use a host without TLS (`localhost` or a LAN IP). Public rooms on `archipelago.gg` use `wss`.

## 5. Build locally

```sh
docker build -t needlecheck-bot .
docker run --env-file .env -v "$PWD/crate.json:/data/crate.json" needlecheck-bot
```

The image includes Node 22, ffmpeg, and yt-dlp. The bot process is the container's main process (handles `SIGTERM`).

## 6. Commands

| Command | What it does |
| --- | --- |
| `/join` | Join your voice channel and start rotation |
| `/leave` | Disconnect voice |
| `/play [query]` | Play a matching unlocked track, or continue rotation |
| `/pause` `/resume` `/skip` `/stop` | Transport |
| `/shuffle` | Toggle random vs album-order rotation |
| `/np` `/queue` | Now playing / upcoming |
| `/crate list` | Locked vs unlocked, first-play counts |
| `/crate search query:` | Spotify (or catalog) search |
| `/crate add id:` | Add an album from search. **Does not rewrite an already-generated seed** |
| `/crate starter name:` | Sphere-0 starter |
| `/crate remove name:` | Drop an album |
| `/connect host: slot: [port] [password]` | Archipelago |
| `/disconnect` | Leave the room |
| `/status` `/help` | Room + crate |

Prefer building the crate in the **station** and downloading a new apworld whenever the album list changes. `/crate add` is for convenience; a live multiworld still uses whatever was generated.

## 7. Playback notes

- Only **unlocked** albums are in rotation. Starters start unlocked; further albums arrive as Archipelago items.
- Unplayed tracks are preferred so first-play checks happen before repeats.
- If YouTube rate-limits the host, place a cookies file at `/data/cookies.txt` (or `YTDLP_COOKIES`) exported from a browser session.
- The bot does not require a Spotify Premium account.

## 8. Permissions checklist

Bot role in the server should be able to see the voice channel and the text channel you use for slash commands. If `/` commands do not appear, wait for global registration or set `DISCORD_GUILD_ID` and restart.

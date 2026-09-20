# Needlecheck Setup

## 1. Build the crate

Do this in Needlecheck, not in the Archipelago options page.

1. Open the Needlecheck station and go to **Crate**.
2. Search Spotify (or the catalog fallback) and add albums.
3. Star the album that should start unlocked (sphere 0).
4. Open **World** and download the world pack.

The pack contains `needlecheck.apworld` (this world, with your crate baked in) and `Needlecheck.yaml`.

## 2. Generate

1. Place `needlecheck.apworld` in Archipelago's `custom_worlds` / `worlds` folder.
2. Put `Needlecheck.yaml` in `Players`. Change `name:` to your slot name.
3. Generate and host as usual.

The YAML has no album list. Changing the crate means downloading a new apworld and generating again.

## 3. Connect

- **Web station:** World tab → host, port, slot, game name `Needlecheck`.
- **Discord bot:** `/connect host:<host> port:<port> slot:<slot>` after the bot is in your server.

First plays send location checks. Received album items unlock that album in the rotation.

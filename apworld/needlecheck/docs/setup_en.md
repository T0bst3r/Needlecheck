# Needlecheck Setup

## 1. Build the crate

Do this in Needlecheck, not on the Archipelago options page.

1. Open the station and go to **Crate**.
2. Search (Spotify, if the server has credentials, otherwise the public catalog).
3. Open an album and attach a YouTube video or a file path to each track you want in the seed. Tracks without a source are left out.
4. Star the album that should start unlocked.
5. Open **World** and download the world pack. The slot name on that page is written into the YAML.

## 2. Generate

1. Place `needlecheck.apworld` in Archipelago's `custom_worlds` folder.
2. Put `Needlecheck.yaml` in `Players`.
3. Generate and host as usual.

The same apworld is used for every Needlecheck slot. Two players can bring different crates. Item ids are hashed from the item name, so the same album name is the same item in both slots.

## 3. Connect

Use the web station's World tab, or `/connect` on the Discord bot. Game name `Needlecheck`, and the slot name from the YAML.

The station plays short previews and can send a location check the first time a track starts. It does not stream the file. The bot plays files from its music folder. YouTube audio stays off unless you enable it.

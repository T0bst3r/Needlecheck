# Needlecheck Setup

## 1. Build the crate

Do this in Needlecheck, not on the Archipelago options page.

1. Open the station. The crate starts empty.
2. Search (Spotify, if the server has credentials, otherwise the public catalog).
3. Choose an album. Attach a YouTube video or a file path to each track you want in the seed. Tracks without a source are left out.
4. Star the album that should start unlocked.
5. Download Needlecheck.yaml on the same page. The slot name there is written into the file. The apworld is not in that download.

## 2. Generate

1. Place `needlecheck.apworld` in Archipelago's `custom_worlds` folder. Download a new copy from the Needlecheck apworld release only when that release changes.
2. Put `Needlecheck.yaml` in `Players`.
3. Generate and host as usual.

The same apworld is used for every Needlecheck slot. Two players can bring different crates. Item ids are hashed from the item name, so the same album name is the same item in both slots.

## 3. Connect

`/connect` on the Discord bot. Game name `Needlecheck`, and the slot name from the YAML.

The bot plays files from its music folder. YouTube audio stays off unless you enable it. The station does not play the crate.

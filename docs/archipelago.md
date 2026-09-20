# Archipelago setup

Needlecheck is a custom Archipelago world. The album list is **not** a YAML option. You build the crate in Needlecheck, bake it into the apworld, then generate.

## Items and locations

| Kind | Name | Notes |
| --- | --- | --- |
| Item | `Album - {album}` | Progression. Starter albums are precollected. |
| Item | `Liner Notes` | Filler, pads the pool to match location count. |
| Location | `First Play - {track} [{album}]` | In logic only after that album item is in the player's inventory. |

Goal: first-play every track in the crate.

The generator and the clients (station + Discord bot) must use the **same** crate. Item and location ids are derived from album/track ids in `crate.json`.

## 1. Build the crate

Do this in Needlecheck, not in the Archipelago options creator.

1. Open the station → **Crate**.
2. Search (Spotify if credentials are set, otherwise the public catalog).
3. Add albums. Star the album that should be unlocked at the start of the seed (sphere 0). At least one starter is required; if you skip this, the first album in the list is used.
4. Open **World** → **Download apworld**.

The zip contains:

- `needlecheck.apworld` — this world with your crate in `needlecheck/data/crate.json`
- `Needlecheck.yaml` — slot file. Only `name:` is yours to change.
- `crate.json` — same crate, for the Discord bot (`CRATE_PATH`)
- `README.txt`

You can also add albums with `/crate search` and `/crate add` on the bot. Changing the crate after a seed is generated will desync ids — download a new pack and generate again.

## 2. Install the apworld

1. Copy `needlecheck.apworld` into Archipelago's custom worlds folder (`custom_worlds` on recent Archipelago, or `lib/worlds` / `worlds` depending on install).
2. Restart the Archipelago launcher / generator so it loads the world.
3. Confirm **Needlecheck** appears in the game list.

The world requires Archipelago 0.5.0 or newer (`archipelago.json`).

## 3. Player YAML

`Needlecheck.yaml` looks like:

```yaml
name: DJ
game: Needlecheck
Needlecheck: {}
```

Set `name:` to the slot name you will type in the station or `/connect`. There are no album checkboxes. Common Archipelago keys (`description`, `requires`) can be added if you want; they are not Needlecheck-specific.

For a multiworld, each Needlecheck player needs an apworld that matches **their** crate. If two players share the same crate, they can share the same apworld file.

## 4. Generate and host

Generate as you would any custom world (Archipelago Launcher → Generate, or `Generate.exe` / `ArchipelagoGenerate`). Host the room (`Host.yaml` or archipelago.gg).

Note the host, port, and room password.

## 5. Connect a client

**Station:** World tab → host, port, slot, game name `Needlecheck`, password if any → Connect. First plays send `LocationChecks`. Incoming `Album - …` items unlock rotation.

**Discord bot:** `/connect host:<host> slot:<slot> port:<port> password:<optional>` after `/join`, or set `AP_HOST` / `AP_SLOT` so the container connects on boot. Point `CRATE_PATH` at the `crate.json` from the same pack.

The station also has a **demo seed** that simulates neighbors (Maya, Rook, Jun) without a server. That mode is local only and does not need this apworld.

## 6. Changing the crate

The baked `data/crate.json` inside the apworld **is** the world. To add or remove albums:

1. Edit the crate in the station (or bot).
2. Download a new pack.
3. Replace the apworld.
4. Generate a new seed.

Do not hand-edit Archipelago's options page expecting albums to appear.

## 7. Manual / tracker

Location names are unique per track+album, so poptracker / text clients can hint `First Play - Reckoner [In Rainbows]`. Album items are `Album - In Rainbows`.

# Archipelago setup

Needlecheck is one generic Archipelago world. The albums are not baked into the apworld, and they are not built on the options page. They live in the player YAML, under `Needlecheck.crate`.

The schema for that list is [apworld/needlecheck/crate.schema.json](../apworld/needlecheck/crate.schema.json).

## Items and locations

| Kind | Name | Notes |
| --- | --- | --- |
| Item | `Album - {album} — {artist}` | Progression. `starter: true` albums are precollected. |
| Item | `Liner Notes` | Filler. Fills locations that do not hold an album. |
| Location | `First Play - {track} [{album} — {artist}]` | In logic only after that album item is collected. |

If two albums in one crate would share a name, the album id is appended in parentheses. Location names do the same with `album id/track id` when a track title repeats.

Ids are a hash of the name, so two slots that name an album the same way get the same item id. The world registers those names during generation. The seed's slot data repeats them, which is what the station reads if the datapackage was built before the names existed.

Goal: collect every album item.

## Crate shape

```yaml
name: "DJ"
game: Needlecheck
Needlecheck:
  crate:
    - id: "268443092"
      name: "Kind of Blue"
      artist: "Miles Davis"
      starter: true
      tracks:
        - id: "so-what"
          name: "So What"
          artist: "Miles Davis"
          number: 1
          source:
            kind: file
            path: "miles/kind of blue/so what.mp3"
        - id: "freddie"
          name: "Freddie Freeloader"
          artist: "Miles Davis"
          number: 2
          source:
            kind: youtube
            id: "dQw4w9WgXcQ"
```

Rules the world actually checks:

- `id`, `name`, and `artist` are required on every album. `id` and `name` are required on every track.
- `source.kind` is `youtube` or `file`. A YouTube source is an 11-character video id (a full URL is accepted and reduced to the id). A file source is a path, not a web address. The file is not uploaded.
- One album must be `starter: true`. With none, generation stops.
- An empty `crate: []` parses, then generation stops and tells you to download a YAML from the station.
- `artwork` and `year` are optional.

You can hand-edit this. The station writes the same shape, and it will not write a track that has no source.

## 1. Build the crate

1. Open the station → **Crate**.
2. Search. Spotify is used when the station has client credentials. Otherwise the public catalog is used.
3. Choose an album. Attach a YouTube video or a file path to the tracks that should be locations. Leave the rest blank.
4. Add the album. Star a starter. The demo albums already in the crate do not count until you do this — their previews are only for the listening room.
5. **World** → **Download world pack**. The slot name on that page becomes `name:` in the YAML.

The zip contains:

- `needlecheck.apworld` — the generic world. No albums inside it. The zip stamps the container manifest (`version` and `compatible_version` 7) that Archipelago 0.7.0 requires. Replace any older copy of this file. Keeping both makes the generator load the world twice.
- `Needlecheck.yaml` — this slot's crate.
- `README.txt`

## 2. Install and generate

1. Copy `needlecheck.apworld` into Archipelago's `custom_worlds` folder (or `worlds`, depending on the install).
2. Restart the generator so Needlecheck appears in the game list.
3. Copy `Needlecheck.yaml` into `Players`.
4. Generate and host.

Requires Archipelago 0.5.0 or newer. The same apworld file serves every Needlecheck slot. Give each player their own YAML.

Do not expect the website's player-options form to edit the crate. The option is omitted from that form on purpose. Paste the YAML.

## 3. Connect

**Station:** World tab → host, port, the slot name from the YAML, game name `Needlecheck`.

**Bot:** `/connect` with that same host, port, and slot. It reads this seed's crate from the room, then plays file paths from its music folder. YouTube tracks stay silent unless YouTube is turned on. Another `/connect` points it at a different room without a restart. See [the Discord bot](discord-bot.md).

First plays send location checks. Received album items unlock that album. The station does not play the YouTube video or the file. It plays a short preview when the catalog has one. The bot is what plays the full track.

## 4. Changing the crate

Edit the crate in the station, download a new YAML, and generate again. You do not replace the apworld unless the world code itself changed. A seed already generated keeps the old crate.

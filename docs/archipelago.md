# Archipelago setup

Needlecheck is one generic Archipelago world. The albums are not baked into the apworld, and they are not built on the options page. They live in the player YAML, under `Needlecheck.crate`.

The schema for that list is [apworld/needlecheck/crate.schema.json](../apworld/needlecheck/crate.schema.json).

## Items and locations

| Kind | Name | Notes |
| --- | --- | --- |
| Item | `Album - {album} — {artist}` | Progression. `starter: true` albums are precollected. |
| Item | `Liner Notes` | Filler. Fills locations that do not hold an album. |
| Item | `Locked Groove` | Trap. The next song is one that was already listened to. |
| Item | `Wrong Speed` | Trap. The current song plays faster or slower, from 0.5× to 2×. |
| Item | `Tonearm Lift` | Trap. Playback pauses for 5 to 15 seconds. |
| Location | `First Play - {track} [{album} — {artist}]` | In logic only after that album item is collected. |

If two albums in one crate would share a name, the album id is appended in parentheses. Location names do the same with `album id/track id` when a track title repeats.

Ids are a hash of the name, so two slots that name an album the same way get the same item id. The world registers those names during generation. The seed's slot data repeats them, which is what the station reads if the datapackage was built before the names existed.

Goal: collect every album item.

`trap_percentage` (0 by default) is how many of the Liner Notes are traps instead. Traps never remove an album. `death_link: true` is the usual Archipelago option. Needlecheck restarts the current song when a death arrives, and it never sends one. Both stay off until the YAML turns them on. A new apworld (0.3.0) is required. An older seed has neither.

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

1. Open the station. The crate starts empty.
2. Search. Spotify is used when the station has client credentials. Otherwise the public catalog is used.
3. Choose an album. It opens in a dialog. Attach a YouTube video or a file path to the tracks that should be locations. Leave the rest blank.
4. Add the album. Star a starter.
5. Download the YAML on the same page. The slot name there becomes `name:` in the file.

`needlecheck.apworld` is not part of that download. Get it from the [apworld release](https://github.com/T0bst3r/Needlecheck/releases/tag/apworld). It is the generic world, with no albums inside it. The release stamps the container manifest (`version` and `compatible_version` 7) that Archipelago 0.7.0 requires. Replace an older copy only when the release changes. Keeping both makes the generator load the world twice.

## 2. Install and generate

1. Copy `needlecheck.apworld` from the release into Archipelago's `custom_worlds` folder (or `worlds`, depending on the install). Do this once.
2. Restart the generator so Needlecheck appears in the game list.
3. Copy `Needlecheck.yaml` into `Players`.
4. Generate and host.

Requires Archipelago 0.5.0 or newer. The same apworld file serves every Needlecheck slot. Give each player their own YAML.

Do not expect the website's player-options form to edit the crate. The option is omitted from that form on purpose. Paste the YAML.

## 3. Connect

**Bot:** `/connect` with that host, port, and slot. It reads this seed's crate from the room, then plays file paths from its music folder. YouTube tracks stay silent unless YouTube is turned on. Another `/connect` points it at a different room without a restart. See [the Discord bot](discord-bot.md).

The bot checks a location after about 90% of that track has played. Skipping earlier does not count. Received album items unlock that album. The station does not play the YouTube video or the file. It plays a short preview when the catalog has one. The bot is what plays the full track.

## 4. Changing the crate

Edit the crate in the station, download a new YAML, and generate again. You do not replace the apworld unless its release changed. A seed already generated keeps the old crate.

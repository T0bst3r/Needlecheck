# Needlecheck

Late night on the multiworld.

Needlecheck is a listening-room randomizer. The apworld is the same for every slot. The albums are in that slot's YAML, under `Needlecheck.crate`.

## What goes in the crate

Each album is a progression item: `Album - {album} — {artist}`. One or more albums are marked `starter: true` and begin in starting inventory.

Every track on those albums is a location: `First Play - {track} [{album} — {artist}]`. The location is in logic only after that album item has been received.

A track with no source is not a location. `source.kind` is `youtube` (a video id) or `file` (a path on the machine that will play it). This world does not play audio.

Filler is `Liner Notes`.

## Goal

Collect every album item. Starters count as already collected. The rest are shuffled onto first-play locations.

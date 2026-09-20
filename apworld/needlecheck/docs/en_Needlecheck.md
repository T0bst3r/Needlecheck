# Needlecheck

Late night on the multiworld.

Needlecheck is a listening-room randomizer. You pick a crate of albums in the Needlecheck station (or the Discord bot) using Spotify. That crate is baked into this apworld — there are no album options in the Archipelago YAML.

## Items

Each album in the crate is a progression item named `Album - {album}`. Starter albums are placed in starting inventory so sphere 0 has something to play.

Filler is `Liner Notes`.

## Locations

Every unique track is a location: `First Play - {track} [{album}]`. A location is in logic only after its album item has been received.

Playing a song for the first time in the Needlecheck client (web station or Discord bot) sends that location check.

## Goal

First-play every track in the crate.

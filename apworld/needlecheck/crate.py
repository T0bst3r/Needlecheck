"""Crate schema shared by generation and the station.

No Archipelago imports. The world reads a list of albums from the slot YAML.
A track is refused unless it names a YouTube video or a file path.
"""

from __future__ import annotations

import re
from collections import Counter
from urllib.parse import parse_qs, urlparse

ITEM_BASE = 1_000_000_000
LOCATION_BASE = 2_000_000_000
ID_SPAN = 100_000_000
FILLER_NAME = "Liner Notes"
FILLER_ID = 2_900_000_001
DASH = "—"
YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
URL_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*://", re.IGNORECASE)


class CrateError(ValueError):
    pass


def hash32(text: str) -> int:
    value = 2166136261
    for byte in text.encode("utf-8"):
        value ^= byte
        value = (value * 16777619) & 0xFFFFFFFF
    return value


def ap_id(name: str, base: int) -> int:
    return base + (hash32(name) % ID_SPAN)


def album_item_name(album_name: str, artist: str) -> str:
    return f"Album - {album_name} {DASH} {artist}"


def track_location_name(track_name: str, album_name: str, artist: str) -> str:
    return f"First Play - {track_name} [{album_name} {DASH} {artist}]"


def youtube_id(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if YOUTUBE_ID.match(text):
        return text
    parsed = urlparse(text)
    if not parsed.scheme or not parsed.netloc:
        return None
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    if host == "youtu.be":
        part = parsed.path.strip("/").split("/")[0] if parsed.path.strip("/") else ""
        return part if YOUTUBE_ID.match(part) else None
    if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        query = parse_qs(parsed.query).get("v", [""])[0]
        if YOUTUBE_ID.match(query):
            return query
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) > 1 and parts[0] in {"embed", "shorts", "live", "v"} and YOUTUBE_ID.match(parts[1]):
            return parts[1]
    return None


def file_path(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or len(text) > 400:
        return None
    if any(char in text for char in ("\r", "\n", "\x00")):
        return None
    if URL_SCHEME.match(text):
        return None
    return text


def _require_text(raw: dict, key: str, label: str) -> str:
    value = raw.get(key)
    if not isinstance(value, str) or not value.strip():
        raise CrateError(f"{label} is missing {key}.")
    return value.strip()


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if value is None:
        return False
    raise CrateError(f"Expected true or false, got {value!r}.")


def _as_int(value: object, label: str) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise CrateError(f"{label} must be a number.")
    if isinstance(value, str):
        if not value.strip().lstrip("-").isdigit():
            raise CrateError(f"{label} must be a number.")
        return int(value.strip())
    return int(value)


def _source(raw: object, label: str) -> dict:
    if not isinstance(raw, dict):
        raise CrateError(f"{label} needs a source (youtube or file).")
    kind = raw.get("kind")
    if kind == "youtube":
        video = youtube_id(raw.get("id") or raw.get("url") or "")
        if not video:
            raise CrateError(f"{label} needs a YouTube video id or URL.")
        return {"kind": "youtube", "id": video}
    if kind == "file":
        path = file_path(raw.get("path") or "")
        if not path:
            raise CrateError(f"{label} needs a file path, not a URL.")
        return {"kind": "file", "path": path}
    raise CrateError(f"{label} source.kind must be youtube or file.")


def _unique(base: str, seen: Counter, suffix: str) -> str:
    if seen[base] > 1:
        return f"{base} ({suffix})"
    return base


def _claim_ids(names: list[str], base: int, kind: str) -> None:
    seen: dict[int, str] = {}
    for name in names:
        code = ap_id(name, base)
        previous = seen.get(code)
        if previous is not None and previous != name:
            raise CrateError(
                f"Two {kind} names hash to the same id ({previous!r} and {name!r}). Rename one of them."
            )
        seen[code] = name


def normalize_crate(data: object) -> list[dict]:
    """Return albums with item/location names and ids filled in.

    An empty list is allowed so an untouched template still parses.
    Generation refuses to roll an empty crate.
    """
    if data is None:
        return []
    if isinstance(data, dict) and "albums" in data:
        data = data["albums"]
    if not isinstance(data, list):
        raise CrateError("Needlecheck crate must be a list of albums.")
    if not data:
        return []

    parsed: list[dict] = []
    album_ids: set[str] = set()
    for index, raw in enumerate(data, start=1):
        if not isinstance(raw, dict):
            raise CrateError(f"Album {index} must be a mapping.")
        label = f"Album {index}"
        album_id = _require_text(raw, "id", label)
        name = _require_text(raw, "name", label)
        artist = _require_text(raw, "artist", label)
        label = f"{name} — {artist}"
        if album_id in album_ids:
            raise CrateError(f"Duplicate album id {album_id}.")
        album_ids.add(album_id)
        tracks_raw = raw.get("tracks")
        if not isinstance(tracks_raw, list) or not tracks_raw:
            raise CrateError(f"{label} needs at least one track.")
        tracks: list[dict] = []
        track_ids: set[str] = set()
        for track_index, track_raw in enumerate(tracks_raw, start=1):
            if not isinstance(track_raw, dict):
                raise CrateError(f"{label} track {track_index} must be a mapping.")
            track_label = f"{label} track {track_index}"
            track_id = _require_text(track_raw, "id", track_label)
            track_name = _require_text(track_raw, "name", track_label)
            if track_id in track_ids:
                raise CrateError(f"{label} has two tracks with id {track_id}.")
            track_ids.add(track_id)
            track_artist = track_raw.get("artist")
            if not isinstance(track_artist, str) or not track_artist.strip():
                track_artist = artist
            else:
                track_artist = track_artist.strip()
            number = _as_int(track_raw.get("number", track_raw.get("track_number")), f"{track_label} number")
            duration = _as_int(track_raw.get("duration_ms"), f"{track_label} duration_ms")
            tracks.append(
                {
                    "id": track_id,
                    "name": track_name,
                    "artist": track_artist,
                    "number": number if number is not None else track_index,
                    "duration_ms": duration or 0,
                    "source": _source(track_raw.get("source"), track_label),
                }
            )
        year = _as_int(raw.get("year"), f"{label} year")
        artwork = raw.get("artwork")
        if artwork is not None and not isinstance(artwork, str):
            raise CrateError(f"{label} artwork must be a string.")
        parsed.append(
            {
                "id": album_id,
                "name": name,
                "artist": artist,
                "starter": _as_bool(raw.get("starter")),
                "year": year,
                "artwork": artwork.strip() if isinstance(artwork, str) and artwork.strip() else "",
                "tracks": tracks,
            }
        )

    if not any(album["starter"] for album in parsed):
        raise CrateError("Mark one album with starter: true so the seed has something to play.")

    album_bases = [album_item_name(album["name"], album["artist"]) for album in parsed]
    album_counts = Counter(album_bases)
    item_names = [_unique(base, album_counts, album["id"]) for base, album in zip(album_bases, parsed)]

    location_drafts: list[tuple[int, int, str, str]] = []
    for album_index, album in enumerate(parsed):
        for track_index, track in enumerate(album["tracks"]):
            location_drafts.append(
                (
                    album_index,
                    track_index,
                    track_location_name(track["name"], album["name"], album["artist"]),
                    f"{album['id']}/{track['id']}",
                )
            )
    location_counts = Counter(base for _, _, base, _ in location_drafts)
    location_names = {
        (album_index, track_index): _unique(base, location_counts, suffix)
        for album_index, track_index, base, suffix in location_drafts
    }
    _claim_ids(item_names, ITEM_BASE, "item")
    _claim_ids(list(location_names.values()), LOCATION_BASE, "location")

    normalized: list[dict] = []
    for album_index, album in enumerate(parsed):
        item_name = item_names[album_index]
        ready_tracks = []
        for track_index, track in enumerate(album["tracks"]):
            location_name = location_names[(album_index, track_index)]
            ready_tracks.append(
                {
                    **track,
                    "location_name": location_name,
                    "location_id": ap_id(location_name, LOCATION_BASE),
                }
            )
        normalized.append(
            {
                **album,
                "item_name": item_name,
                "item_id": ap_id(item_name, ITEM_BASE),
                "tracks": ready_tracks,
            }
        )
    return normalized

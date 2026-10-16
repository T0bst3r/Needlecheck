"""Crate schema tests. Run from the repo root: python3 scripts/test_needlecheck_crate.py"""

from __future__ import annotations

import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("needlecheck_crate", ROOT / "apworld" / "needlecheck" / "crate.py")
assert SPEC and SPEC.loader
crate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(crate)


class CrateTest(unittest.TestCase):
    def test_hash_matches_the_station_contract(self) -> None:
        name = "Album - Kind of Blue — Miles Davis"
        self.assertEqual(crate.ap_id(name, crate.ITEM_BASE), crate.ITEM_BASE + (crate.hash32(name) % crate.ID_SPAN))

    def test_normalizes_sources_and_refuses_a_bare_track(self) -> None:
        albums = crate.normalize_crate(
            [
                {
                    "id": "268443092",
                    "name": "Kind of Blue",
                    "artist": "Miles Davis",
                    "starter": True,
                    "tracks": [
                        {
                            "id": "so-what",
                            "name": "So What",
                            "source": {"kind": "file", "path": "  miles/so what.mp3  "},
                        },
                        {
                            "id": "freddie",
                            "name": "Freddie Freeloader",
                            "source": {"kind": "youtube", "url": "https://youtu.be/dQw4w9WgXcQ?t=3"},
                        },
                    ],
                }
            ]
        )
        self.assertEqual(albums[0]["item_name"], "Album - Kind of Blue — Miles Davis")
        self.assertEqual(albums[0]["tracks"][0]["source"], {"kind": "file", "path": "miles/so what.mp3"})
        self.assertEqual(albums[0]["tracks"][1]["source"]["id"], "dQw4w9WgXcQ")
        self.assertEqual(albums[0]["item_id"], crate.ap_id(albums[0]["item_name"], crate.ITEM_BASE))
        self.assertEqual(
            albums[0]["tracks"][0]["location_id"],
            crate.ap_id(albums[0]["tracks"][0]["location_name"], crate.LOCATION_BASE),
        )

    def test_duplicate_titles_are_disambiguated(self) -> None:
        albums = crate.normalize_crate(
            [
                {
                    "id": "a",
                    "name": "Blue",
                    "artist": "X",
                    "starter": True,
                    "tracks": [{"id": "1", "name": "Theme", "source": {"kind": "file", "path": "a.mp3"}}],
                },
                {
                    "id": "b",
                    "name": "Blue",
                    "artist": "X",
                    "tracks": [{"id": "1", "name": "Theme", "source": {"kind": "file", "path": "b.mp3"}}],
                },
            ]
        )
        self.assertEqual(albums[0]["item_name"], "Album - Blue — X (a)")
        self.assertEqual(albums[1]["item_name"], "Album - Blue — X (b)")
        self.assertIn("(a/1)", albums[0]["tracks"][0]["location_name"])

    def test_refuses_missing_source_and_missing_starter(self) -> None:
        with self.assertRaises(crate.CrateError):
            crate.normalize_crate(
                [
                    {
                        "id": "a",
                        "name": "Blue",
                        "artist": "X",
                        "starter": True,
                        "tracks": [{"id": "1", "name": "Theme"}],
                    }
                ]
            )
        with self.assertRaises(crate.CrateError):
            crate.normalize_crate(
                [
                    {
                        "id": "a",
                        "name": "Blue",
                        "artist": "X",
                        "tracks": [{"id": "1", "name": "Theme", "source": {"kind": "file", "path": "a.mp3"}}],
                    }
                ]
            )

    def test_empty_crate_parses(self) -> None:
        self.assertEqual(crate.normalize_crate([]), [])

    def test_register_names_leaves_the_static_maps_alone(self) -> None:
        albums = crate.normalize_crate(
            [
                {
                    "id": "a",
                    "name": "Blue",
                    "artist": "X",
                    "starter": True,
                    "tracks": [{"id": "1", "name": "Theme", "source": {"kind": "file", "path": "a.mp3"}}],
                }
            ]
        )
        items = {crate.FILLER_NAME: crate.FILLER_ID}
        locations: dict[str, int] = {}
        registered_items, registered_locations = crate.register_names(items, locations, albums)
        self.assertEqual(items, {crate.FILLER_NAME: crate.FILLER_ID})
        self.assertEqual(locations, {})
        self.assertEqual(registered_items[albums[0]["item_name"]], albums[0]["item_id"])
        track = albums[0]["tracks"][0]
        self.assertEqual(registered_locations[track["location_name"]], track["location_id"])

    def test_trap_fill_replaces_part_of_the_filler(self) -> None:
        self.assertEqual(crate.trap_fill(0, 50), 0)
        self.assertEqual(crate.trap_fill(10, 0), 0)
        self.assertEqual(crate.trap_fill(10, 25), 2)
        self.assertEqual(crate.trap_fill(1, 50), 0)
        self.assertEqual(crate.trap_fill(1, 100), 1)


if __name__ == "__main__":
    unittest.main()

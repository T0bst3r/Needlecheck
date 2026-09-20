from __future__ import annotations

import json
import os
from dataclasses import dataclass

from BaseClasses import Item, ItemClassification, Location, Region, Tutorial
from Options import PerGameCommonOptions
from worlds.AutoWorld import WebWorld, World

ROOT = os.path.dirname(__file__)


def _load_crate() -> dict:
    path = os.path.join(ROOT, "data", "crate.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


CRATE = _load_crate()
GAME_NAME = "Needlecheck"
FILLER_NAME = "Liner Notes"


def album_item_name(album_name: str) -> str:
    return f"Album - {album_name}"


def track_location_name(track_name: str, album_name: str) -> str:
    return f"First Play - {track_name} [{album_name}]"


def stable_id(salt: str, minimum: int) -> int:
    h = 2166136261
    for ch in salt:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return minimum + (h % 800000)


def _maps() -> tuple[dict[str, int], dict[str, int]]:
    items: dict[str, int] = {FILLER_NAME: 2_000_001}
    locations: dict[str, int] = {}
    used: set[int] = {2_000_001}
    for album in CRATE["albums"]:
        name = album_item_name(album["name"])
        iid = stable_id(f"item:{album['id']}", 1_000_000)
        while iid in used:
            iid += 1
        used.add(iid)
        items[name] = iid
        for track in album["tracks"]:
            loc = track_location_name(track["name"], album["name"])
            lid = stable_id(f"loc:{track['id']}", 3_000_000)
            while lid in used:
                lid += 1
            used.add(lid)
            locations[loc] = lid
    return items, locations


item_name_to_id, location_name_to_id = _maps()


@dataclass
class NeedlecheckOptions(PerGameCommonOptions):
    """Album lists are not options. Build the crate in Needlecheck, then bake it into this apworld."""


class NeedlecheckItem(Item):
    game = GAME_NAME


class NeedlecheckLocation(Location):
    game = GAME_NAME


class NeedlecheckWeb(WebWorld):
    theme = "partyTime"
    tutorials = [
        Tutorial(
            "Setup Guide",
            "A guide to setting up Needlecheck for Archipelago.",
            "English",
            "setup_en.md",
            "setup/en",
            ["Needlecheck"],
        )
    ]


class NeedlecheckWorld(World):
    """Listening-room randomizer. Items are albums. Locations are first plays."""

    game = GAME_NAME
    web = NeedlecheckWeb()
    options_dataclass = NeedlecheckOptions
    options: NeedlecheckOptions
    origin_region_name = "Menu"
    item_name_to_id = item_name_to_id
    location_name_to_id = location_name_to_id

    def create_item(self, name: str) -> Item:
        classification = (
            ItemClassification.progression if name.startswith("Album - ") else ItemClassification.filler
        )
        return NeedlecheckItem(name, classification, self.item_name_to_id[name], self.player)

    def generate_early(self) -> None:
        non_starters = [album for album in CRATE["albums"] if not album.get("starter")]
        if non_starters:
            self.multiworld.local_early_items[self.player][album_item_name(non_starters[0]["name"])] = 1

    def create_regions(self) -> None:
        menu = Region("Menu", self.player, self.multiworld)
        self.multiworld.regions.append(menu)
        for album in CRATE["albums"]:
            region = Region(album["name"], self.player, self.multiworld)
            required = album_item_name(album["name"])
            for track in album["tracks"]:
                loc_name = track_location_name(track["name"], album["name"])
                location = NeedlecheckLocation(
                    self.player,
                    loc_name,
                    location_name_to_id[loc_name],
                    region,
                )
                location.access_rule = lambda state, item=required, player=self.player: state.has(item, player)
                region.locations.append(location)
            menu.connect(region, f"Unlock {album['name']}")
            self.multiworld.regions.append(region)

    def create_items(self) -> None:
        pool: list[Item] = []
        for album in CRATE["albums"]:
            item = self.create_item(album_item_name(album["name"]))
            if album.get("starter"):
                self.multiworld.push_precollected(item)
            else:
                pool.append(item)
        unfilled = len(self.multiworld.get_unfilled_locations(self.player))
        while len(pool) < unfilled:
            pool.append(self.create_item(FILLER_NAME))
        self.multiworld.itempool += pool

    def get_filler_item_name(self) -> str:
        return FILLER_NAME

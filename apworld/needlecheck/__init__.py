from __future__ import annotations

from BaseClasses import Item, ItemClassification, Location, Region, Tutorial
from Options import OptionError
from worlds.AutoWorld import WebWorld, World

from .crate import FILLER_ID, FILLER_NAME
from .options import NeedlecheckOptions

GAME_NAME = "Needlecheck"


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
    """Listening-room randomizer. One generic world. The crate is in the player YAML."""

    game = GAME_NAME
    web = NeedlecheckWeb()
    options_dataclass = NeedlecheckOptions
    options: NeedlecheckOptions
    origin_region_name = "Menu"
    item_name_to_id = {FILLER_NAME: FILLER_ID}
    location_name_to_id: dict[str, int] = {}

    def create_item(self, name: str) -> Item:
        classification = ItemClassification.filler if name == FILLER_NAME else ItemClassification.progression
        return NeedlecheckItem(name, classification, self.item_name_to_id[name], self.player)

    def generate_early(self) -> None:
        crate = self.options.crate.value
        if not crate:
            raise OptionError(
                "Needlecheck has no crate. In the station, attach a YouTube video or a file path, "
                "then download Needlecheck.yaml."
            )
        self.crate = crate
        items = type(self).item_name_to_id
        locations = type(self).location_name_to_id
        items.setdefault(FILLER_NAME, FILLER_ID)
        for album in crate:
            _claim(items, album["item_name"], album["item_id"])
            for track in album["tracks"]:
                _claim(locations, track["location_name"], track["location_id"])
        locked = [album for album in crate if not album["starter"]]
        if locked:
            self.multiworld.local_early_items[self.player][locked[0]["item_name"]] = 1

    def create_regions(self) -> None:
        menu = Region("Menu", self.player, self.multiworld)
        self.multiworld.regions.append(menu)
        for album in self.crate:
            region = Region(album["item_name"], self.player, self.multiworld)
            required = album["item_name"]
            for track in album["tracks"]:
                location = NeedlecheckLocation(
                    self.player,
                    track["location_name"],
                    track["location_id"],
                    region,
                )
                location.access_rule = lambda state, item=required, player=self.player: state.has(item, player)
                region.locations.append(location)
            menu.connect(region)
            self.multiworld.regions.append(region)

    def create_items(self) -> None:
        pool: list[Item] = []
        for album in self.crate:
            item = self.create_item(album["item_name"])
            if album["starter"]:
                self.multiworld.push_precollected(item)
            else:
                pool.append(item)
        unfilled = len(self.multiworld.get_unfilled_locations(self.player))
        while len(pool) < unfilled:
            pool.append(self.create_item(FILLER_NAME))
        self.multiworld.itempool += pool

    def set_rules(self) -> None:
        names = [album["item_name"] for album in self.crate]
        player = self.player
        self.multiworld.completion_condition[player] = lambda state, names=names, player=player: all(
            state.has(name, player) for name in names
        )

    def get_filler_item_name(self) -> str:
        return FILLER_NAME

    def fill_slot_data(self) -> dict:
        return {
            "albums": [
                {
                    "id": album["id"],
                    "name": album["name"],
                    "artist": album["artist"],
                    "starter": album["starter"],
                    "item_name": album["item_name"],
                    "item_id": album["item_id"],
                    "tracks": [
                        {
                            "id": track["id"],
                            "name": track["name"],
                            "location_name": track["location_name"],
                            "location_id": track["location_id"],
                            "source": track["source"],
                        }
                        for track in album["tracks"]
                    ],
                }
                for album in self.crate
            ]
        }


def _claim(mapping: dict[str, int], name: str, code: int) -> None:
    previous = mapping.get(name)
    if previous is not None and previous != code:
        raise OptionError(f"Needlecheck already mapped {name} to {previous}, not {code}.")
    owner = next((existing for existing, existing_id in mapping.items() if existing_id == code and existing != name), None)
    if owner:
        raise OptionError(f"Needlecheck id {code} is used by both {owner!r} and {name!r}.")
    mapping[name] = code

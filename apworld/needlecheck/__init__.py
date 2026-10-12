from __future__ import annotations

from BaseClasses import Item, ItemClassification, Location, Region, Tutorial
from Options import OptionError
from worlds.AutoWorld import WebWorld, World, data_package_checksum

from .crate import FILLER_ID, FILLER_NAME, CrateError, register_names
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
        # The class maps are checksummed when the world loads. A seed's albums have to live on the
        # player, or archipelago.gg rejects the room for a checksum mismatch.
        try:
            self.item_name_to_id, self.location_name_to_id = register_names(
                type(self).item_name_to_id, type(self).location_name_to_id, crate
            )
        except CrateError as exc:
            raise OptionError(str(exc)) from exc
        self.item_id_to_name = {code: name for name, code in self.item_name_to_id.items()}
        self.location_id_to_name = {code: name for name, code in self.location_name_to_id.items()}
        locked = [album for album in crate if not album["starter"]]
        if locked:
            self.multiworld.local_early_items[self.player][locked[0]["item_name"]] = 1

    def modify_multidata(self, multidata: dict) -> None:
        current = multidata["datapackage"][self.game]
        items = dict(current["item_name_to_id"])
        locations = dict(current["location_name_to_id"])
        items.update(self.item_name_to_id)
        locations.update(self.location_name_to_id)
        package = {
            "item_name_groups": {
                name: sorted(group) for name, group in sorted(current.get("item_name_groups", {}).items())
            },
            "item_name_to_id": dict(sorted(items.items())),
            "location_name_groups": {
                name: sorted(group) for name, group in sorted(current.get("location_name_groups", {}).items())
            },
            "location_name_to_id": dict(sorted(locations.items())),
        }
        package["checksum"] = data_package_checksum(package)
        multidata["datapackage"][self.game] = package

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


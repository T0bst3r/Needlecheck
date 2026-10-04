from __future__ import annotations

from dataclasses import dataclass

from Options import Option, OptionError, PerGameCommonOptions, Visibility

from .crate import CrateError, normalize_crate


class Crate(Option[list]):
    """Albums for this slot.

    Written by Needlecheck as YAML. Do not build the list on the Archipelago
    options page. Each album has an id, name, artist, and tracks. Each track
    has a source: kind youtube and an 11-character video id, or kind file and
    a path on the machine that will play it. One album must be starter: true.
    """

    display_name = "Crate"
    default = []
    supports_weighting = False
    visibility = Visibility.template | Visibility.spoiler
    rich_text_doc = False

    def __init__(self, value: list | None = None):
        try:
            self.value = normalize_crate([] if value is None else value)
        except CrateError as exc:
            raise OptionError(str(exc)) from exc

    @classmethod
    def from_any(cls, data: object) -> Crate:
        if isinstance(data, cls):
            return data
        if isinstance(data, str):
            text = data.strip()
            if not text:
                return cls([])
            import json

            try:
                data = json.loads(text)
            except json.JSONDecodeError as exc:
                raise OptionError("Needlecheck crate text has to be JSON, or a YAML list.") from exc
        return cls(data)  # type: ignore[arg-type]

    @classmethod
    def get_option_name(cls, value: object) -> str:
        count = len(value) if isinstance(value, list) else 0
        return "1 album" if count == 1 else f"{count} albums"

    @property
    def current_key(self) -> str:
        return self.get_option_name(self.value)


@dataclass
class NeedlecheckOptions(PerGameCommonOptions):
    crate: Crate

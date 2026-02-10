from __future__ import annotations

import re
from html.parser import HTMLParser

from ai_headshot_studio.app import STATIC_DIR


class _IdCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key == "id" and value:
                self.ids.append(value)


def test_static_index_has_no_duplicate_ids() -> None:
    index = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    parser = _IdCollector()
    parser.feed(index)
    seen: set[str] = set()
    duplicates: set[str] = set()
    for item in parser.ids:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    assert not duplicates


def test_static_app_getelementbyid_targets_exist_in_html() -> None:
    index = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    parser = _IdCollector()
    parser.feed(index)
    html_ids = set(parser.ids)

    app_js = (STATIC_DIR / "app.js").read_text(encoding="utf-8")
    # Keep this narrow and deterministic: only validate `getElementById("...")` lookups.
    ids = set(re.findall(r"getElementById\\(\"([^\"]+)\"\\)", app_js))
    ids |= set(re.findall(r"getElementById\\('([^']+)'\\)", app_js))

    missing = sorted([item for item in ids if item not in html_ids])
    assert not missing

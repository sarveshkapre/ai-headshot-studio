from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path


class _IdCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key == "id" and value:
                self.ids.append(value)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def test_static_index_has_no_duplicate_ids() -> None:
    index = (_repo_root() / "static" / "index.html").read_text(encoding="utf-8")
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
    root = _repo_root()
    index = (root / "static" / "index.html").read_text(encoding="utf-8")
    parser = _IdCollector()
    parser.feed(index)
    html_ids = set(parser.ids)

    app_js = (root / "static" / "app.js").read_text(encoding="utf-8")
    # Keep this narrow and deterministic: only validate `getElementById("...")` lookups.
    ids = set(re.findall(r"getElementById\\(\"([^\"]+)\"\\)", app_js))
    ids |= set(re.findall(r"getElementById\\('([^']+)'\\)", app_js))

    missing = sorted([item for item in ids if item not in html_ids])
    assert not missing

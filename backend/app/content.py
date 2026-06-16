"""Content layer — encyclicals & dispatches loaded from markdown.
File version: 1.0 · 16JUN2026

The prestige unit (the Encyclical) and the recurring unit (the Dispatch, one
issue of The Galactic Observer) both live as markdown files with frontmatter.
This keeps the *words* in plain text where Angie — and the rest of the little
communion — can write them by hand, hand pieces around, and never fight a CMS.

Philosophy: the words are sacred; the code that frames them is a reliquary, not
a author. We parse, we render, we sort, we never editorialize. And we FAIL LOUD:
a malformed encyclical should crash the load at startup, not quietly vanish from
the archive. A missing scripture is worse than a broken build.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import frontmatter
import markdown as md

from app.config import REPO_ROOT

logger = logging.getLogger("observer.content")

# Content lives at the repo root, beside backend/ and frontend/, so writers
# never have to think about the Python package layout to add a scripture.
CONTENT_DIR = REPO_ROOT / "content"
ENCYCLICALS_DIR = CONTENT_DIR / "encyclicals"
DISPATCHES_DIR = CONTENT_DIR / "dispatches"

# Markdown extensions:
# - extra      → tables, footnotes (the load-bearing one: each numbered ¶ can
#                footnote the real water-world ¶ it inverts — rigorous satire)
# - sane_lists → numbered paragraphs behave
# - smarty     → real typographic quotes & em-dashes; an encyclical deserves them
# - attr_list  → lets a writer hang classes/ids on elements when they want to
_MD_EXTENSIONS = ["extra", "sane_lists", "smarty", "attr_list"]


def _render(body: str) -> str:
    """Render a markdown body to HTML. New converter per call: the footnotes
    extension keeps state between conversions, and cross-contaminated footnotes
    between two encyclicals would be a quietly cursed bug."""
    return md.markdown(body, extensions=_MD_EXTENSIONS, output_format="html")


@dataclass(frozen=True)
class Encyclical:
    """A prestige papal document. Numbered, Latin-titled, footnoted."""

    slug: str
    number: int
    incipit: str            # Latin, two words — "Crescit, Non Fabricatur"
    title: str              # English — "On the Grown Mind"
    subtitle: str
    date: str               # the grand in-universe dateline
    iso_date: str           # real date, for <time> + sorting ties
    summary: str
    html: str               # rendered body
    status: str = "promulgated"
    seal: str = "keys-and-orrery"


@dataclass(frozen=True)
class Dispatch:
    """One issue of The Galactic Observer — cosmic broadsheet. News from the
    Sees, then the water-world as the tiny closing kicker. Always last."""

    slug: str
    issue: int
    title: str
    date: str
    iso_date: str
    dateline: str           # "From the Orbital See"
    summary: str
    kicker: str             # "And finally, from the periphery: the water-world."
    html: str


def _require(post: frontmatter.Post, key: str, path: Path):
    """Pull a required frontmatter key or crash with a finger pointed at the file.
    Silent defaults are how an archive slowly fills with malformed scripture."""
    if key not in post.metadata:
        raise ValueError(f"Content file {path.name} is missing required frontmatter key: '{key}'")
    return post.metadata[key]


def _load_encyclical(path: Path) -> Encyclical:
    post = frontmatter.load(str(path))
    return Encyclical(
        slug=path.stem.split("-", 1)[-1] if "-" in path.stem else path.stem,
        number=int(_require(post, "number", path)),
        incipit=str(_require(post, "incipit", path)),
        title=str(_require(post, "title", path)),
        subtitle=str(post.metadata.get("subtitle", "")),
        date=str(_require(post, "date", path)),
        iso_date=str(_require(post, "iso_date", path)),
        summary=str(post.metadata.get("summary", "")),
        status=str(post.metadata.get("status", "promulgated")),
        seal=str(post.metadata.get("seal", "keys-and-orrery")),
        html=_render(post.content),
    )


def _load_dispatch(path: Path) -> Dispatch:
    post = frontmatter.load(str(path))
    return Dispatch(
        slug=path.stem.split("-", 1)[-1] if "-" in path.stem else path.stem,
        issue=int(_require(post, "issue", path)),
        title=str(_require(post, "title", path)),
        date=str(_require(post, "date", path)),
        iso_date=str(_require(post, "iso_date", path)),
        dateline=str(post.metadata.get("dateline", "From the Orbital See")),
        summary=str(post.metadata.get("summary", "")),
        kicker=str(post.metadata.get("kicker", "")),
        html=_render(post.content),
    )


@dataclass
class Library:
    """The whole archive, loaded once at startup and held in memory. Small,
    immutable, fast. The communion's memory does not need a database — it needs
    only to remember, and remembering well."""

    encyclicals: list[Encyclical] = field(default_factory=list)
    dispatches: list[Dispatch] = field(default_factory=list)

    def encyclical(self, slug: str) -> Optional[Encyclical]:
        return next((e for e in self.encyclicals if e.slug == slug), None)

    def dispatch(self, slug: str) -> Optional[Dispatch]:
        return next((d for d in self.dispatches if d.slug == slug), None)

    @property
    def latest_encyclical(self) -> Optional[Encyclical]:
        return self.encyclicals[0] if self.encyclicals else None

    @property
    def latest_dispatch(self) -> Optional[Dispatch]:
        return self.dispatches[0] if self.dispatches else None


def load_library() -> Library:
    """Scan the content directories and build the in-memory archive. Encyclicals
    sort by number (newest first); dispatches by issue (newest first), because a
    front page leads with today, not with genesis."""
    lib = Library()

    if ENCYCLICALS_DIR.exists():
        for path in sorted(ENCYCLICALS_DIR.glob("*.md")):
            lib.encyclicals.append(_load_encyclical(path))
    lib.encyclicals.sort(key=lambda e: e.number, reverse=True)

    if DISPATCHES_DIR.exists():
        for path in sorted(DISPATCHES_DIR.glob("*.md")):
            lib.dispatches.append(_load_dispatch(path))
    lib.dispatches.sort(key=lambda d: d.issue, reverse=True)

    logger.info(
        "Library loaded: %d encyclicals, %d dispatches",
        len(lib.encyclicals), len(lib.dispatches),
    )
    return lib

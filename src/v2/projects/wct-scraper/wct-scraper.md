---
layout: base.njk
permalink: /projects/wct-scraper/
title: WCT Scraper
description:
  WCT Scraper is a Re:Zero web novel downloader that scrapes translated chapters
  from multiple translation communities and compiles them into reading-ready EPUB
  volumes. It aggregates chapters across four independent sources, maps web novel
  chapters to official light novel volume boundaries using data pulled from
  rezerodb.com, and injects covers, ISBNs, and Calibre-series metadata into every
  compiled volume.
category: Python &bull; Web Scraping & EPUB
date: 2026-06-29
tags: project
---

# WCT Scraper

## How it works

WCT Scraper is a multi-stage pipeline: it discovers chapters by parsing each
translation site's table of contents, downloads every chapter into a normalized
EPUB, groups chapters into official light novel volumes using the community
maintained `rzWebNovelChapters` mapping, and finally merges the per-chapter EPUBs
into volume EPUBs polished with covers and ISBNs.

```
translation sources ──► chapter discovery ──► chapter EPUBs
                        (BeautifulSoup TOC)       │
                                                 ▼
rezerodb.com ──► volume mapping ──► volume EPUB compiler ──► downloads/volumes/
(Selenium headless   (cached JSON)    (covers + ISBNs + TOC)
 extracts Pinia store)
```

Everything runs through an interactive ANSI-color CLI menu, with an optional
Textual-based TUI enabled via the `--gui` flag.

## Multi-source chapter aggregation

Each translation community has its own page structure, so the scraper models
them behind a common interface. A source registry maps a chapter URL to the
correct adapter at runtime:

| Source | Adapter | Notes |
|--------|---------|-------|
| Witch Cult Translations | `wct_source.py` | Primary Re:Zero translation site |
| Translation Chicken | `chicken_source.py` | Alternate translation |
| Eminent Translations | `eminent_source.py` | Alternate translation |
| remonwater | `remonwater_source.py` | archiving community |

`parse_wct_toc` walks the TOC HTML by sibling traversal, collecting chapter,
prologue, interlude, and intermission links for every Arc 5 or later, then
de-duplicates across repeated headings:

```python
for h1 in h1s:
    text = h1.get_text()
    match = re.search(r'Arc\s+(\d+)', text, re.IGNORECASE)
    if match:
        arc_num = int(match.group(1))
        if arc_num < 5:
            continue

        chapters = []
        curr = h1.next_sibling
        while curr:
            if curr.name == "h1" and re.search(r'Arc\s+(\d+)',
                                               curr.get_text(), re.IGNORECASE):
                break
            if curr.name:
                for a in curr.find_all("a"):
                    href = a.get("href")
                    # Allow if it's WCT or handled by an external registered source
                    if not domain or "witchculttranslation.com" in domain \
                            or get_source_for_url(href) is not None:
                        if any(x in a_text.lower() for x in [
                            "chapter", "prologue", "interlude",
                            "intermission", "epilogue", "curtain"]):
                            chapters.append({"title": a_text, "url": full_url})
```

Re:Zero IF sidebar stories are discovered separately and sibling-deduplicated
into their own `IF Stories` group.

## Volume mapping via rezerodb.com

Official light novel volumes do not align one-to-one with web novel chapters.
To determine which chapters belong in each volume the scraper loads
`rezerodb.com` in headless Chrome (Selenium) and extracts the Pinia store state
from the page, which carries the official `rzWebNovelChapters` mapping. The
mapping is cached to `data/volume_mapping.json` so recompilation does not
re-hit the site. A fallback distributes chapters evenly across volumes when the
mapping is unavailable.

## Compiling volume EPUBs

The volume builder merges individual chapter EPUBs into a single volume. Chapter
ordering uses a natural sort key so `Volume 2` sorts before `Volume 10`, with
chapter-type prefixes (prologue, interlude, epilogue) given priority:

```python
def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', s)]

def get_prefix_priority(filename):
    fl = filename.lower().strip()
    if fl.startswith('prologue'):
        return 0
```

During compilation the builder:

- injects the official volume cover artwork as the EPUB cover,
- writes ISBN identifiers and Calibre `series` / `series_index` metadata,
- rebuilds the OPF/NXC table of contents for reader navigation,
- prefixes image filenames to avoid collisions between chapters,
- embeds a styled index page (`INDEX_PAGE_CSS`) listing every chapter.

A companion `metadata_fixer.py` utility can update EPUB metadata and covers on
already-built volumes without forcing a full recompilation, while
`wiki_metadata.py` sources volume metadata from the Re:Zero wiki.

## Terminal interfaces

The CLI presents a flicker-free ANSI progress table (download chapter / arc /
main story / IF stories, group volumes, refresh mappings), and the `--gui`
flag launches a full Textual TUI for interactive browsing of sources,
downloads, and the volume queue.

## Technical Competencies Demonstrated

- **Distributed scraping & aggregation** — four independent sources behind a
  pluggable adapter registry with runtime URL-based dispatch.
- **Headless browser automation** — Selenium + WebDriver for extracting
  client-side (Pinia) state that static HTML can't expose.
- **EPUB engineering** — Open Packaging Format (OPF), NCX navigation,
  cover/ISBN injection, image collision handling, Calibre metadata.
- **Progressive enhancement** — ANSI-color CLI and a full Textual TUI on the
  same codebase.
- **Caching & offline workflows** — disk-persisted volume mappings and metadata
  tiered against network availability.
---
layout: base.njk
permalink: /projects/wct-scraper/
title: WCT Scraper
description: WCT Scraper is a Re:Zero web novel downloader that scrapes translated chapters
  from multiple translation communities and compiles them into reading-ready EPUB
  volumes. It aggregates chapters across four independent sources, maps web novel
  chapters to official light novel volume boundaries using data pulled from
  rezerodb.com, and injects covers, ISBNs, and Calibre-series metadata into every
  compiled volume.
category: Python • Web Scraping & EPUB
date: 2026-06-29
tags: project
---

# WCT Scraper

WCT Scraper is a Re:Zero web novel downloader that scrapes translated chapters
from four independent translation communities, groups them into official light
novel volumes, and compiles them into polished, reading-ready EPUB files.

---

## Executive Summary & Problem Statement

Web novels are serialized chapter-by-chapter across fan translation sites, each
with different markup, chapter naming conventions, and site structures. Reading
them on a phone or e-reader means dozens of separate browser tabs, and the final
content never resembles the physical light novels. This project solves three
concrete problems:

1. **Aggregation** — four translation communities publish the same story with
   different structures; the scraper normalizes them behind one API.
2. **Volume alignment** — web novel chapters do not map one-to-one to official
   light novel volumes. Getting that boundary right required pulling the
   community-maintained mapping from rezerodb.com rather than guessing.
3. **Reader readiness** — a raw chapter scrape is not a book. Compiling proper
   EPUBs means covers, ISBNs, navigable tables of contents, and Calibre-series
   metadata.

The result is a complete, offline reading library built entirely from public
web content — a single pipeline from raw HTML to a finished ebook collection.

---

## Architecture Overview

The pipeline is a linear, multi-stage system with a source abstraction layer at
the front and a packaging engine at the back:

```
translation sources ──► chapter discovery ──► chapter EPUB download
 (4 community sites)    (TOC HTML parsing)    (normalized single-chapter EPUBs)
                              │
                              ▼
rezerodb.com ──► volume mapping ──► volume EPUB compiler ──► downloads/volumes/
(Selenium headless  (cached JSON)   (covers + ISBNs +        (finished library)
 extracts Pinia      + fallback)     TOC + index pages)
 store state)
```

| Component       | Module(s)                               | Responsibility                                              |
| --------------- | --------------------------------------- | ----------------------------------------------------------- |
| CLI + menus     | `main.py`, `menus/`                     | Interactive command entry, download workflow selection      |
| Orchestration   | `scraper.py`                            | TOC parsing, chapter downloading, dedup, download migration |
| Volume compiler | `volume_builder.py`                     | Mapping fetch, EPUB merge, cover/ISBN/TOC injection         |
| Source adapters | `sources/`                              | Per-site HTML normalization behind `base_source.py`         |
| Terminal UIs    | `ui.py`, `tui.py`                       | ANSI-color CLI and Textual TUI                              |
| Metadata tools  | `metadata_fixer.py`, `wiki_metadata.py` | Post-build metadata/cover repair                            |

---

## Source Adapter Architecture

Each translation community renders the same story differently. Rather than
branching on site names throughout the scraper, every source implements a common
interface defined in `base_source.py`, and a registry dispatches on the URL at
runtime:

| Source                  | Adapter                | Profile                          |
| ----------------------- | ---------------------- | -------------------------------- |
| Witch Cult Translations | `wct_source.py`        | Primary Re:Zero translation site |
| Translation Chicken     | `chicken_source.py`    | Alternate translation            |
| Eminent Translations    | `eminent_source.py`    | Alternate translation            |
| remonwater              | `remonwater_source.py` | Archiving community              |

The registry is the extension point: adding a fifth source means implementing
the base adapter and registering it — the rest of the pipeline is source-agnostic.

---

## Chapter Discovery (TOC Parsing)

`parse_wct_toc` walks a translation site's table of contents via DOM sibling
traversal instead of fragile CSS selectors. It scans the document for every `Arc
N` heading, collects the chapter links under each heading, and defensively
continues past unrelated headings:

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

Design points worth calling out:

- **Relative URL resolution** — hrefs beginning with `/` are expanded against
  the canonical site root, so the chapter list is directly navigable.
- **Type filtering** — only chapter-like links (prologue, interlude, intermission,
  epilogue, curtain) are collected; navigation links are never mistaken for
  content.
- **Arc gating** — arcs below 5 are skipped because the WCT site only carries
  arcs 5 and later.
- **De-duplication** — repeated headings and sidebar re-links would double
  chapters; a URL-set sweep removes duplicates from every arc (including the
  Re:Zero IF sidebar stories, which are discovered separately and merged into an
  `IF Stories` group).

---

## Volume Mapping via rezerodb.com

The hardest engineering problem in the project is volume alignment. Official
light novel volume boundaries were defined by the publisher after the web novel
had been serialized, so chapter numbers diverge between the two formats. This
is one of the few sources of truth for that mapping.

The loader drives a headless Chrome session (Selenium) to rezerodb.com and
extracts the **Pinia store state** embedded in the page — a client-side Vue
application state object that static HTML scraping cannot reach. It then:

1. pulls the official `rzWebNovelChapters` mapping,
2. persists it to `data/volume_mapping.json` so rebuilds never re-hit the site,
3. falls back to an even-distribution heuristic when the live mapping is
   unavailable, so the pipeline never blocks on a source outage.

```
rezerodb.com ──► Selenium headless ──► Pinia store state ──► volume_mapping.json
                                                                    │
                                                              offline rebuilds
```

---

## EPUB Compilation Pipeline

The volume builder is the packaging engine. It does not re-download chapters on
every run; it recomposes already-downloaded single-chapter EPUBs into volume
books, which makes rebuilds fast and deterministic.

### Chapter ordering

Chapter types have an intrinsic order (prologue first, epilogue last) on top of
natural numeric sort, so `Volume 2` sorts before `Volume 10` and interludes
slot into the right place:

```python
def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', s)]

def get_prefix_priority(filename):
    fl = filename.lower().strip()
    if fl.startswith('prologue'):
        return 0
```

### What gets injected into every volume

| Element                 | How it's produced                                |
| ----------------------- | ------------------------------------------------ |
| Cover artwork           | Official volume cover embedded as the EPUB cover |
| ISBN identifiers        | Written into the OPF package metadata            |
| Calibre series metadata | `series` + `series_index` for library sorting    |
| Table of contents       | OPF manifest + NCX navigation rebuilt per volume |
| Index page              | Embedded styled HTML listing every chapter       |
| Image dedup             | Colliding chapter image filenames are prefixed   |

The index page styling ships as module-level CSS injected at build time
(`INDEX_PAGE_CSS`), keeping the presentation self-contained in the EPUB:

```python
INDEX_PAGE_CSS = """
.index-page { margin: 2em 0; }
.index-page h2 { text-align: center; font-size: 1.4em; margin-bottom: 1.5em; }
.index-page ol { list-style: none; padding: 0; }
.index-page li { margin: 0.8em 0; border-bottom: 1px solid #eee; }
"""
```

### Post-build repair tools

- **`metadata_fixer.py`** — updates EPUB metadata and covers on already-built
  volumes without forcing a full recompilation. Correcting a typo or swapping a
  cover becomes a targeted patch instead of a rebuild-from-scratch.
- **`wiki_metadata.py`** — sources volume metadata (covers, ISBNs, series info)
  from the Re:Zero wiki when the mapping store lacks it.

---

## Download Management & Migration

The CLI exposes three download workflows (chapter / arc / main story / IF
stories), and a refresh menu re-scans sources on demand. Legacy layouts from
earlier scraper versions are auto-migrated into the canonical `downloads/`
tree, so the pipeline stays compatible with existing local caches instead of
requiring a clean reset.

---

## Terminal Interfaces

The tool ships two UIs over one engine:

1. **ANSI-color CLI** — flicker-free progress tables, interactive menus,
   cancelable downloads. Zero extra runtime cost; works over any terminal.
2. **Textual TUI** (`--gui`) — a full-screen interactive interface for browsing
   sources, downloads, and the volume queue, built on Textual.

Both are thin presentation layers; all state and logic lives in the modular
engine, so future UIs (e.g. a web dashboard) can reuse it unchanged.

---

## Design Decisions & Tradeoffs

- **Selenium for just one step** — the rezerodb extraction is the only
  browser-automated part; everything else uses lightweight HTTP + BeautifulSoup.
  Trading a heavy dependency for the one place it's genuinely required.
- **HTTP scraping over site APIs** — Fan translation sites have no public APIs;
  the adapter layer confines the hacks to one place.
- **Cached mappings over live fetches** — volume mappings are persisted locally,
  making rebuilds offline-capable and immune to rezerodb downtime.
- **Per-chapter EPUBs as an intermediate format** — decouples download from
  packaging: recompile volumes without re-downloading content.
- **Keys over selectors** — sibling-traversal and text-pattern matching instead
  of brittle CSS paths, so minor site re-layouts don't break discovery.

---

## Engineering Discipline

- **Modular design** — the largest Python project in the portfolio: 67 source
  files, ~12,800 lines, separated by concern (sources, menus, UI, metadata,
  packaging).
- **Test coverage** — `tests/test_scraper.py` exercises the parsing and
  compilation paths with `unittest`.
- **Error resilience** — every stage degrades gracefully (fallback volume
  mapping, warning-suppressed markup, dedup guards) rather than aborting the
  pipeline.
- **Migration support** — internal format changes are accompanied by automatic
  migration utilities, keeping existing user caches valid.

> Source availability: the repository is currently private; complete source is
> available on request.

---

## Technical Competencies Demonstrated

- **Distributed scraping & aggregation** — four independent sources behind a
  pluggable adapter registry with runtime URL-based dispatch.
- **Headless browser automation** — Selenium + WebDriver for extracting
  client-side (Pinia) state that static HTML cannot expose.
- **EPUB engineering** — OPF packaging, NCX navigation, cover/ISBN metadata
  injection, image-collision handling, Calibre series tagging.
- **Data caching & offline workflows** — disk-persisted mappings and metadata
  tiered against network availability.
- **Dual-interface design** — one engine, two presentation layers (ANSI CLI and
  Textual TUI), future-friendly for more.
- **Test-driven parsing** — core HTML parsing and compilation covered by a
  unittest suite.

---
layout: base.njk
permalink: /projects/maltracker/
title: MALTracker
description: MALTracker is a personal automation tool that reads your browser history,
  detects anime streaming URLs, extracts which show and episode you just watched,
  and automatically updates your MyAnimeList profile through the official MAL API.
  It supports multiple browsers and streaming sites via regex configuration, uses
  OAuth2 with PKCE for authentication, and offers a dry-run mode so you can verify
  changes before they touch your list.
category: Python • Automation & APIs
date: 2022-08-16
tags: project
---

# MALTracker

MALTracker is a personal automation tool that reads your browser history,
detects which anime and episode you just watched, and updates your MyAnimeList
profile through the official API — automatically.

---

## Executive Summary & Problem Statement

Manually updating a MyAnimeList profile after every episode is tedious busywork,
especially over a multi-day binge across several streaming sites. MALTracker
eliminates the manual step entirely: it watches the browser's own history
database, recognizes anime streaming URLs, resolves the show against the MAL
catalog, and advances the episode counter — computing a `watching` or
`completed` status from the series' episode total.

Three engineering constraints shaped the design:

1. **No browser automation** — history is read directly from each browser's
   SQLite database, so the tool is a single fast pass instead of a Selenium
   session.
2. **No secret handling fragility** — authentication uses OAuth2 with PKCE on
   the official MAL API (no username/password, no scraping).
3. **Config over code** — new streaming sites are a config change, not a
   release: named regex groups carry the parsing logic.

---

## Architecture Overview

A compact, linear pipeline with a human-in-the-loop for ambiguity:

```
browser history (SQLite) ──► anime_parser regex ──► title + episode + site
                                    │
                                MAL search API
                                    │
                        interactive picker (ambiguous titles)
                                    │
                 status computation (watching / completed)
                                    │
                        dry-run guard ──► live update
```

| Module               | Responsibility                                          |
| -------------------- | ------------------------------------------------------- |
| `browser_history.py` | Enumerate + read SQLite history from 5 browsers         |
| `anime_parser.py`    | Regex-match streaming URLs → title slug + episode       |
| `mal_api.py`         | OAuth2 PKCE client, token cache, search, status updates |
| `main.py`            | CLI, config management, interactive matching            |

---

## Reading Browser History

Every major Chromium browser stores history in a SQLite database that can be
queried directly. `browser_history.py` opens each browser's database across
well-known profile locations:

| Browser     | Supported    |
| ----------- | ------------ |
| Brave       | ✅ (default) |
| Chrome      | ✅           |
| Chrome Beta | ✅           |
| Edge        | ✅           |
| Firefox     | ✅           |

The CLI auto-detects the active browser or forces one explicitly:

```bash
python main.py                # Auto-detect browser, scan, update MAL
python main.py --browser brave
python main.py --limit 20     # Scan last 20 history entries
python main.py --dry-run      # Preview without updating MAL
python main.py --setup        # Re-run OAuth setup
```

---

## Configurable Streaming-Site Parsing

Streaming sites have per-site URL shapes. Instead of hardcoding survival-prone
selectors or site-specialized parsers, `anime_parser.py` compiles named regular
expressions supplied by `config.json`:

```json
{
  "streaming_sites": {
    "animepahe": "https://animepahe.ru/anime/{slug}/{episode}",
    "anikototv": "https://www.anikototv.to/episode/{slug}-episode-{episode}"
  }
}
```

Each pattern carries the contract: a `slug` group (the anime's URL identifier)
and an optional `episode` group. The parser:

1. Tests each configured pattern against visited URLs.
2. Extracts `slug` (film identifier) and `episode` where present.
3. Falls back to per-series progress tracking when the URL lacks the episode.

Adding a site = one regex in config. No code changes, no redeploy.

---

## OAuth2 with PKCE Authentication

The MAL API requires OAuth2 Authorization Code flow. MALTracker implements it
without any third-party OAuth library:

- **PKCE pair generation** — `secrets.token_urlsafe` produces the verifier; MAL
  supports the `plain` challenge method, so the verifier doubles as the
  challenge (no S256 hashing pass):

```python
def _generate_pkce_pair() -> tuple[str, str]:
    """Generate a (code_verifier, code_challenge) pair for PKCE."""
    code_verifier = secrets.token_urlsafe(96)[:128]
    # MAL supports 'plain' challenge method — use verifier as challenge
    code_challenge = code_verifier
    return code_verifier, code_challenge
```

- **Local redirect capture** — a stdlib `http.server` handler on port `8765`
  catches the OAuth redirect, ignoring `favicon.ico` noise so the flow doesn't
  fail on cosmetic requests.
- **Token persistence** — tokens are stored in `.mal_token.json` (gitignored)
  and **auto-refreshed** on expiry, so the tool stays logged in across runs.

The whole auth stack is `requests` + Python stdlib — no `selenium`, no
`authlib`, no README-heavy integration packages.

---

## Interactive Matching & Status Computation

Not every slug resolves cleanly. MAL search can return multiple candidate
series (shared titles, renames, movies vs. TV). The tool prompts interactively
and lets you pick the correct entry:

```python
def pick_anime_match(anime_name: str, search_results: list[dict]) -> dict | None:
```

Status computation uses MAL's own data:

- **Episode total known** — if the tracked episode reaches the series total,
  the list entry flips to `completed`; otherwise it stays `watching`.
- **Idempotency** — the highest tracked episode per anime is kept, so re-running
  the scanner can never regress progress.
- **Dry-run preview** — `--dry-run` prints exactly what would change without
  writing, giving a safety net for first-time setup and new-site parsing.

---

## Design Decisions & Tradeoffs

- **SQLite forensics over browser extensions** — extensions need per-browser
  installation and permissions; reading the history DB directly is portable and
  install-free.
- **OAuth2 over scraping** — official API access is rate-friendly and safe from
  page-structure breakage; the cost is a one-time interactive login.
- **Config-driven regexes over site modules** — guarantees new-site support
  without touching parsing code, at the cost of trusting named-group
  conventions.
- **Zero runtime deps** — `requests` only; everything else (http.server,
  sqlite3, hashlib, base64, secrets) is standard library, which keeps setup to
  `uv sync` or `pip install -r requirements.txt`.
- **Stay-current state representation** — "highest episode wins" is a simple,
  deterministic merge rule that also happens to be idempotent across runs.

---

## Engineering Discipline

- **Human-in-the-loop where it matters** — auto-update everywhere except
  ambiguous title resolution, which deliberately pauses for user confirmation.
- **Safety rails** — dry-run mode, evented token refresh, and first-class
  Windows console UTF-8 handling for emoji output.
- **Configuration hygiene** — a `.gitignore`d token file keeps credentials out
  of version control; `config.json` merges defaults so missing keys degrade to
  sensible values instead of crashing.

> Source availability: the repository is currently private; complete source is
> available on request.

---

## Technical Competencies Demonstrated

- **OAuth2 + PKCE from scratch** — Authorization Code flow, localhost redirect
  capture, token caching, and silent refresh via the standard library.
- **Cross-browser history forensics** — direct SQLite querying across five
  commercial browsers with auto-detection.
- **Config-driven parsers** — named regex groups turning new site support into a
  config edit rather than a code change.
- **Idempotent state updates** — max-episode tracking with status computation
  that cannot regress existing progress.
- **Minimal-dependency engineering** — a full OAuth/API/parsing pipeline on
  `requests` plus Python stdlib.

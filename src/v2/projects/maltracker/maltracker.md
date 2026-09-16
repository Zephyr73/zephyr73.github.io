---
layout: base.njk
permalink: /projects/maltracker/
title: MALTracker
description:
  MALTracker is a personal automation tool that reads your browser history,
  detects anime streaming URLs, extracts which show and episode you just watched,
  and automatically updates your MyAnimeList profile through the official MAL API.
  It supports multiple browsers and streaming sites via regex configuration, uses
  OAuth2 with PKCE for authentication, and offers a dry-run mode so you can verify
  changes before they touch your list.
category: Python &bull; Automation & APIs
date: 2022-08-16
tags: project
---

# MALTracker

## How it works

MALTracker is a small end-to-end pipeline with no Selenium and a single external
dependency (`requests`). It reads your browser's SQLite history, matches URLs
against configurable streaming-site regexes, resolves the anime title against
the MAL API (with an interactive picker for ambiguity), and writes the episode
count and watching/completed status back to your account.

```
browser history (SQLite) ──► anime_parser regex ──► title + episode + site
                                                        │
                                                    MAL search + picker
                                                        │
                                              MAL status update (watching/completed)
                                                        │
                                                dry-run guard ──► live update
```

## Reading browser history

`browser_history.py` opens each browser's SQLite history database directly and
returns recent URL visits. Brave, Chrome, Chrome Beta, Edge, and Firefox are
supported, with auto-detection or an explicit `--browser` flag.

```bash
python main.py                # Auto-detect browser, scan, update MAL
python main.py --browser brave
python main.py --limit 20     # Scan last 20 history entries
python main.py --dry-run      # Preview without updating MAL
```

## Configurable streaming-site parsing

Instead of hardcoding sites, `anime_parser.py` runs named regular-expression
groups against each URL. Every site pattern must yield a `slug` (the anime's URL
identifier) and may yield an `episode` group; so new streaming sites work with a
config change, not a code change:

```json
{
  "streaming_sites": {
    "animepahe": "https://animepahe.ru/anime/{slug}/{episode}",
    "anikototv": "https://www.anikototv.to/episode/{slug}-episode-{episode}"
  }
}
```

The episode number is derived from the URL where available, falling back to
per-show episode tracking computed from the MAL list.

## OAuth2 with PKCE

Authentication uses the MAL OAuth2 Authorization Code flow with PKCE. A tiny
local HTTP server on port `8765` captures the redirect; the verifier/challenge
pair is generated in-process, and tokens are persisted to `.mal_token.json` with
automatic refresh:

```python
def _generate_pkce_pair() -> tuple[str, str]:
    """Generate a (code_verifier, code_challenge) pair for PKCE."""
    code_verifier = secrets.token_urlsafe(96)[:128]
    # MAL supports 'plain' challenge method — use verifier as challenge
    code_challenge = code_verifier
    return code_verifier, code_challenge
```

MAL's support for the `plain` challenge method means the verifier doubles as the
challenge — no S256 hashing required.

## Interactive matching & status computation

When a slug maps to multiple MAL results, the CLI prompts interactively to pick
the correct series. The computed status uses episode totals from MAL itself: if
the tracked episode reaches the series total the entry flips to *completed*,
otherwise it is marked *watching*, and the highest tracked episode per anime is
kept so a re-scan cannot regress progress. `--dry-run` renders every intended
change without writing it.

## Technical Competencies Demonstrated

- **OAuth2 + PKCE** — Authorization Code flow, localhost redirect capture, token
  caching, and silent refresh via the standard library.
- **Cross-browser history forensics** — direct SQLite access across five
  commercial browsers with auto-detection.
- **Config-driven parsers** — named regex groups turning new site support into a
  config edit rather than a release.
- **Idempotent state updates** — max-episode tracking and status computation
  that cannot regress existing progress.
- **Zero-dependency design** — the whole flow on `requests` plus Python stdlib.
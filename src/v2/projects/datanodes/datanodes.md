---
layout: base.njk
permalink: /projects/datanodes/
title: DataNodes
description:
  DataNodes automates the click-through chain of datanodes.to download pages to
  extract the final direct download URL for use with IDM or JDownloader. Using
  Playwright with up to eight isolated browser contexts, it blocks ads and popups,
  drives the 5-second timer and button cascade, retries failures, and reports
  progress through a Rich terminal UI.
category: Python &bull; Web Scraping
date: 2026-07-04
tags: project
---

# DataNodes

## How it works

DataNodes reads a list of `datanodes.to` links, and for each one launches a
Playwright browser context that manually walks the page's download flow the way
a human would: wait for the visible timer, click the cascade of buttons, and
intercept the browser's download event — then extract the destination URL while
cancelling the actual transfer. A queue passes over all links, and a second
pass retries only the failures.

```
links.txt ──► 8 Playwright contexts (isolated cookies/sessions)
                 │  per link:
                 │   route-block ads/fonts/analytics
                 │   click "File Ready" → "Continue to Download"
                 │   → "Free Download" → wait 5s → "Start Download"
                 │   intercept download event → capture URL → cancel download
                 ▼
output.txt  (SUCCESS/FAILED per link, retry pass for failures)
```

## Architecture: parallel async workers

Eight browser contexts run concurrently with full session isolation, so cookies
from one scrape can't contaminate another. Each worker owns a dedicated page
and reports back through a shared UI tracker:

```python
async def process_link(context, link, page, worker_id, ui: ScraperUI, is_retry=False):
    w_start = time.time()
    # 1. Setup resource interceptor & adblocking
```

A complete queue pass followed by an automatic retry pass turns a large batch
into ~40-50s of work instead of minutes.

## Click-through cascade

The download buttons appear one at a time, each gating the next. The scraper
waits out the mandatory 5-second countdown before triggering the final click:

| Stage | Button | Condition |
|-------|--------|-----------|
| 1 | File Ready | Page reached, file exists |
| 2 | Continue to Download | File Ready clicked |
| 3 | Free Download | Countdown state |
| 4 | Start Download | After 5s wait |

The final click triggers a browser download event; the event is intercepted, the
direct file URL is parsed from its headers/URL, and the download is cancelled so
nothing actually lands on disk. Output is appended to `output.txt` for IDM or
jDownloader to consume.

## Hardening against ad and proxy noise

The pages are ad-heavy, so the scraper hardens itself at the network layer:

- **Route blocking** — images, fonts, media, and known ad/analytics domains are
  aborted via `context.route` interception (`doubleclick.net`,
  `googlesyndication`, `facebook.com/tr`, etc.).
- **Popup handling** — `window.open` is stubbed and stray popups auto-close.
- **Anti-bot resilience** — Cloudflare challenges and bad-gateway (502) pages
  trigger up to 3 retries with backoff, and "File not found" pages are detected
  and reported rather than hanging.

## Terminal reporting

A Rich `Progress` bar with a 40-width bar, live timestamps, and per-link
`SUCCESS`/`FAILED` lines keeps the run readable, and the summary screen reports
success rate and elapsed time. Failures are logged with their reason so a manual
retry is possible where automation bottoms out.

```python
self.progress = Progress(
    TextColumn("[bold blue]{task.description}"),
    BarColumn(bar_width=40),
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    TextColumn("• [green]{task.completed}/{task.total} completed"),
    TimeElapsedColumn(),
    console=self.console
)
```

## Technical Competencies Demonstrated

- **Async browser automation** — Playwright async API with concurrent isolation
  and per-context cookie separation.
- **Human-flow emulation** — reproducing multi-stage button cascades and timer
  waits rather than bypassing them.
- **Download-event interception** — capturing transfer targets and cancelling
  payloads to avoid disk writes.
- **Network hardening** — route-level ad blocking, popup stubs, and
  anti-bot/bad-gateway retry logic.
- **Resumable workflows** — automatic retry pass and per-link failure log that
  preserve forward progress.
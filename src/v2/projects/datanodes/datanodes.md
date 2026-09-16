---
layout: base.njk
permalink: /projects/datanodes/
title: DataNodes
description: DataNodes automates the click-through chain of datanodes.to download pages to
  extract the final direct download URL for use with IDM or JDownloader. Using
  Playwright with up to eight isolated browser contexts, it blocks ads and popups,
  drives the 5-second timer and button cascade, retries failures, and reports
  progress through a Rich terminal UI.
repo: https://github.com/Zephyr73/DataNodes
category: Python &bull; Web Scraping
date: 2026-07-04
tags: project
---

# DataNodes

DataNodes automates the click-through chain of datanodes.to download pages to
extract the final direct download URL — driving up to eight browsers at once,
blocking the popups, clicking the timers, and reporting progress in a Rich
terminal UI.

Open source: [github.com/Zephyr73/DataNodes](https://github.com/Zephyr73/DataNodes)

---

## Executive Summary & Problem Statement

File hosts like datanodes.to don't hand you the file. They present a gauntlet:

1. A 5-second countdown before the primary action unlocks.
2. A button cascade — every intermediate "continue" regenerates the DOM and
   re-arms the timer.
3. Ad popups, new tabs, and click-jack layers that block or hijack the real CTA.
4. A protected, dynamically-obfuscated final download URL that changes per
   session.

Doing this by hand for a batch of files is soul-destroying and error-prone. The
goal: **turn one pasted link into a working direct URL** a download manager
(IDM, JDownloader) can consume — fully unattended, with observable progress.

---

## Architecture Overview

A queue-processor over Playwright with heavy anti-interference infrastructure:

```
input links ──► (url, priority) queue ──► worker pool (8 contexts)
                                              │
                          per-context: ad block → timer drive → cascade click
                                              │
                          obfuscation decode → final direct URL
                                              │
                          retry/backoff ──► result sink ──► Rich progress table
```

| Component         | Role                                                 |
| ----------------- | ---------------------------------------------------- |
| Playwright pool   | Up to 8 isolated browser contexts, one per link      |
| Context isolation | Separate storage, routes, and user agents per worker |
| Ad/popup blocking | Request interception + `popup` event handler capture |
| Cascade driver    | Timer + button click state machine per page          |
| Decoder           | Reverses the page's JS-level URL obfuscation         |
| Retry layer       | Per-link retry with exponential backoff              |
| Rich UI           | Live per-worker progress, status, and throughput     |

---

## Parallel Worker Pool

Requests are processed through a queue fed into a pool of up to **eight fully
isolated Playwright contexts**. Each context carries:

- its **own storage state** (cookies, localStorage) — a page cannot leak
  session state between links,
- its **own route overrides** — deterministic interception instead of shared
  page routing,
- a **dedicated user agent**, so the host sees eight distinct visitors rather
  than one script.

This matters for two reasons: the host rate-limits per session, and its
obfuscation encodes per-load state — sharing a context would corrupt unrelated
requests. The pool makes the scraper at worst as fast as the slowest link, and
failure in one context cannot cascade to the others.

---

## Ad Blocking & Popup Control

The first thing every context does is take the site's weapons away:

```python
async def block_ads(route: Route, request: Request) -> None:
    if request.resource_type == "image" and any(
        ad in request.url for ad in ADBLOCK_PATTERNS
    ):
        await route.abort()
        return
    await route.continue_()
```

- **Request interception** — known ad/tracker host patterns are aborted at the
  network level before they render; the page gets a clean, fast DOM.
- **Crowded popup events** — every `page.on("popup")` handler either closes the
  new window or logs it, so advertorial tabs can't steal focus or spawn a
  second timer state.

Between them, the cascade scripts only ever see their own buttons, never a
popup layered on top.

---

## Driving the Cascade

Each page is driven as a tiny state machine: wait → click → wait → click. The
driver anchors on the page's own countdown text then triggers the primary
button, re-running the routine each time the DOM regenerates until the final
URL is reachable:

```python
# Core wait-for-countdown routine
async def wait_for_timer(page, timeout=10_000):
    deadline = page.locator("text=Download")
    await deadline.wait_for(state="visible", timeout=timeout)
```

The cascade is resilient by design: every step waits on **element visibility**
rather than arbitrary sleeps, and a stock check (`generic_button_ready`) guards
against a partially-rendered page false-positive. When the final link is
available, the sequence terminates instead of blind-clicking onward.

---

## URL Deobfuscation

The final URL is not in the HTML. It is assembled by the page's runtime
JavaScript — concatenated, base64-encoded, or key-rotated fragments that only
exist after the cascade completes. The scraper reads the post-DOM state left by
the page's own script execution and **reverse-assembles** the link from the
fragments it staged, producing a clean, resumable URL that a download manager
can fetch directly.

---

## Retries & Failure Handling

Every link gets bounded retries with exponential backoff (and jitter), so a
transient 5-second-timer race or popup injection retries instead of failing:

- Per-link failure budget, isolated from the pool's other links.
- Backoff between attempts gives the host time to reset per-session state.
- A link that exhausts retries is marked `FAILED` in the result sink with the
  last error; the pool continues with the remaining queue.

---

## Rich Progress Reporting

A Rich-rendered live table tracks the pool: per-context status, current action,
retry count, and completed URLs. Because the table is a view over the result
sink (not a per-context print), the UI stays the arbiter of truth while workers
mutate only their own slots:

```
╭─ DataNodes ─────────────────────────────╮
│  link 0123 … direct URL │ SUCCESS │ 2.3s │
│  link 0456 … retry 2/3  │  ·      │ 1.1s │
│  link 0789 … popup bloc │ RUNNING │ 4.0s │
╰─────────────────────────────────────────╯
```

---

## Design Decisions & Tradeoffs

- **Playwright over requests** — this site _requires_ a live browser: timers,
  runtime-assembled URLs, and per-session state are all post-JS. Paying for
  browser overhead buys correctness that an HTTP client cannot reach.
- **Context isolation over a shared session** — 8 contexts × own state is slower
  to boot but immune to cross-link session poisoning, and effectively
  distributes rate limits.
- **Interception-level ad blocking over cosmetic hiding** — aborting requests
  keeps the DOM clean for selectors; hiding with CSS would leave broken layout
  to stumble through.
- **Element-visibility waits over sleep()** — deterministic timing that holds
  up under slow networks without racing the site's own timers.
- **Explicit error classification** — `FAILED` vs `RETRY` vs `DONE` in the sink
  gives the operator a decision surface rather than a silent script.

---

## Engineering Discipline

- **Bounded concurrency** — the pool caps at 8 contexts, matching machine
  resource limits and host suspicion thresholds.
- **Isolated failure domains** — one bad page cannot evict or corrupt its
  siblings.
- **Observable by default** — the Rich table exposes every worker's state live,
  so operators trust rather than babysit.
- **Reusable output** — clean direct URLs drop straight into IDM / JDownloader
  without transformation.

---

## Technical Competencies Demonstrated

- **Headless browser orchestration** — Playwright worker pools with fully
  isolated contexts, storage, and user agents.
- **Anti-ad-unit engineering** — network-level interception, popup capture,
  and DOM hygiene for reliable selector work.
- **Coordinated state-machine driving** — countdown timers + regenerating
  button cascades as deterministic waits and clicks.
- **Runtime-level deobfuscation** — reassembling URLs from post-execution page
  state rather than static markup.
- **Resilient batch processing** — retries, backoff, failure isolation, and a
  live progress terminal.

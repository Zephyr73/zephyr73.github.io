---
layout: base.njk
permalink: /projects/game-scraper/
title: Game Scraper
description: Game Scraper monitors the r/FreeGamesOnSteam and r/FreeGameFindings subreddits
  for free game key giveaways, extracts Steam, Epic, GOG, Ubisoft, and EA keys from
  comments, and delivers them straight to your phone via Telegram. When a key is
  obfuscated with placeholder symbols, an LLM is asked to solve the accompanying
  hint and complete the key automatically.
category: Python &bull; Automation & AI
date: 2025-11-04
tags: project
---

# Game Scraper

Game Scraper monitors Reddit communities where free game keys are shared in
comments, extracts them across five storefront formats, uses an LLM to crack
obfuscated hints, and pushes finished keys to your phone via Telegram.

---

## Executive Summary & Problem Statement

Free-game giveaways land in Reddit comments — usually **hugely popular**, so by
the time you see them, the keys are gone. Worse, many communities encode keys
with placeholder symbols (`??`) and require solving a trivia hint to complete
them, which is exactly the kind of small reasoning task humans are slow at.

This project automates the entire race:

1. **Stream first** — tail the subreddit's live comment feed rather than
   polling, so a key is caught within seconds of being posted.
2. **Parse every format** — Steam, Epic, GOG, Ubisoft, and EA keys have
   different layouts; each needs its own recognition path.
3. **Solve the hint with an LLM** — when a key contains placeholder symbols, a
   constrained Gemini call turns the hint into the missing characters.
4. **Deliver instantly** — completed keys are sent to Telegram as one-tap
   register links, so any device in your pocket can redeem them.

---

## Architecture Overview

A straight-line event pipeline with a single LLM call in the middle:

```
Reddit (PRAW stream) ──► comment ──► post-title married to key
                                     │
                        key format detection (Steam / Epic / GOG / Uplay / EA)
                                     │
                        placeholders? ──► Gemini 2.0 Flash solves hint
                                     │
                        Telegram sendMessage ──► steam://registerkey link
```

| Component               | Role                                          |
| ----------------------- | --------------------------------------------- |
| `reddit_script.py`      | `r/FreeGamesOnSteam` stream + Steam key focus |
| `free_game_findings.py` | `r/FreeGameFindings` multi-platform patterns  |
| `main.py`               | Workflow menu, mode selection                 |
| `.env`                  | Reddit, Gemini, and Telegram credentials      |

---

## Reddit Comment Streaming

PRAW's `subreddit.stream.comments(skip_existing=True)` yields a live feed of new
comments. Every comment is bound to its parent submission, so the giveaway
context (title, link-flair, thread topic) travels with the key:

```python
reddit = praw.Reddit(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET"),
    user_agent=os.getenv("USER_AGENT")
)
subreddit = reddit.subreddit("FreeGamesOnSteam")

for comment in subreddit.stream.comments(skip_existing=True):
    post = comment.submission
    if "+1" in (post.link_flair_text or "").lower() and comment.id not in seen_comments:
        process_comment(post.title, comment.body)
```

Two details prevent wasted work:

- **Flair filtering** — free-key posts are flagged with a `+1` link flair in
  that community; skipping the rest prunes paid-promo and discussion threads.
- **Deduplication** — an in-memory `seen_comments` set prevents re-processing
  when the stream rewinds or restarts.

Two run modes are supported: a **one-shot scan** of recent posts (useful for a
catch-up run) and **live mode** (long-running, intended to stay resident and
push instantly).

---

## Multi-Format Key Detection

Keys come in five storefront layouts, each with different group counts and
character widths. The Steam matcher anchors the canonical 5-5-5 triple-group
layout while tolerating the obfuscation character set communities use (`?`, `*`,
`%`, `!`, `@`, `#`, `$`, `&`, `.`, `,`, `-`, `_`):

```python
key_pattern = re.compile(
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}-'
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}-'
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}',
    re.IGNORECASE
)
```

| Storefront      | Format                                 |
| --------------- | -------------------------------------- |
| Steam           | `XXXXX-XXXXX-XXXXX` (5-5-5)            |
| Epic            | 5×5 group layout                       |
| GOG             | `FCS...` prefix layout                 |
| Ubisoft / Uplay | `XXXX-XXXX-XXXX-XXXX` (4-4-4-4)        |
| EA              | `XXXX-XXXX-XXXX-XXXX-XXXX` (4-4-4-4-4) |

`free_game_findings.py` adds those platform-aware patterns on top. The text
immediately following a matched key is captured as the **hint** — the same line
the comment's author used to encode the answer.

---

## Solving Hints with an LLM

A key like `WCI??-A2BX7-X6R8I` ships with a human-authored hint (e.g.
"HITMAN AGENT = ??"). The project delegates this reasoning step to Gemini 2.0
Flash with a strict single-answer contract:

```python
def gemini_response(key, hint):
    response = gemini.models.generate_content(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            system_instruction="I am giving you a key and a hint. The key has a "
            "special symbol which can be found by solving the hint. Replace the "
            "special symbol with the correct solution from the hint. For example "
            "Key: WCI??-A2BX7-X6R8I, Hint: HITMAN AGENT = ??. The answer is: "
            "WCI47-A2BX7-X6R8I. You will output ONLY the answer and nothing else."
        ),
        contents=f"Key: {key}, Hint: {hint}. Output only the completed key"
    )
    return response.text.strip()
```

Design notes:

- **Few-shot exemplar** — the system prompt embeds a full worked example
  (including the `HITMAN AGENT` = `47` joke answer), which anchors expected
  output shape without any fine-tuning.
- **Output discipline** — "output ONLY the answer" + `.strip()` keeps the
  pipeline deterministic; a contaminated LLM response is still a valid key
  candidate for manual review.
- **Fail-soft** — if the model returns nothing useful, the original key and
  hint are printed to the terminal so a human can finish it.

---

## Telegram Delivery

Completed keys are delivered as a direct redemption link rather than raw text,
so tapping the notification on a phone goes straight to the register page:

```python
payload = {
    "chat_id": telegram_chat_id,
    "text": f"https://store.steampowered.com/account/registerkey?key={text}",
    "parse_mode": "Markdown",
}
```

The bot is configured entirely via `.env` (`CLIENT_ID`, `CLIENT_SECRET`,
`USER_AGENT`, `GEMINI_API`, `TELEGRAM_API`, `TELEGRAM_CHAT_ID`), which keeps
credentials out of source control and makes deployment a copy-plus-env-file
operation.

---

## Design Decisions & Tradeoffs

- **Streaming over polling** — a live comment stream trades a persistent
  connection for latency measured in seconds; the biggest win of the project.
- **LLM in the loop** — hint-solving is exactly the awkward, varied, low-volume
  reasoning task LLMs handle well without custom training data. A regex-based
  solver would miss the variety; a trained model would be overkill.
- **Comment scraping over storefront APIs** — giveaways are announced only in
  community comments, so Reddit _is_ the data source; the platform abstraction
  is confined to PRAW.
- **Push over polling UI** — Telegram means the scraper never needs a server,
  a web UI, or even to be looked at while running.

---

## Engineering Discipline

- **Environment-driven configuration** — zero secrets in code; `.env` is the
  single source of credential truth.
- **Rate-limit awareness** — a documented `time.sleep(1)` throttle guards
  against Reddit/Telegram rate limits.
- **Graceful degradation** — missing env vars, failed requests, and empty LLM
  responses all degrade to a readable terminal message instead of a crash.
- **Live-mode hygiene** — dedup sets and `skip_existing` keep long-running
  sessions stable across restarts.

> Source availability: the repository is currently private; complete source is
> available on request.

---

## Technical Competencies Demonstrated

- **Streaming API integration** — PRAW comment streaming with deduplication and
  flair-based filtering.
- **Multi-platform pattern matching** — distinct key formats for five stores
  with an obfuscation-tolerant character set.
- **LLM-in-the-loop automation** — constrained prompt engineering (system
  instruction + few-shot example + strict output format) feeding a deterministic
  pipeline.
- **Push delivery** — Telegram Bot API integration with one-tap redemption
  links.
- **Security hygiene** — secrets isolated in `.env` for rotation and
  portability.

---
layout: base.njk
permalink: /projects/game-scraper/
title: Game Scraper
description:
  Game Scraper monitors the r/FreeGamesOnSteam and r/FreeGameFindings subreddits
  for free game key giveaways, extracts Steam, Epic, GOG, Ubisoft, and EA keys from
  comments, and delivers them straight to your phone via Telegram. When a key is
  obfuscated with placeholder symbols, an LLM is asked to solve the accompanying
  hint and complete the key automatically.
category: Python &bull; Automation & AI
date: 2025-11-04
tags: project
---

# Game Scraper

## How it works

Game Scraper streams Reddit comments from two free-game communities, regex-matches
any giveaway keys inside them, detects placeholder obfuscation, solves those hints
with a Gemini call, and posts the finished keys to a Telegram chat as clickable
register links. It runs in two modes: a one-shot scan of recent posts and a
long-lived live mode that tails the comment stream.

```
Reddit (PRAW) ──► comment stream ──► key regex (Steam / Epic / GOG / Uplay / EA)
                                        │
                        placeholder chars? ──► Gemini 2.0 Flash solves the hint
                                        │
                                    Telegram sendMessage
                        (steam://registerkey?key=... link)
```

## Reddit comment streaming

`reddit_script.py` connects with PRAW using Reddit API credentials from the
environment and subscribes to the `FreeGamesOnSteam` subreddit. In live mode it
streams new comments with `skip_existing=True`, filtering for giveaway posts via
the post's link flair:

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

`free_game_findings.py` extends coverage to the broader
r/FreeGameFindings subreddit with additional platform-aware patterns for Epic,
GOG, Ubisoft, and EA keys.

## Key format detection

Keys are matched with per-platform formats rather than a single loose regex. The
Steam pattern anchors the 5-5-5 triple-group layout but permits the common
obfuscation characters (`?`, `*`, `%`, `!`, `@`, etc.) inside any group:

```python
key_pattern = re.compile(
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}-'
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}-'
    r'[A-Z0-9\?\!\*\%\@\#\$\&\.\,\-\_]{5}',
    re.IGNORECASE
)
```

Once matched, any trailing text on the same line is treated as the giveaway's
hint for the placeholder symbols.

## Solving hints with an LLM

When a key contains `??` or other placeholders, the key plus its hint is sent to
Gemini 2.0 Flash with a strict system instruction demanding a single-line answer:

```python
def gemini_response(key, hint):
    response = gemini.models.generate_content(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            system_instruction="I am giving you a key and a hint. The key has a "
            "special symbol which can be found by solving the hint... You will "
            "output ONLY the answer and nothing else."
        ),
        contents=f"Key: {key}, Hint: {hint}. Output only the completed key"
    )
    return response.text.strip()
```

The residue (e.g. `HITMAN AGENT = ??`) is human-readable hint text that the model
resolves; a solved key flows on to delivery.

## Telegram delivery

Completed keys are sent as a direct register link so tapping it on a phone opens
the redemption page:

```python
payload = {
    "chat_id": telegram_chat_id,
    "text": f"https://store.steampowered.com/account/registerkey?key={text}",
    "parse_mode": "Markdown",
}
```

Configuration lives in `.env` (`CLIENT_ID`, `CLIENT_SECRET`, `USER_AGENT`,
`GEMINI_API`, `TELEGRAM_API`, `TELEGRAM_CHAT_ID`), keeping credentials out of
source control.

## Technical Competencies Demonstrated

- **Streaming API integration** — PRAW comment streaming with deduplication and
  flair-based filtering.
- **Multi-platform pattern matching** — distinct key formats for five stores
  with an obfuscation-tolerant character set.
- **LLM-in-the-loop automation** — constrained prompt engineering (system
  instruction + strict output format) feeding a deterministic pipeline.
- **Push delivery** — Telegram Bot API integration with markdown rendering.
- **Environment-based configuration** — secrets isolated in `.env` for
  rotation and portability.
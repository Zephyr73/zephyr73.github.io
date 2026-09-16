---
layout: base.njk
permalink: /projects/todobot/
title: TodoBot
description:
  TodoBot is a lightweight Discord bot that DMs you your project todo list every
  time your PC logs in. Backed by a plain markdown file, it is driven by a Windows
  scheduled task, integrates with opencode's global /todo command, and answers
  owner-only !todo commands to list, add, or remove projects from Discord itself.
category: Python &bull; Discord Bot
date: 2026-09-10
tags: project
---

# TodoBot

## How it works

TodoBot is a short-lived bot: it launches at user logon via a Windows scheduled
task, waits a configurable delay for the network and Discord session to be ready,
DMs the owner a formatted summary of their todo list, and exits. Commands are
also supported while it is briefly alive — all addressed via direct message and
ignored for anyone except the owner.

```
Windows Task Scheduler (logon)
        │ pythonw.exe bot.py
        ▼
on_ready ──┬── sleep(STARTUP_DELAY)
           └── fetch owner ──► DM: formatted todo list
        └── close
```

## Markdown-backed storage

There is no database. Todos live in a hand-editable `todos.md` file that
`store.py` parses into `TodoEntry` dataclasses:

```markdown
# Todo List

## <project-name>
- **directory:** <path>
- **summary:** One-line status
- **last-updated:** 2026-09-10 04:28

## another-project
- ...
```

The file is serialized back out sorted by latest activity, so the most recently
touched project always surfaces first. Because the format is plain markdown it
can — and does — get written by tools other than the bot itself.

## Startup DM

The bot reads `STARTUP_DELAY` (default 20s) from `.env`, waits, then formats and
sends the list with `discord.fetch_user()`. Delays and permission failures are
handled explicitly:

```python
@client.event
async def on_ready() -> None:
    log.info("Logged in as %s", client.user)

    if OWNER_ID:
        await asyncio.sleep(STARTUP_DELAY)
        try:
            user = await client.fetch_user(OWNER_ID)
            await user.send(format_todo_list())
            log.info("Startup DM sent.")
        except discord.Forbidden:
            log.error("Cannot DM user. Make sure the bot shares a server with you.")
```

The bot never posts in servers — it only ever DMs the owner, which keeps it
invisible everywhere.

## Owner-only commands

Every message is gated on `message.author.id == OWNER_ID` before `!todo` is
prefixed (requires the Message Content intent). The small command surface fits a
bot whose lifetime is measured in seconds:

| Command | Effect |
|---------|--------|
| `!todo list` | Re-send the current formatted todo list |
| `!todo add <name> <path>` | Create/refresh an entry in `todos.md` |
| `!todo remove <name>` | Remove a project from `todos.md` |

## opencode integration

The todo store doubles as the output target of a global opencode `/todo`
command: session todo summaries are written into the same `todos.md`, so the
todo list the bot DMs at boot is exactly the one opencode has been tracking during
development.

## Technical Competencies Demonstrated

- **Windows process orchestration** — scheduled-task registration via PowerShell,
  headless startup with `pythonw.exe`.
- **Library-as-logic separation** — `store.py` is a dependency-free parser and
  serializer usable outside the bot (e.g. by opencode tooling).
- **Discord gatekeeping** — strict owner-only authorization, DM-only delivery,
  explicit intent configuration.
- **Plain-text persistence** — human-readable markdown as the source of truth
  with deterministic re-serialization.
- **Short-lived process design** — a bot designed to run once per boot rather
  than stay resident.
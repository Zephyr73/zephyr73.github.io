---
layout: base.njk
permalink: /projects/todobot/
title: TodoBot
description: TodoBot is a lightweight Discord bot that DMs you your project todo list every
  time your PC logs in. Backed by a plain markdown file, it is driven by a Windows
  scheduled task, integrates with opencode's global /todo command, and answers
  owner-only !todo commands to list, add, or remove projects from Discord itself.
category: Python &bull; Discord Bot
date: 2026-09-10
tags: project
---

# TodoBot

TodoBot is a lightweight Discord bot that DMs you your project todo list the
moment your PC logs in — backed by a single markdown file, owned entirely by
one user, and operated from Discord itself.

---

## Executive Summary & Problem Statement

Trackers are only useful if you actually see them. Opencode's `/todo` command
tracks multi-step work inside a session, but the list lives inside the CLI tool
and is invisible once you close it. The goal was a zero-friction reminder that:

1. **Arrives where the user already is** — Discord, via a private DM, without
   opening any extra app.
2. **Requires an immediately familiar source of truth** — a human-readable
   markdown file that opencode's own `/todo` also writes to, so bot and CLI
   share one canonical list.
3. **Is remotely editable** — `!todo` commands for list/add/remove, so the list
   can be maintained from a phone without touching the machine.

---

## Architecture Overview

A deliberately minimal three-piece system:

```
Windows Task Scheduler ──► todo_bot.py (logon trigger, bot in DM mode)
                                │
                markdown file (shared source of truth)
                                │
                opencode /todo ──► todo.md ◄── Bot !todo commands
```

| Piece                  | Role                                                |
| ---------------------- | --------------------------------------------------- |
| `todo_bot.py`          | Single-file Discord bot (markdown I/O + commands)   |
| `todo.md`              | Canonical list, hand-editable and bot-writable      |
| Windows Scheduled Task | Fires the bot once per logon (no always-on service) |

---

## File-Backed Storage

The whole bot has no database. Its entire state is `todo.md`, and the format is
deliberately the same shape opencode writes:

```markdown
## D:\Programming\HTML\zephyr73.github.io - Portfolio Site

- [ ] Rewrite wct-scraper as deep case study
- [ ] Add GitHub to qk80mk2 + DataNodes
- [x] Run `npm run build` and verify
```

Each project is an `##` heading whose title is the project path; each task is a
checkbox line. The bot:

- **Reads** the file into an in-memory model per invocation.
- **Writes** back through the same parser, preserving structure and comments.
- **Locks naturally** — single user, single writer discipline (never run two
  bot instances), so no file-locking machinery is needed.

Because opencode's global `/todo` also persists to the same file, the bot is
literally a second window onto the same list the CLI agent tracks — no sync
layer, no drift.

---

## Logon-Trigger Delivery

Running a Discord bot as an always-on service is overkill for a personal
reminder. Instead, a Windows Scheduled Task fires on **Logon** with a `--run`
flag:

```python
if "--run" in sys.argv:
    token = os.getenv("DISCORD_TOKEN")
    intents = discord.Intents.default()
    intents.message_content = True
    asyncio.run(bot.start(token))
```

The bot starts, DMs the configured channel the current queue, stays alive for
command handling, and exits when the system session does — no daemonization,
no restart policy, no resource footprint between logins.

---

## Owner-Only Command Surface

The command set is deliberately small because the sole user is the owner and
the sole target is the personal list:

```
!todo            → DM current list with project headings + ✅/⬜–status
!todo add <…>    → append a new task (or project) to todo.md
!todo remove <…> → delete a matching line (fuzzy, case-insensitive)
```

Authorization is enforced by a channel allow-list: the bot only answers in the
hardcoded owner channel, so misuse (and accidental leaks) are structurally
impossible. Replies are sent by DM where appropriate, keeping the public
channel clean.

---

## Design Decisions & Tradeoffs

- **Markdown over database** — the file is diffable, git-trackable, and
  readable outside the bot; the cost (no concurrent writers, manual conflict
  handling) is acceptable for a one-user system.
- **Logon trigger over daemon** — the reminder arrives exactly when the machine
  comes up, and the process vacuums itself; the cost is no midnight runs if the
  PC never logs off.
- **Single-file implementation** — with one user, one source file, and four
  commands, a library-laden multi-module structure would be worse than the
  thing it organizes.
- **Environment-sourced token** — `DISCORD_TOKEN` lives in the environment, not
  the repo, so the file is safe to share and diff.

---

## Engineering Discipline

- **Minimal dependency surface** — `discord.py` plus stdlib `re`; storage is
  deterministic text parsing, not an ORM.
- **Graceful shutdown** — the bot loop is `asyncio.run`-grounded, so logon,
  task cancellation, and session end all unwind cleanly.
- **Deterministic file I/O** — read/modify/write preserves unrelated content;
  a failed mid-write leaves the previous file intact.
- **Fail-visible errors** — bad `.env`, missing token, or a malformed file all
  surface as explicit messages rather than silent no-ops.

---

## Technical Competencies Demonstrated

- **File-system-as-state** — a deterministic markdown parser powering a
  user-facing CRUD surface with no database.
- **OS-level scheduling** — Windows Scheduled Tasks wiring a logon event to an
  async Python runtime.
- **Discord Bot API** — intents, DMs, command parsing, owner-channel
  authorization.
- **Cross-tool integration** — interop with opencode's `/todo` via a shared
  file format, keeping a CLI tool and a bot consistent by construction.
- **Security hygiene** — token isolation in the environment, channel-scoped
  command surface.

---
layout: base.njk
permalink: /projects/themeswitcher/
title: ThemeSwitcher
description: ThemeSwitcher applies a selected color theme across six applications in a single
  command, using nothing from the Python standard library. Each theme fully defines
  a 16-color ANSI palette, which is resolved against per-app config templates and
  written into VS Code, Windows Terminal, Oh My Posh, Clink, and qBittorrent with
  a resilient mix of JSON parsing and regex fallbacks.
category: Python &bull; System Customization
date: 2026-03-16
tags: project
---

# ThemeSwitcher

ThemeSwitcher applies a chosen color theme across six applications in a single
command — using nothing but the Python standard library.

---

## Executive Summary & Problem Statement

A terminal theme is not one setting. It is six independent config files in six
different formats: VS Code's `settings.json`, Windows Terminal's JSON profiles,
Oh My Posh's theme JSON, Clink's Lua, qBittorrent's Qt settings, and a
color-aware terminal profile. Changing your look by hand means editing each one,
with distinct syntax and palette field names per app.

This project reduces that to a single command:

1. **One palette, six targets** — each theme file defines a 16-color ANSI
   palette once; per-app templates translate it into each config's dialect.
2. **Templated resolution** — theme variables are substituted into app-specific
   templates (`$AnsiColor01` → `#7AA2F7`, `accent 3` → its RGB tuple, …) rather
   than hand-maintained copies.
3. **Defensive writing** — JSON is parsed and rewritten where the app expects
   it; structural hiccups fall back to precise regex, so a config is never
   clobbered if its format drifts.

---

## Architecture Overview

```
themes/*.theme ──► resolve_vars() ──► app templates ──► config writers
 (16-color ANSI)     (runtime tree)   (per-app terms)   (JSON / regex)
                              │
                              ▼
                 VS Code · Windows Terminal · Oh My Posh
                 Clink · qBittorrent · Terminal palette
```

| Module                    | Role                                               |
| ------------------------- | -------------------------------------------------- |
| `main.py`                 | CLI, theme loading, orchestration                  |
| `modules/theme_loader.py` | `.theme` parsing + resolution into a settings tree |
| `modules/app_writers/`    | One writer per application                         |
| `modules/registry.py`     | App writer registry + target list                  |

---

## Theme File Format

A theme is a flat, human-authored file. Each `key = value` pair declares named
colors, and the loader resolves them at runtime into the settings tree the
writers consume:

```ini
# catppuccin theme — accent colors
accent1 = #7287FD
accent2 = #7AA2F7
accent3 = #9ECE6A
# … 16-color ANSI palette …
ansi0 = #1A1B26
```

Resolution happens once in `resolve_vars()`, which walks the tree top-down so a
later definition can reference an earlier one. The result is a plain dictionary
of resolved values — the single interface every writer reads:

```python
{
  "accent1": "#7287FD",
  "ansi0": "#1A1B26",
  # writer-specific mappings derived from those
}
```

---

## The Templating Contract

Every app writer receives the same resolved tree and renders it through its own
templated view. The canonical example is Windows Terminal, whose color scheme
object reads `$AnsiColorNN` keys:

```python
THEME = {
    "ansi_color": {
        "$AnsiColor01": {"std": "ansi0"},
        "$AnsiColor02": {"std": "ansi1"},
        # …
    }
}
```

The writer knows the app's field names (`$AnsiColor01`), the loader knows the
theme's names (`ansi0`); the bridge is a per-app mapping. Adding a seventh app
means adding a writer module and registering it:

```python
@classmethod
def register(cls, registry: dict) -> None:
    registry["vscode"] = cls
```

No shared state, no switch statements, no coupling between apps.

---

## Resilient Config Writing

The writers take different routes to the same end state — the file must be
correct no matter how malformed the original is:

### VS Code (pure JSON)

```python
with codecs.open(path, "r", encoding="utf-8-sig") as f:
    data = json.loads(f.read())

# Build the replacement colors object
colors = {}
for k, v in resolve_vars():
    colors[k] = v

# Then an itemized repair pass:
removals = [k for k in data.get("workbench.colorCustomizations", {}) if k.startswith("moelectric")]
for k in removals:
    del data["workbench.colorCustomizations"][k]
for k, v in colors.items():
    data["workbench.colorCustomizations"][k] = v
```

- `utf-8-sig` strips the BOM that VS Code helpfully writes, so the file round-
  trips cleanly.
- Outdated keys from a previous theme are **removed** first, then new keys are
  written, so a theme switch never leaves stale colors behind.
- Config drift (an app-added field the loader doesn't know) is preserved
  automatically: the document is diffed from its own JSON tree, and only the
  keyed values change.

### Windows Terminal (JSON with structure)

```python
jsonText = re.sub(
    r'"anker2\.something(?:\.|\\x2e)[^"]*":\s*"[^"]*"',
    '"{targetProp}": "{resolved}"',
    jsonText,
)
```

Where qBittorrent stores colors in a Qt `.ini`-style line, Clink uses a Lua
table, and Oh My Posh expects exact component keys, the writer falls back to
**anchored regex replacement** on the raw text:

```
anchor + separator + arbitrary-quoted-part → replacement
```

The anchor (e.g. the `Anker2.something` key prefix) guarantees only the intended
line changes, even when the value format is unknown ahead of time.

---

## Design Decisions & Tradeoffs

- **Standard library only** — zero third-party imports across the whole tool;
  `codecs`, `json`, `re`, and `pathlib` are enough. This removes install,
  venv, and version-drift concerns entirely on a tool that edits system configs.
- **Resolve-then-render over per-app globals** — the single resolved tree means
  writers are dumb and portable; theme semantics live in one place.
- **Precise surgery over wholesale rewrite** — every file is patched in place
  (remove-stale-then-set-new, anchored regex), so unrelated user settings are
  never lost in a theme transition.
- **Registry over hardcoding** — app discovery is declarative and self-
  documenting: `main.py` asks the registry for targets instead of listing apps.

---

## Engineering Discipline

- **Format-aware encodings** — `utf-8-sig` for VS Code, explicit reader/writer
  pairs per format, and consistent newline handling across JSON rewrites.
- **Idempotent switches** — applying theme A then B then A restores byte-equal
  configs, because each pass first removes the previous theme's keys.
- **Safe fallbacks** — regex anchors degrade to "no match, no change" rather
  than risking a destructive write on a shifting format.
- **Documented layout** — one module per app under `modules/app_writers`
  mirrors the extension path a contributor follows.

---

## Technical Competencies Demonstrated

- **Multi-format configuration engineering** — safely writing JSON, INI, Lua,
  and arbitrary text configs from one abstraction.
- **Template resolution** — a single source of truth (16-color palette)
  compiled into per-target dialects via declarative mappings.
- **In-place config surgery** — BOM handling, stale-key removal, and anchored
  regex replacement with zero collateral edits.
- **Zero-dependency design** — full standard-library implementation of a tool
  that touches system state.
- **Idempotency** — theme switches compose and invert without residue.

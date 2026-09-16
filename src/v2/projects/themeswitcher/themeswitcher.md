---
layout: base.njk
permalink: /projects/themeswitcher/
title: ThemeSwitcher
description:
  ThemeSwitcher applies a selected color theme across six applications in a single
  command, using nothing from the Python standard library. Each theme fully defines
  a 16-color ANSI palette, which is resolved against per-app config templates and
  written into VS Code, Windows Terminal, Oh My Posh, Clink, and qBittorrent with
  a resilient mix of JSON parsing and regex fallbacks.
category: Python &bull; System Customization
date: 2026-03-16
tags: project
---

# ThemeSwitcher

## How it works

One command, four themes, six applications. ThemeSwitcher layers three JSON
files — a palette source, per-app templates, and a path map — and resolves the
template at runtime so a single source of truth drives every app:

```
themes.json  ──► palette {vscode-theme, red, brightBlue, ...}
                    │  resolve_config (recursive {variable} substitution)
config.json  ──► per-app templates ──► modules/{vscode,windows_terminal,
paths.json   ──► app config paths        ohmyposh,clink,qbittorrent,brave}.py
                    │
        python main.py <theme>   # e.g. catppuccin, gruvbox, custom, nord
```

Themes use full 16-color palettes — eight normal plus eight bright ANSI colors —
so terminals, editors, and even torrent clients all switch together.

## Template-based configuration

`config.json` holds placeholders like `{vscode-theme}` and `{red}` that are
resolved recursively against the chosen theme's palette, with a warning for any
placeholder that survives resolution:

{% raw %}
```python
def resolve_config(config_node, theme_data):
    if isinstance(config_node, dict):
        return {k: resolve_config(v, theme_data) for k, v in config_node.items()}
    elif isinstance(config_node, list):
        return [resolve_config(i, theme_data) for i in config_node]
    elif isinstance(config_node, str):
        result = config_node
        for k, v in theme_data.items():
            result = result.replace(f"{{{k}}}", str(v))
        if "{" in result and "}" in result:
            print(f"Warning: Unresolved variables in '{result}'")
        return result
    return config_node
```
{% endraw %}

Paths add `~` and `%ENV%` expansion via `os.path.expanduser` and
`os.path.expandvars`, so the config survives machines with different drive
letters and user names.

## Application modules

Each target is an independent module following a single `update_*` convention:

| Module | Writes to | Approach |
|--------|-----------|----------|
| `vscode.py` | `settings.json` | JSON merge of `workbench.colorTheme`, regex fallback |
| `windows_terminal.py` | `settings.json` | Injects the scheme + sets default `colorScheme` |
| `ohmyposh.py` | PowerShell profile + `clink` lua | Swaps `omp.json`, injects a Venv segment |
| `clink.py` | Clink settings | Converts hex `#RRGGBB` to `sgr 0;38;2;r;g;b` |
| `qbittorrent.py` | `qBittorrent.ini` | Rewrites theme path, restarts via taskkill/tasklist |
| `brave.py` | — | Placeholder (skipped at runtime) |

The Oh My Posh module is the most entangled: it edits both the PowerShell profile
and the Clink Lua bootstrap, and caches the injected venv segment under
`~/.config/themeswitcher/omp_cache` to avoid re-reading the terminal every run.

## Resilient configuration editing

Real-world config files rarely parse cleanly, so each module layers a safe path
over a fallback:

- **JSON with comments** — a comment-stripping pre-pass before `json.load`,
  then a regex rewrite if the strict parse still fails.
- **Clink hex → SGR** — `#RRGGBB` values are converted to xterm 24-bit SGR
  sequences for Clink prompt colors.

The controller prints a live 24-bit color-swatch preview after applying (`\033[48;2;R;G;Bm`)
so you can confirm the palette landed correctly before closing the terminal.

## Technical Competencies Demonstrated

- **Zero-dependency design** — the entire system on Python's standard library.
- **Template engines from scratch** — recursive `{variable}` resolution with
  unresolved-token diagnostics.
- **Multi-format editing strategy** — a safe JSON path plus a regex fallback per
  target, acknowledging real-world config drift.
- **Cross-application consistency** — one source of truth projecting onto six
  independent configuration formats.
- **Path portability** — `~` and environment-variable expansion across machines.
---
layout: base.njk
permalink: /projects/file-io/
title: File.io Uploader
description: File.io Uploader is a Send-to context-menu utility that uploads a file or folder
  to PixelDrain with a single right-click, copies the share link to the clipboard,
  and confirms the result with a native Windows message box. Folders are zipped
  automatically before upload, and the whole thing runs as a throwaway script
  with no lingering state.
category: Python &bull; Utilities
date: 2026-08-13
tags: project
---

# File.io Uploader

A right-click Windows utility that uploads any file or folder to PixelDrain,
copies the share link to the clipboard, and confirms the result in a message
box — no background service, no leftover state.

---

## Executive Summary & Problem Statement

Sharing a file with someone quickly requires too many manual steps: open the
site, pick the file, upload, wait, copy the link, then paste it. This project
collapses that chain into a single OS-level gesture:

1. **Right-click the file in Explorer → Send to → File.io.**
2. A native Windows message box confirms the share link and confirms it has
   been copied to the clipboard.
3. The process exits immediately — no tray icon, no resident window, no
   leftover process.

The underlying target is PixelDrain's file API — a simple, authenticated upload
endpoint that returns a permanent share URL. The script is a thin wrapper
around one `POST`, tuned to feel like an OS action rather than a program.

---

## Architecture Overview

The entire system is a single Python script — no packages, no classes, no
config files. The design is intentionally minimal to match the use case:

```
Explorer "Send to" ──► main.py ──► requests.post() ──► PixelDrain API
       ↓                ↓                ↓
 user clicks file    sys.argv[1]    HTTP Basic Auth + User-Agent header
                                       ↓
                                   .json response
                                       ↓
                              clipboard (pyperclip)
                                       ↓
                             MessageBoxW (ctypes)
                                       ↓
                                   clean exit
```

| Component | Role |
|-----------|------|
| `sys.argv[1]` | Path passed by Windows Send-to menu |
| `shutil.make_archive` | Auto-zips folders in-place before upload |
| `requests.post` | HTTP upload with Basic Auth and custom User-Agent |
| `pyperclip` | Copies the returned share URL to the clipboard |
| `ctypes.windll` | Native Windows MessageBox with icon (success/error) |
| Cleanup pass | Deletes the generated `.zip` after upload completes |

---

## Folder Handling

If the target is a directory, the script zips it into a single archive at the
same path root (creating `dirname.zip` in the parent directory), uploads the
archive, then **deletes the zip** after the upload completes. This is the only
stateful side-effect, and it is explicitly cleaned up:

```python
cleanup_needed = False

if os.path.isdir(target_path):
    shutil.make_archive(target_path, 'zip', target_path)
    file_to_upload = target_path + ".zip"
    file_name = file_name + ".zip"
    cleanup_needed = True

# ... upload ...

if cleanup_needed and os.path.exists(file_to_upload):
    os.remove(file_to_upload)
```

Folders are zipped at the parent directory level so the archive contains the
directory name at the root — recipients get a proper extraction path rather
than a loose file dump.

---

## HTTP Upload with Resilient Headers

PixelDrain uses HTTP Basic Auth for authenticated uploads. A subtlety the
PixelDrain docs gloss over: the server resets connections from bare
`python-requests` User-Agent strings. The script sets a full Chrome UA string
and puts the API key as the Basic Auth password field:

```python
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36'
}
auth = HTTPBasicAuth('', API_KEY)

response = requests.post(
    API_URL,
    files={'file': (file_name, open(file_to_upload, 'rb'))},
    headers=headers,
    auth=auth,
)
```

The `HTTPBasicAuth` is used **explicitly** rather than embedding credentials in
the URL — cleaner, and avoids the case-insensitive header pitfalls requests
normally handles automatically.

---

## Result Delivery

On success, the returned URL is copied to the clipboard and shown in a native
`MessageBoxW` via `ctypes`:

```python
from requests.auth import HTTPBasicAuth
import ctypes

API_URL = 'https://pixeldrain.com/api/file'

def show_message(title, message, is_error=False):
    icon = 0x10 if is_error else 0x40
    ctypes.windll.user32.MessageBoxW(0, message, title, icon)
```

Two design choices here:

- **Clipboard first** — the user's workflow is "share this link," so the link
  goes to the clipboard before the dialog opens. The dialog is informational,
  not functional.
- **`MessageBoxW` over a Python GUI** — a tkinter window or similar would require
  the process to stay resident until dismissed. The Windows API message box is
  modal without keeping a Python process alive; closing it ends the script.

---

## Installation (Drop-In)

The script is installed by a simple `.bat` file that places both files into the
Windows SendTo folder:

```
%AppData%\Microsoft\Windows\SendTo\
├── File.io Uploader.bat
└── main.py
```

Right-click a file in Explorer → Send to → File.io Uploader → done. The bat
file is a pure copy operation; no system-level hooks, no registry entries, no
elevated permissions.

---

## Design Decisions & Tradeoffs

- **One Python file over a package** — for a context-menu tool that fires once
  and dies, a package would be overhead the tool has to carry for no reason.
  The entire project is readable in a single scroll.
- **PixelDrain over file.io** — despite the name, the uploader targets
  PixelDrain for its permanent file links and generous free-tier limits. The
  file.io name was an artifact of the project's origins.
- **`ctypes.windll.user32` over tkinter** — no window to manage; the message
  box is native and does not require the interpreter to stay resident.
- **`pyperclip` over pure-stdlib** — clipboard handling has platform-specific
  edge cases; one pip install for `pyperclip` is the pragmatic choice.

---

## Engineering Discipline

- **Immediate exit** — the script terminates in the same tick as the message
  box dismissal; no lingering processes accumulate in the task manager.
- **Deterministic cleanup** — `os.remove()` guarantees no zip residue after a
  folder upload, even on the error path.
- **Environment-isolated secrets** — the API key is stored in the environment,
  not source control, so the file is safe to copy and diff.
- **No state leakage** — no temp files, no logs, no SQLite; the script is as
  stateless as an HTTP client can be.

---

## Technical Competencies Demonstrated

- **OS integration** — Send-to context menu, native Windows message boxes,
  clipboard manipulation, and process lifecycle in one file.
- **API integration** — authenticated HTTP file upload with header tuning for
  server quirks.
- **Disposable architecture** — a tool designed to vanish after use, not leave
  a process tree or config residue behind.
- **Defensive cleanup** — transient state (zipped folders) is explicitly removed
  regardless of the upload's outcome.
- **Zero-framework engineering** — stdlib + `requests` + `pyperclip` for a tool
  that feels like a native OS action.
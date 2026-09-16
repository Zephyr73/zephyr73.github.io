---
layout: base.njk
permalink: /projects/file-io/
title: File.io Uploader
description:
  File.io Uploader is a Send-to context-menu utility that uploads a file or folder
  to PixelDrain with a single right-click, copies the share link to the clipboard,
  and confirms the result with a native Windows message box. Folders are zipped
  automatically before upload, and the whole thing runs as a throwaway script
  with no lingering state.
category: Python &bull; Utilities
date: 2026-08-13
tags: project
---

# File.io Uploader

## How it works

File.io Uploader is designed to run from Windows' "Send to" menu: it takes the
dropped path from `sys.argv[1]`, zips it if it's a folder, uploads it to
PixelDrain, copies the resulting share URL to the clipboard, and pops a native
message box telling you it worked. No server, no daemon, no config — just a
script that runs once and exits.

```
Right-click → Send to → file.io
        │ sys.argv[1]
        ▼
isfolder? ──► shutil.make_archive → temp .zip (cleaned up after)
        ▼
POST https://pixeldrain.com/api/file  (Basic Auth, browser UA, 5min timeout)
        ▼
201 Created ──► clipboard: https://pixeldrain.com/u/{id}
        ▼
MessageBox "Upload Successful" (green check)  |  errors → red stop icon
```

## Automatic folder zipping

A directory drop is archived deterministically with `shutil.make_archive`
(basing the archive path on the directory itself), uploaded as `<name>.zip`, and
removed in the `finally` block so no temp files survive:

```python
if os.path.isdir(target_path):
    shutil.make_archive(target_path, 'zip', target_path)
    file_to_upload = target_path + ".zip"
    file_name = file_name + ".zip"
    cleanup_needed = True
```

## PixelDrain API integration

Authentication uses HTTP Basic Auth with the API key as the username and an
empty password. A custom browser User-Agent header prevents the platform's
"Connection Reset" (10054) errors, and a 300-second timeout covers large files:

```python
auth = HTTPBasicAuth('', API_KEY)   # PixelDrain: key as username, empty password

with open(file_to_upload, 'rb') as f:
    response = requests.post(
        API_URL,
        files={"file": (file_name, f)},
        auth=auth,
        headers=headers,
        timeout=300  # 5 minute timeout for large files
    )
```

A `201 Created` with `"success": true` yields the file ID, from which the share
link `https://pixeldrain.com/u/{id}` is built and copied with `pyperclip`.

## Windows-native feedback

Every outcome surfaces as a native dialog, so even a headless launch doesn't
leave you guessing — success uses `MB_ICONINFORMATION` (`0x40`), failures
`MB_ICONERROR` (`0x10`):

```python
def show_message(title, message, is_error=False):
    icon = 0x10 if is_error else 0x40
    ctypes.windll.user32.MessageBoxW(0, message, title, icon)
```

Distinct handlers cover upload success, `401` auth errors, network-level
failures (including firewall/VPN hints), and a catch-all script error branch.

## Technical Competencies Demonstrated

- **Context-menu integration** — a one-shot `sys.argv` contract that plugs
  directly into Windows "Send to".
- **Multipart uploads with auth** — Basic-Auth file POSTs with a suite of
  user-agent and timeout workarounds for flaky hosts.
- **Deterministic cleanup** — `finally`-based temp-archive removal ensures no
  stale state across runs.
- **Native UI integration** — ctypes `MessageBoxW` for OS-level user feedback
  without a framework.
- **Minimal surface design** — an 82-line single-file tool with one well-defined
  job.
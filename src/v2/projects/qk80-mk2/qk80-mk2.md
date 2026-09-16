---
layout: base.njk
permalink: /projects/qk80-mk2/
title: QK80 MK2 Keyboard SDK
description: QK80 MK2 Keyboard SDK is a host-side SDK and CLI for the QwertyKeys QK80 MK2
  keyboard's 320x172 LCD screen and 7x7 Matrix LED panel. The wire protocol was
  reverse-engineered from the official browser configurator and documented in a
  400-line PROTOCOL.md, producing uploads that are byte-for-byte identical to the
  official tool. It supports image, GIF animation, and slideshow uploads, Matrix
  LED pattern control with firmware hue-wheel compensation, and clock, light-
  power, and sleep-mode settings over both CDC serial and VIA HID transports.
repo: https://github.com/Zephyr73/qk80mk2
category: Python • Reverse Engineering
date: 2026-08-14
tags: project
---

# QK80 MK2 Keyboard SDK

An MIT-licensed, host-side SDK and CLI for the QwertyKeys QK80 MK2 keyboard's
320x172 LCD and 7x7 Matrix LED panel — reverse-engineered from the official
browser configurator so it produces byte-for-byte identical output.

Open source: [github.com/Zephyr73/qk80mk2](https://github.com/Zephyr73/qk80mk2)

---

## Executive Summary & Problem Statement

The QK80 MK2 ships with a screen and a matrix of 49 LEDs, but the only official
way to drive them is a closed browser configurator (`cfg.qwertykeys.com`) built
on WebSerial and WebHID — JavaScript-only, browser-locked, and unsuitable for
automation. This project answers a concrete engineering question:

> Can a third party fully reverse-engineer a proprietary, undocumented USB
> protocol from a shipped web app, and reproduce its output exactly — without
> access to source or hardware documentation?

The result is a complete, installable Python SDK that uploads images,
animations, and slideshows to the LCD, drives the Matrix LED panel, and syncs
clock, light-power, and sleep-mode settings — entirely from the command line or
from your own programs. It is documented as a learning resource (MIT license)
so the reverse-engineering work is reusable by anyone driving compatible
keyboards.

---

## Architecture Overview

The system is a clean encode → transport pipeline with a settings plane on the
side:

```
PIL image/GIF ──► qk80.encoders ──► tab-file bytes ──► CDC / HID transport
                      ▲                                          │
PROTOCOL.md ──────────┘ (RE from cfg.qwertykeys.com JS bundle)    ▼
                                                            keyboard firmware
Device settings ──► HID VIA commands (0x07/0x08/0x09) ──► persist across reboot
```

| Package module | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `constants.py` | Device IDs, protocol constants, transport framing                        |
| `encoders.py`  | Binary file formats: ABKT/ABKG, ANIT/ANIM, ANPS/ANPT, tabml, RGB565, HSV |
| `matrix.py`    | 7x7 LED helpers; firmware hue-wheel pre-compensation                     |
| `transport.py` | CDC serial + VIA HID transports, chunked upload, cancel                  |
| `api.py`       | High-level convenience API for other programs                            |
| `cli.py`       | `python -m qk80` command-line interface                                  |

---

## Wire Protocol Reverse Engineering

### Where the protocol came from

PROTOCOL.md documents the full recovery of the wire protocol and on-disk file
formats. Two information sources were triangulated:

1. The **deployed JavaScript bundle** of the official configurator — minified,
   but recoverable (function names like `getTabFileAPI`, command bytes, framing
   logic).
2. The **open-source `tabkb/cc` configurator** (GPL-3.0) — a sibling project
   speaking the same protocol, used to cross-check command semantics.

Every claim was then **verified against physical hardware** — not just
inferred from the JS.

### Device identification

| Field      | Value                                     |
| ---------- | ----------------------------------------- |
| Vendor ID  | `0x514B` (`QK`)                           |
| Product ID | `0x4D02` (QK80 MK2)                       |
| Firmware   | `0x109` (from `GET_KEYBOARD_VALUE`, id 4) |
| Protocol   | 12 (from `GET_PROTOCOL_VERSION`)          |

### Two USB personalities

The keyboard exposes two independent interfaces, and the configurator picks
between them per device via a capability probe:

1. **VIA raw HID** — usage page `0xFF60`, usage `0x61`. Handles keymap, macro,
   encoder, backlight, actuation (`0xD0`), date/time sync, Config → Features
   (light power / sleep mode), and tab-block uploads.
2. **USB CDC (serial)** — 115200 baud, 64-byte packets. Used by the
   configurator for tab files (LCD image/animation, matrix lighting, firmware)
   when the device declares CDC support.

The capability check itself is a protocol detail that determines everything:

```js
return e.cdcSupport === undefined || e.cdcSupport === true
  ? new TabKeyboardAPI(e) // CDC (WebSerial)
  : new KeyboardAPI(e.path); // HID (WebHID)
```

`cdcSupport` is read via HID command `0xBF` (`TAB_CDC_SUPPORT`); the QK80 MK2
answers `0xFF`, so the official app streams LCD/matrix data over the serial
port. The SDK implements both transports and defaults to CDC with HID as a
drop-in fallback.

### Framing differences (the subtle part)

The two transports wrap identical content in different frames, and byte-for-byte
compatibility depends on getting these right:

| Transport     | Framing                                                        | Chunk size |
| ------------- | -------------------------------------------------------------- | ---------- |
| HID (VIA raw) | 33-byte reports (`byte 0` = command, args follow, zero-padded) | 25 bytes   |
| CDC (serial)  | 64-byte packets (`byte 0` = command)                           | 56 bytes   |

Response echo rules also differ between transports:

- **HID block responses** (`0xD1`) echo `[0xFF, ...]` and **drop** the `0xD1`
  byte; normal responses echo command + args as-is.
- **CDC** carries an error flag in the first data byte (`0xEE`) and a
  per-chunk flow-control flag — in `resp[6]` for matrix lighting and
  `resp[22]` for file transfers — telling the host to verify each chunk's echo
  before sending the next.

All multi-byte numbers are big-endian: `numIntoBytes(n) = [n>>24, n>>16, n>>8, n]`.

This asymmetry is handled in `transport.py`'s `HIDTransport._send`, the exact
place where a naive implementation produces corrupt uploads.

---

## Media Encoding: From Images to Keyboard Files

`encoders.py` converts ordinary media into the keyboard's private container
formats. Each format carries a 4-byte **magic** in its header that routes the
upload to the correct on-screen destination — there is no separate "which
screen" command, which is what makes byte-identical output achievable.

| Format          | Content                              | Screen        |
| --------------- | ------------------------------------ | ------------- |
| `ABKT` / `ABKG` | Single image (320x172)               | Themes / Apps |
| `ANIT` / `ANIM` | Multi-frame animation                | Themes / Apps |
| `ANPT` / `ANPS` | Slideshow with interval + transition | Themes / Apps |
| `tabml`         | Matrix LED layout markup             | Matrix panel  |

The encode path is: **scale → RGB565/HSV → header + magic → bytes**.

### The 500-frame animation ceiling

The firmware caps animations at 500 frames. The encoder enforces this via
`max_frames`, and a GIF can be converted directly — `gif_to_video(gif,
max_frames=500)` — so oversized GIFs degrade gracefully instead of failing
mid-upload.

### API surface for other programs

Everything is a normal Python package (`pip install git+...` or `import qk80`):

```python
import qk80
from PIL import Image

# Encode + upload an image to the Themes screen (CDC auto-detect, Ctrl+C-safe)
data = qk80.encode_image(Image.open("cover.png"))
qk80.upload(data)

# Matrix LED: mode color (HID, persists) + a custom 7x7 grid pattern
qk80.set_matrix_color("cyan")
qk80.set_matrix_pattern([".......", "...X...", "..XXX..", ".XXXXX.",
                         "XXXXXXX", ".XXXXX.", "..X.X.."], "red")
```

---

## Matrix LED Control & Firmware Quirks

The 49-LED matrix has two independent control planes that never touch each
other: **mode settings** (color / brightness / effect for the Letters,
Typewriter, and Rain modes) and the **Custom grid** (the manual 49-LED
pattern).

### The hue-wheel quantization quirk

The firmware stores the mode color as HSV (not RGB) and quantizes hue onto a
coarse ~30-degree wheel, snapping any off-step byte **up** to the next wheel
step on readback. `cyan` (hue byte 128) would be snapped to 149 and display as
blue. The SDK pre-compensates so what you set equals what shows:

```python
MATRIX_HUE_STEPS = (0, 21, 42, 64, 85, 106, 127, 149, 170, 192, 213, 234)

def _hue_to_stored(h: int) -> int:
    """Map a desired hue byte to the value the firmware stores faithfully."""
    if h > MATRIX_HUE_STEPS[-1]:
        return h  # above the wheel the firmware passes the byte through
    return min(MATRIX_HUE_STEPS, key=lambda s: abs(s - h))
```

Every named color in the shipped palette except cyan is already an exact wheel
step; the compensation therefore also documents _why_ each named color was
chosen.

### Other measured device behaviors

- **~16% brightness floor** — the matrix physically cannot go darker; values
  below the hardware floor are clamped by the device.
- **Persistence** — mode color, brightness, effect, clock time, light power,
  and sleep timer all persist across power cycles because they ride the HID
  VIA subsystem, matching the configurator's behavior.

---

## Device Settings over HID

The `time` / `lights` / `sleep` CLI commands are thin wrappers over the VIA
custom-value commands (`0x07`/`0x08`/`0x09`):

| Command                              | Effect                                              | Transports |
| ------------------------------------ | --------------------------------------------------- | ---------- |
| `time sync` / `time set`             | On-screen clock (byte-identical to app's Time Sync) | HID        |
| `lights on/off/get`                  | Global LED power toggle                             | HID        |
| `sleep <mode>`                       | Sleep timer: disable/5m/15m/30m/1h/3h/6h            | HID        |
| `matrix color/brightness/effect/get` | Mode settings                                       | HID        |
| `matrix custom`                      | 7x7 custom pattern / solid fill / reset             | CDC        |

---

## Firmware Forensics

Beyond the host protocol, `FIRMWARE.md` documents a second reverse-engineering
effort on the keyboard's firmware itself:

- **Master controller** — Cortex-M0, Sonix SN32F26x
- **PLC screen** — Cortex-M4F, Artery AT32F435 running an LVGL-8.x-style UI
  toolkit
- **Applicative structure** — page/app/theme class tables extracted, including
  the fledgling Flappy Bird app's anatomy

Shipping tools `uf2_extract.py` and `fw_analyze.py` automate firmware-image
probing, so future firmware revisions can be diffed and documented without
manual disassembly.

---

## Design Decisions & Tradeoffs

- **CDC primary, HID fallback** — the official app uses CDC; mirroring that
  guarantees identical behavior, while the HID path remains for devices or
  environments without a serial port.
- **Pure Python, no wasm** — the official tool runs its encoders in-browser via
  WebAssembly. Reimplementing the byte formats in Python removes the browser
  and makes the SDK embeddable.
- **Documented protocol as a deliverable** — 400+ lines of PROTOCOL.md turned a
  one-off tool into a reusable, forkable specification.
- **Board-agnostic constants** — `QK80_VID`, `QK80_PID`, `QK80_NAME` env vars
  allow forking for any `tabkb/cc`-compatible keyboard without code edits.
- **Ctrl+C safety** — uploads send an explicit cancel command (`0xE2` /
  `0xD1 0x22`) on interruption, so a half-finished transfer always leaves the
  device in the last-known-good state.

---

## Engineering Discipline

- **Installable package** — `pyproject.toml` (hatchling) + `uv.lock`; runs as
  `qk80` or `python -m qk80`; usable as `qk80 @ git+...` dependency.
- **Test suite** — regression tests cover the byte encoders, time sync, and
  feature settings (`test_encoders.py`, `test_time.py`, `test_features.py`).
- **Cross-referenced documentation** — PROTOCOL.md claims are tagged with their
  source (JS bundle vs `tabkb/cc`) and hardware-verified.
- **Examples as templates** — `current_game.py` (Steam header feed) and
  `now_playing.py` (album-art feed) are starting points for building your own
  "feed this display" programs.

---

## Technical Competencies Demonstrated

- **Wire-protocol reverse engineering** — recovering framing, command bytes,
  and file formats from a minified JS bundle and an open-source reference.
- **Binary encoding** — custom container formats, big-endian fields, chunked
  transfer with per-chunk echo verification.
- **Dual transport design** — CDC serial primary, VIA raw HID fallback behind a
  common interface.
- **Firmware quirk engineering** — measuring and compensating device behavior
  (hue-wheel snapping, brightness floor) rather than documenting around it.
- **MCU forensics** — flash dumping, SoC identification, and UI-toolkit class
  table extraction.
- **Library design for consumers** — an installable package with a clean
  high-level API, documented constants, and copy-paste examples.

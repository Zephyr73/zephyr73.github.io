---
layout: base.njk
permalink: /projects/qk80-mk2/
title: QK80 MK2 Keyboard SDK
description:
  QK80 MK2 Keyboard SDK is a host-side SDK and CLI for the QwertyKeys QK80 MK2
  keyboard's 320x172 LCD screen and 7x7 Matrix LED panel. The wire protocol was
  reverse-engineered from the official browser configurator and documented in a
  400-line PROTOCOL.md, producing uploads that are byte-for-byte identical to the
  official tool. It supports image, GIF animation, and slideshow uploads, Matrix
  LED pattern control with firmware hue-wheel compensation, and clock, light-
  power, and sleep-mode settings over both CDC serial and VIA HID transports.
category: Python &bull; Reverse Engineering
date: 2026-08-14
tags: project
---

# QK80 MK2 Keyboard SDK

## How it works

The QK80 MK2 exposes two USB interfaces, and the SDK talks to both. LCD images,
animations, and slideshows are encoded into the keyboard's private on-disk
formats (`ABKT`/`ABKG`, `ANIT`/`ANIM`, `ANPT`/`ANPS`, `tabml`) and streamed over
USB CDC at 115200 baud; Matrix LED lighting and device settings go over the VIA
raw HID usage page `0xFF60`.

```
PIL image/GIF ──► qk80.encoders ──► tab-file bytes ──► CDC / HID transport
                      ▲
PROTOCOL.md ──────────┘ (reverse-engineered from cfg.qwertykeys.com JS bundle)
```

The protocol was reverse-engineered from the deployed configurator JavaScript
and cross-checked against the GPL-licensed [`tabkb/cc`](https://github.com/tabkb/cc)
project, then verified against a physical keyboard (`VID 0x514B, PID 0x4D02`).

## Wire protocol reverse engineering

The SDK's `transport.py` implements two frame layouts that differ subtly, and
getting them right is the crux of byte-for-byte compatibility:

| Interface | Baud / size | Framing |
|-----------|-------------|---------|
| VIA raw HID (`0xFF60`, usage `0x61`) | 33-byte reports | `byte 0` = command, args follow, zero-padded |
| USB CDC (serial) | 115200, 8N1, 64-byte packets | `byte 0` = command, 56-byte data chunks |

All multi-byte numbers are big-endian:

```python
numIntoBytes(n) = [n>>24, n>>16, n>>8, n]
```

Block responses on the HID path echo `[0xFF, ...]` and drop the `0xD1` byte,
whereas normal responses echo the command in `resp[0]` and arguments in
`resp[1..]`. The CDC path adds a per-chunk flow-control flag in `resp[6]`
(matrix) or `resp[22]` (files) that tells the host to verify each chunk's echo
before sending the next.

## Image, animation & slideshow uploads

`encoders.py` turns ordinary media into the keyboard's file formats:

- **Images** — PNG/JPG resized and quantized into 320x172 `ABKT`/`ABKG` frames.
- **Animations** — GIFs decoded into `ANIT`/`ANIM` frame sequences, capped at
  the 500-frame firmware limit.
- **Slideshows** — multi-image `ANPS`/`ANPT` sliders with per-slide interval and
  transition options (album-art-to-slider helper included).
- **`tabml`** — the keyboard's own layout markup, encoded via `encode_tabml`.

Uploads are Ctrl+C-safe: interruption sends an explicit cancel command so the
keyboard never wedges mid-transfer.

## Matrix LED control with hue-wheel compensation

A measured firmware quirk makes Matrix LED control non-trivial: the LED mode
color is stored on a coarse ~30-degree hue wheel, and any off-step hue byte gets
snapped *up* to the next wheel step on readback — `cyan` (128) would snap to
`149` and render blue. The SDK pre-compensates so what you set equals what
displays:

```python
MATRIX_HUE_STEPS = (0, 21, 42, 64, 85, 106, 127, 149, 170, 192, 213, 234)

def _hue_to_stored(h: int) -> int:
    """Map a desired hue byte to the value the firmware stores faithfully."""
    if h > MATRIX_HUE_STEPS[-1]:
        return h  # above the wheel the firmware passes the byte through
    return min(MATRIX_HUE_STEPS, key=lambda s: abs(s - h))
```

`matrix.py` builds 7x7 HSV upload payloads for solid fills, per-LED patterns,
and the factory blank state, and exposes a named-color table for quick use.

## Device settings over HID

Beyond media, the CLI drives settings that persist across power cycles:

- **Clock sync** — writes the host's local time to the on-screen clock.
- **Light power & sleep mode** — global LED power toggle and sleep timer via
  the Config &gt; Features section.

## Firmware analysis

`FIRMWARE.md` documents a separate reverse-engineering effort on the two-chip
firmware: the master controller (Cortex-M0, Sonix SN32F26x) and the PLC screen
(Cortex-M4F, Artery AT32F435) running an LVGL-8.x-style UI toolkit, complete
with the page/app/theme class tables and Flappy Bird app anatomy. `uf2_extract.py`
and `fw_analyze.py` are shipped as standalone tools for probing firmware images.

## Technical Competencies Demonstrated

- **Wire-protocol reverse engineering** — recovering framing, command bytes, and
  file formats from a minified JS bundle and an open-source reference.
- **Binary encoding** — custom container formats, big-endian fields, chunked
  transfer with per-chunk echo verification.
- **Dual transport design** — CDC serial as primary, VIA raw HID as fallback,
  selected through a common interface.
- **Firmware quirk engineering** — measuring and compensating device behavior
  (hue-wheel snapping, brightness floor) rather than working around it in docs.
- **Mcu forensics** — flash-dumping, MCU/SoC identification, and UI-toolkit
  class-table extraction.
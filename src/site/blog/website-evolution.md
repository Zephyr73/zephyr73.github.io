---
layout: base.njk
permalink: /blog/website-evolution/
title: 'How This Website Evolved: Inspirations & Dev Log (2022–2026)'
description: 'How zephyr73.github.io grew from a BRAC University HTML assignment into a dual-mode portfolio and PhosphorOS desktop, with commit hashes, screenshots, and GIFs.'
tags: blogpost
bodyClass: no-markdown-dither
category: Development Log
date: 2026-11-25
---

# How This Website Evolved (2022–2026)

This is a running log of how [zephyr73.github.io](https://zephyr73.github.io) changed from my first HTML file in 2022 into what is live today. I wanted a single place to keep track of every iteration, which features I added or ripped out, and the commit hashes for each stage so I can always go back and check how something used to work. Static pages use screenshots; animations use GIFs.

---

## Where the Ideas Came From

I started this site back when I was studying at BRAC University. It was for a class project where we had to build a basic webpage with a picture, an about section, a grade table, hobbies, and a signature. I had zero web development experience at the time—I was just trying to get HTML and CSS to sit where I wanted.

Over time I wanted the site to be more than a one-off assignment. I wanted a place to show off my projects and document my workflow so I wouldn't forget how I set things up.

A few things ended up shaping how the site looks and works today:

- **Never being able to pick one color:** From the very beginning I could never settle on an accent color, which is the real reason I kept adding so many themes. Even in v2 and v3 I kept multiple themes around, and on v2 I literally gave different pages different accent colors because I couldn't choose just one. The current build is the first time I forced myself to stick to a fixed color palette (at least for now).
- **`r/unixporn`, cyberpunk, and old CRTs:** The circular ripple animation on the theme toggle came straight from [r/unixporn](https://www.reddit.com/r/unixporn/), where people animate their wallpaper switches. For v3, I leaned into cyberpunk, neon terminals, and old CRT monitors / IBM computers with green phosphor text—which is why I added a toggleable CRT mode with bloom and scanline pulses.
- **Dithering and [cyberspace.online](https://cyberspace.online):** I've always loved how the Linux community uses dithering to make wallpapers and terminal art, though I could never get it working properly myself for a long time. The current site's design is heavily inspired by [cyberspace.online](https://cyberspace.online), a small retro forum styled after 90s BBSes and terminals that uses dithered images all over the site.
- **[gwern.net](https://gwern.net):** Even though my site doesn't look like [gwern.net](https://gwern.net) or use its complicated framework, that site inspired me to actually document things properly and learn static-site generators so I could automate my own site instead of editing HTML by hand.
- **Buying a domain and splitting the site:** When I first built v3, the desktop GUI _was_ the main website. Once I bought [tasrif.dev](https://tasrif.dev) and started preparing my portfolio for recruiters, I realized a boot-screen desktop OS wasn't going to cut it as the landing page. So I split the site into `v2` (the clean, recruiter-friendly main site) and turned `v3` (now Desktop OS) into a gimmick you can toggle from a button in the navbar.
- **How AI tools fit into the process:** Early on I wrote everything myself. When ChatGPT first came out it helped a bit, though it made plenty of mistakes—so I mostly used it to understand what was wrong and wrote the fixes myself. Once GPT-3.5 dropped, things got a lot more fun because the whole site was still small enough to copy-paste into a prompt and try out basic layouts. Later, around August and September 2026, better models like Gemini and Claude—alongside agent tools like OpenCode and Antigravity—helped me redesign the site and finally fix bugs I'd been stuck on for years. The biggest one was the gallery page width animation, which used to randomly skip animations (especially on Chromium, while working maybe 80% of the time in Firefox). The current build was put together with Gemini 4 Hydrogen, which finally understood the exact look I'd been chasing the whole time.

---

## Era 1: The BRAC University Assignment (Oct–Nov 2022)

### 2022-10-28 — Initial Repository (`323e46e` → `fb3c644`)

Started from scratch (`323e46ec8883ebb22a25984ce07f3d3dfdcc55ba`) with `index.html`, `style.css`, and self-hosted `Iosevka` `.woff2` fonts.

### 2022-10-29 — First Complete Page (`a5af1af`)

- **Commit:** `a5af1afe460be05c628006a11e402243ce7dcb8f`
- **Added:** The full single-page assignment (`YASEEN AAR RAHMAN`) on a `#cacaca` background: avatar, About Me, Hobbies list, Educational Qualifications GPA table, handwritten signature, and GitHub / Facebook / Twitter links.

![Initial single-page website at commit a5af1af](/assets/img/blog/website-evolution/01-2022-10-29-a5af1af-initial.png)

### 2022-11-19 — Updated Profile Media (`482c71c`)

- **Commit:** `482c71c8cf4ae0af5cc391df9e482761d90cfc84`
- **Changed:** Swapped in updated images (`344f9db`) and updated `index.html`.

![Updated static site at commit 482c71c](/assets/img/blog/website-evolution/02-2022-11-19-482c71c-images.png)

---

## Era 2: Multi-Page Portfolio, Themes & Masonry Gallery (Sep–Oct 2024)

Nearly two years later I came back to turn the single bio page into a proper multi-page portfolio for my photography, AI generations, and coding projects.

### 2024-09-12 — Multi-Page Pivot (`3100417`)

- **Commit:** `3100417798070b70b011d18eca15db7462a59f1e`
- **Added:** Top navbar (`MY PORTFOLIO`, `Gallery`, `Projects`, `About`), separate `about.html`, and a two-column Photography & AI Generations showcase on the homepage (`assets/photo.jpg`, `assets/ai.jpg`).
- **Changed:** Moved everything into an `800px` centered container over `#0f0f0f`.

![Multi-page portfolio pivot at commit 3100417](/assets/img/blog/website-evolution/03-2024-09-12-3100417-multipage.png)

### 2024-09-13 — Multiple Themes & Hamburger Menu (`23bf997`)

- **Commit:** `23bf997de18a17cdac2ea4c04a7f3849459266b2`
- **Added:**
  - **Multiple themes:** CSS variables (`--clr-body-bg`, `--clr-body-text`, `--clr-navbar-bg`, `--clr-container-bg`) with `.dark`, `.light`, and `.catppuccin-dark`, wired to `#theme-switch` and `#theme-menu` in `script.js`.
  - **Hamburger menu:** Three-bar `.hamburger` icon that morphs into an `X` and slides out `.off-screen-menu` below `768px`.
  - **Font:** Added `JetBrainsMono-Regular.woff2`.

![Theme dropdown and Catppuccin Dark theme at commit 23bf997](/assets/img/blog/website-evolution/04-2024-09-13-23bf997-themes.png)

![Mobile hamburger menu drawer animation at commit 23bf997](/assets/img/blog/website-evolution/04-2024-09-13-23bf997-hamburger.gif)

### 2024-09-14 — Midnight Theme & Mobile Theme Picker (`457ac64`, `8556951`)

- **Commits:** `457ac64acb3a47049f3aadf00e38787e631d7002`, `8556951ccad88f60cc3a542ffb7cdd5317b89303`
- **Added:** `.midnight` theme, `localStorage` persistence, `JetBrainsMono-Bold.woff2`, and `#theme-switch-ham` so mobile users could switch themes inside the hamburger drawer.

![Midnight theme at commit 457ac64](/assets/img/blog/website-evolution/05-2024-09-14-457ac64-midnight.png)

### 2024-09-29 — Projects Page & Theme Fade (`a09294e`, `14d25cd`)

- **Commits:** `a09294e9fb88cc1d5472e7d11cb0a85d7221f6a6`, `14d25cd65680375c5980487b5f45af9efc5280d0`
- **Added:**
  - `/projects/` index and my first project write-up (`/projects/wallpapersync/`), plus early `/gallery/` scaffolding.
  - **Theme switching animation (v1):** `transition: 0.3s ease` on `body` (`14d25cd`) so theme switches faded smoothly instead of snapping.

![Projects directory at commit a09294e](/assets/img/blog/website-evolution/06-2024-09-29-a09294e-projects.png)

![CSS color-fade theme transition at commit 14d25cd](/assets/img/blog/website-evolution/06-2024-09-29-14d25cd-theme-fade.gif)

### 2024-10-01 — Mobile Tweaks & SCSS (`ff75ab6`)

- **Commit:** `ff75ab6b1ad0c432c3975f7d54178e0f412dd919`
- **Added:** `style.scss` and mobile layout fixes.

![Mobile layout tweaks at commit ff75ab6](/assets/img/blog/website-evolution/07-2024-10-01-ff75ab6-mobile.png)

### 2024-10-02 – 2024-10-03 — Expanding Gallery Navbar & Masonry Grid (`36aa3c4`, `c4a1ec5`)

- **Commits:** `36aa3c4ad73636df7e755da6e736bd805a4868d5`, `c4a1ec573162c0710217dbd95ea2a120ed9a1c5a`
- **Added:**
  - **Expanding gallery navbar:** `updateWidth()` in `script.js` widened `.navbar` and `.container` from `800px` to `calc(100vw - 10%)` on desktop `/gallery` and shrank it back over `500ms` on navigation. (This version was pretty buggy on Chromium and would randomly skip the animation.)
  - **Masonry gallery & tabs:** 3-column layouts for **Photography**, **AI-Generations**, and **Forza**, plus `sort.py` to order the images.

![Expanding gallery navigation bar and tab switcher at commit c4a1ec5](/assets/img/blog/website-evolution/08-2024-10-03-c4a1ec5-gallery-expand.gif)

### 2024-10-07 — Final Commit of the Old Layout (`609aaee`)

- **Commit:** `609aaee480448b4ed8eea395ee2a759620c2aec7`
- **Changed:** Last polish on the v1 static layout (`gallery/info` and `sort.py`).

![Final v1 layout at commit 609aaee](/assets/img/blog/website-evolution/09-2024-10-07-609aaee-v1-final.png)

---

## Era 3: Moving to Eleventy, Gallery Viewer & First Dithering (Feb 2026)

### 2026-02-16 – 2026-02-18 — Modular SCSS & Refined Layout (`c245929`, `98a5657`, `3c07ec9`)

- **Commits:** `c2459296a5cedd617961af55a2e8e382e9367730`, `98a565717bf1558d0708806000233e368b051174`, `3c07ec97fbceaa9025ae01e445bd9c3a0aa3af07`
- **Added:** Split CSS into `src/scss/` partials, added `package.json`, ESLint, and Prettier, refined `initLayoutWidth()` (`98a5657`), and extracted `navbar.njk` / `drawer.njk` (`3c07ec9`).
- **Removed:** Dropped the old `.dark` class in favor of dark defaults in `:root`.

### 2026-02-19 – 2026-02-21 — Eleventy (11ty), Markdown Reader & Syntax Highlighting (`19a69b7`, `389a620`, `755971d`)

- **Commits:** `19a69b78f1caecb4179bb6779e3f0367dcf95c8e`, `389a6209d2b37e3c1907e6526c7d9c5bf6d6ebe4`, `755971d3c8aa04049091d1d6c6146dc47f19dbcb`
- **Added:**
  - **11ty + GitHub Actions CI (`19a69b7`):** Automated static builds and GitHub Pages deploys.
  - **Markdown blog & project reader (`19a69b7`, `389a620`):** Converted guides (`/blog/blogs/windows-setup/`) and projects (`wallpapersync.md`) to Markdown with `_markdown.scss` styling and Prism syntax highlighting (`@11ty/eleventy-plugin-syntaxhighlight`).
- **Removed:** Deleted `src/scripts/sort.py` (`755971d`) once Nunjucks templates replaced manual HTML generation.

![Refined layout rendered by Eleventy at commit 19a69b7](/assets/img/blog/website-evolution/10-2026-02-19-19a69b7-refined.png)

![Eleventy Markdown blog reader at commit 389a620](/assets/img/blog/website-evolution/11-2026-02-21-389a620-markdown-reader.png)

### 2026-02-23 — View Transitions, Gallery Hover Action, Image Viewer & 5 Dev Themes (`a6cc5fd`, `602152d`, `3249933`)

- **Commits:** `a6cc5fdef378eff411b355dc7bc8dee910bd6c30`, `602152df04dbc2bce191f04dee4c768a6babea31`, `3249933632b86ed758ad01285d73a6ff6fd93c30`
- **Added:**
  - `@11ty/eleventy-img` WebP/JPEG pipeline and View Transitions API for gallery tab switching (`602152d`).
  - **Gallery hover action (`3249933`):** `eleventy.config.js` (`gimg` shortcode) read EXIF data via `sharp` + `exif-reader` to show camera device, date, resolution, file size, and a `View Details` button on hover.
  - **Gallery image viewer (`3249933`):** `src/_data/galleryImages.js` and `src/gallery/image.njk` generated `/gallery/image/<slug>/` detail pages with full EXIF tables and full-res downloads.
  - **Five developer themes (`3249933`):** **Dracula**, **Nord**, **Gruvbox Dark**, **Tokyo Night**, and **Solarized Light** with matching syntax highlighting tokens.
- **Removed:** Removed the `loading="lazy"` → `eager` preload workaround (`602152d`).

![Gallery image hover overlay reveal at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-gallery-hover.gif)

![Gallery image detail viewer at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-gallery-viewer.png)

![Tokyo Night developer theme at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-dev-themes.png)

### 2026-02-23 — First Dithered About Portrait (`6f86446`)

- **Commit:** `6f8644669502c4abe287f0cff20d54afb43ae10a`
- **Added:** Client-side `<canvas>` ordered dithering on the `/about/` portrait, mapped to the active theme's background and foreground colors.

![Dithered portrait on About page at commit 6f86446](/assets/img/blog/website-evolution/13-2026-02-23-6f86446-about-dither.png)

---

## Era 4: Cyberpunk Desktop OS & Splitting Into v2 + v3 (Jun–Sep 2026)

### 2026-06-10 – 2026-06-11 — Version 3.0 Desktop UI, Apps & Shell (`37d9138`, `14c08ac`, `e55fad4`, `a4d69f3`)

- **Commits:** `37d9138cfed11e8f4eb8d8d4b70fd8f2e04f5a99`, `14c08acf75040a609df0ef87d48a2927baccdf2c`, `e55fad4978406e7ad806c06d877aefe7cc223d69`, `a4d69f371783e46363593bf84a59af33eff33e0e`
- **Added:**
  - **CRT Desktop UI & TTY Shell (`37d9138`):** Boot screen, floating window manager, tiling TTY split shell (`shell.js`), build-time virtual filesystem (`src/_data/filesystem.js`), toggleable CRT bloom & scanline pulses, selection marquee (`14c08ac`), and Web Audio UI sounds (`a4d69f3`).
  - **Desktop UI Apps (`37d9138`, `e55fad4`):** **Console** (`terminal.js`), **File Explorer** (`file-explorer.js`), **Web Engine** browser (`browser.js`), **Gallery** (`gallery.js`), **PDF Viewer** (`pdf-viewer.js`), **Style Menu** (theme/wallpaper switcher + CRT toggle), and **Markdown Viewer** (`markdown-viewer.js`) with a **Preview / Source toggle** (`e55fad4`).
- **Removed:** Pruned the extra v2 themes back down to Light, Midnight, and Catppuccin (`14c08ac`).

![Desktop OS boot sequence, app launches, and TTY switch at commit e55fad4](/assets/img/blog/website-evolution/14-2026-06-11-e55fad4-desktop-boot-wm.gif)

![Desktop OS with File Explorer and Console windows at commit e55fad4](/assets/img/blog/website-evolution/14-2026-06-11-e55fad4-desktop-apps.png)

### 2026-09-15 – 2026-09-16 — Tailwind CSS v4 & Splitting v2 / v3 (`cf8866a`, `bca8d39`, `da5d50a`)

- **Commits:** `cf8866abfc1838d72b6f89963fdba80f9922a70f`, `bca8d39a2bb014e9a55574403c4c1b0d8e6c3ccd`, `da5d50a06300921c7cf826ad6b9a47ad4e725fa6`
- **Added:**
  - **Tailwind CSS v4 (`cf8866a`):** Replaced Sass with Tailwind CSS v4.
  - **Sticky Markdown TOC Reader (`bca8d39`):** Added `.markdown-layout` with a sticky left-margin Table of Contents (`.markdown-toc`) for long-form posts and project docs (polished with a slim scrollbar indicator in `cce65ec`).
  - **Dual-site split (`da5d50a`):** After buying [tasrif.dev](https://tasrif.dev) and deciding the site needed to look professional for recruiters, I split the architecture into a clean main site (`v2`) and kept `v3` (Desktop OS) as a toggleable gimmick behind a navbar button.

![Redesigned v2 homepage at commit da5d50a](/assets/img/blog/website-evolution/15-2026-09-16-da5d50a-dual-site.png)

![Sticky Markdown TOC reader on project documentation at commit da5d50a](/assets/img/blog/website-evolution/15-2026-09-16-da5d50a-markdown-toc.png)

### 2026-09-17 — Seamless Navbar Fix, Calendar App & `r/unixporn` Theme Ripple (`8ce4c53`, `65b9aec`, `20ec6c8`, `3342d11`)

- **Commits:** `8ce4c5349f2697fe3da16f9218a0898a0d19075b`, `65b9aec736d9c33d6664a67da3d4bd33d3d8bed7`, `20ec6c89e46cee5433be05e2e97b1a14a18b5c2f`, `3342d1128c4a13ffa7b96affdbb790f07f5fcc36`
- **Added:**
  - **Reliable gallery navbar expansion (`8ce4c53`):** Finally fixed the Chromium animation skip bug by saving gallery state in `sessionStorage` (`v2-was-gallery`) and applying `html.nav-starting-narrow` / `nav-starting-wide` before first paint, then releasing on double `requestAnimationFrame` so `.site-nav__inner` animates between `1100px` and `1360px` reliably.
  - **Calendar popup & `marked.js` Markdown Viewer (`65b9aec`):** Added status-bar calendar widget and replaced the custom Desktop OS Markdown parser with `marked.js`.
  - **Staggered gallery fade-in (`20ec6c8`)** and **PhosphorOS P1/P3 themes (`3342d11`)**.
  - **Circular View Transitions theme ripple (`3342d11`):** Clicking the Light/Dark toggle runs `document.startViewTransition` with a `clip-path: circle(...)` expanding from the click coordinates.
- **Removed:** Removed the v2 multi-accent dropdown picker in favor of static per-page accents + Light/Dark mode (`20ec6c8`), and moved raw gallery files out of `src/assets/` into `src/_gallery_source/` (`3342d11`).

![Seamless v2 navbar width expansion between Home and Gallery at commit 8ce4c53](/assets/img/blog/website-evolution/16-2026-09-17-8ce4c53-v2-nav-expand.gif)

![Circular View Transitions ripple on Light/Dark toggle at commit 3342d11](/assets/img/blog/website-evolution/17-2026-09-17-3342d11-theme-ripple.gif)

![PhosphorOS P3 Amber desktop at commit 3342d11](/assets/img/blog/website-evolution/17-2026-09-17-3342d11-phosphor-os.png)

---

## Era 5: Cyberspace Aesthetic, Bayer Dithering & Present Day (Nov 2026)

### 2026-11-24 — Fixed Amber Palette, Bayer Dithering, Skill Pool & ATS Resume PDF (`701a42b`, `67dee7e`, `3c7ed83`, `1456bc2`, `d98b6f0`)

- **Commits:** `701a42b4da01639998f52e2783268e1f87e0815c`, `67dee7eeb5a98ba5f6f5cdd7a0869a3a313b9140`, `3c7ed83db5b339e969a6a5476656a774dcc03611`, `1456bc2fd2762da430c26aa94c64138eb01f7027`, `d98b6f021eb0974ae66f22628992a923e794709d`
- **Added:**
  - **Fixed palette & [cyberspace.online](https://cyberspace.online)-inspired look (`701a42b`, `67dee7e`):** Locked in `#101110` charcoal + `#e5a93c` phosphor amber, build-time 4-level 8×8 Bayer `ditherThumb` thumbnails, breadcrumb navbar (`~/tasrif/...`), and `g+h/p/b/g/a` keyboard shortcuts.
  - **Real boot telemetry (`3c7ed83`):** Replaced filler Desktop OS boot lines with real asset and filesystem logs.
  - **Automated global `skillPool` (`1456bc2`):** `src/_data/skillPool.js` and `src/_data/lib/skills-shared.js` (`CANONICAL_META`) pull and normalize `skills:` frontmatter from `projects/*.md` into project cards, `/about/`, and skill filters.
  - **ATS Resume PDF & Markdown typography (`d98b6f0`):** `scripts/generate-resume-pdf.js` (`pdfkit` + `gray-matter`) builds `/assets/resume.pdf` directly from `about/index.md` and `skillPool`, alongside `IBM Plex Sans` prose, heading anchors, and code-block copy buttons.

![Phosphor-amber terminal homepage at commit d98b6f0](/assets/img/blog/website-evolution/18-2026-11-24-d98b6f0-amber-home.png)

![Automated skill pool matrix on About page at commit d98b6f0](/assets/img/blog/website-evolution/18-2026-11-24-d98b6f0-skill-pool.png)

### 2026-11-25 — Dithered Gallery Hover Scrim, Split Modes & Present State (`eeaece7`, `33fc19a`, `6dec425`)

- **Commits:** `eeaece7e859a49967ec3a47736e28f7e95e5e721`, `33fc19aa66608009fcb4bb7ed793b62c83fd75d4`, `6dec425ab4fa986c3fed3caf5160308e7d30aee1`
- **Added / Changed:**
  - **Dithered gallery hover overlay & Q90 JPEG pipeline (`eeaece7`, `33fc19a`):** Full-card clickable overlay (`> View Details`) with a dot-matrix dithered gradient scrim (`.gallery-item__overlay::before`) and single Q90 JPEG download generation.
  - **Clean dual-mode split (`6dec425`):** Renamed `src/v2/` → `src/site/` (`/`) and `src/v3/` → `src/desktop/` (`/desktop/`), switched UI icons to native inline SVGs, fixed Desktop OS window z-index stacking, and tuned syntax/inline code colors.
- **Removed:** Dropped `src/v2-redirect.njk` (`6dec425`) and unused font/image leftovers (`eeaece7`).

![Dithered dot-matrix gallery hover overlay animation at commit 33fc19a](/assets/img/blog/website-evolution/19-2026-11-25-33fc19a-gallery-hover.gif)

![Current main homepage at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-home.png)

![Current Gallery Image Viewer with EXIF metadata at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-gallery-viewer.png)

![Current PhosphorOS Desktop environment at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-desktop.png)

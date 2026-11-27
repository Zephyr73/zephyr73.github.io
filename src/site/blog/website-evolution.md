---
layout: base.njk
permalink: /blog/website-evolution/
title: 'How This Website Evolved: Inspirations & Dev Log (2022–2026)'
description: 'How zephyr73.github.io grew from a BRAC University HTML assignment into a dual-mode portfolio and PhosphorOS desktop, told through the ideas and commits behind each stage.'
tags: blogpost
bodyClass: no-markdown-dither
category: Development Log
date: 2026-11-25
---

# How This Website Evolved (2022–2026)

This is the story of how [zephyr73.github.io](https://zephyr73.github.io) grew from a single-file university assignment in 2022 into the dual-mode portfolio and virtual desktop running today. Rather than keeping a separate list of inspirations at the top, each idea sits alongside the commits where it actually took shape—with screenshots for static layouts and GIFs for animations.

---

## Era 1: The BRAC University Assignment (Oct–Nov 2022)

### First Lines of HTML (`323e46e` → `a5af1af` → `482c71c`)

I started this site back when I was studying at BRAC University. It began as a class assignment where we had to build a basic webpage with a photo, an about section, a grade table, hobbies, and a signature. I had zero web development experience at the time—I was just trying to get raw HTML and CSS to sit where I wanted.

On **October 28, 2022**, I initialized the repository from scratch (`323e46e` → `fb3c644`) with `index.html`, `style.css`, and self-hosted `Iosevka` `.woff2` fonts. A day later (`a5af1af`, **Oct 29**), the full single-page assignment (`YASEEN AAR RAHMAN`) went live on a plain `#cacaca` background, complete with an avatar, About Me blurb, Hobbies list, Educational Qualifications GPA table, handwritten signature, and links to GitHub, Facebook, and Twitter. Three weeks later (`482c71c`, **Nov 19**), I swapped in updated profile media (`344f9db`) and left the site untouched for nearly two years.

![Initial single-page website at commit a5af1af](/assets/img/blog/website-evolution/01-2022-10-29-a5af1af-initial.png)

![Updated static site at commit 482c71c](/assets/img/blog/website-evolution/02-2022-11-19-482c71c-images.png)

---

## Era 2: Multi-Page Portfolio, Endless Themes & Masonry Gallery (Sep–Oct 2024)

Nearly two years later, I came back wanting the site to be more than a one-off assignment. I wanted a real place to showcase my photography, AI generations, and coding projects—and to document my workflow so I wouldn't forget how I set things up.

### Turning One Page Into a Portfolio (`3100417`)

On **September 12, 2024** (`3100417`), I moved everything into an `800px` centered container on `#0f0f0f` and split the site into a multi-page layout with a top navbar (`MY PORTFOLIO`, `Gallery`, `Projects`, `About`), a dedicated `about.html`, and a two-column Photography & AI Generations showcase on the homepage.

Early on I wrote every line myself. When ChatGPT first came out it made plenty of mistakes, so I mostly used it to figure out what was broken and wrote the fixes by hand. Once GPT-3.5 arrived, though, things got a lot more fun: the whole site was still small enough to paste straight into a prompt and test out layout ideas quickly.

![Multi-page portfolio pivot at commit 3100417](/assets/img/blog/website-evolution/03-2024-09-12-3100417-multipage.png)

### Never Being Able to Pick One Color (`23bf997` → `457ac64` → `8556951`)

From the very beginning I could never settle on an accent color, which is the real reason themes kept piling up. On **September 13** (`23bf997`), I wired up CSS custom properties (`--clr-body-bg`, `--clr-body-text`, `--clr-navbar-bg`, `--clr-container-bg`) for `.dark`, `.light`, and `.catppuccin-dark`, paired with a `#theme-switch` dropdown, `JetBrainsMono-Regular.woff2`, and a three-bar `.hamburger` drawer that morphed into an `X` below `768px`. The very next day (`457ac64`, `8556951`, **Sep 14**), I added `.midnight`, `localStorage` persistence, `JetBrainsMono-Bold.woff2`, and `#theme-switch-ham` so mobile users could switch themes inside the drawer too.

![Theme dropdown and Catppuccin Dark theme at commit 23bf997](/assets/img/blog/website-evolution/04-2024-09-13-23bf997-themes.png)

![Mobile hamburger menu drawer animation at commit 23bf997](/assets/img/blog/website-evolution/04-2024-09-13-23bf997-hamburger.gif)

![Midnight theme at commit 457ac64](/assets/img/blog/website-evolution/05-2024-09-14-457ac64-midnight.png)

### Projects, Theme Fades & The Gallery Width Bug (`a09294e` → `609aaee`)

By **September 29** (`a09294e`, `14d25cd`), `/projects/` went live with my first write-up (`/projects/wallpapersync/`), alongside early `/gallery/` scaffolding and a `0.3s ease` fade on `body` so theme switches wouldn't snap abruptly. **October 1** (`ff75ab6`) brought `style.scss` and mobile layout fixes.

Then on **October 2–3** (`36aa3c4`, `c4a1ec5`), I built the 3-column masonry gallery (**Photography**, **AI-Generations**, **Forza**) ordered by `sort.py`, along with an expanding navbar: `updateWidth()` in `script.js` stretched `.navbar` and `.container` from `800px` to `calc(100vw - 10%)` on desktop `/gallery` and shrank it back over `500ms` on navigation. It looked great when it worked, though Chromium would randomly skip the animation—a quirk that ended up haunting the codebase for years. One last static polish landed on **October 7** (`609aaee`) before the next major jump.

![Projects directory at commit a09294e](/assets/img/blog/website-evolution/06-2024-09-29-a09294e-projects.png)

![CSS color-fade theme transition at commit 14d25cd](/assets/img/blog/website-evolution/06-2024-09-29-14d25cd-theme-fade.gif)

![Mobile layout tweaks at commit ff75ab6](/assets/img/blog/website-evolution/07-2024-10-01-ff75ab6-mobile.png)

![Expanding gallery navigation bar and tab switcher at commit c4a1ec5](/assets/img/blog/website-evolution/08-2024-10-03-c4a1ec5-gallery-expand.gif)

![Final v1 layout at commit 609aaee](/assets/img/blog/website-evolution/09-2024-10-07-609aaee-v1-final.png)

---

## Era 3: Automating With Eleventy, Image EXIF & First Dithering (Feb 2026)

### Outgrowing Hand-Edited HTML (`c245929` → `19a69b7` → `755971d`)

Even though my site doesn't look like [gwern.net](https://gwern.net) or use its heavy framework, reading it pushed me to document things properly and learn a static-site generator instead of editing raw HTML by hand.

Between **February 16 and 18, 2026** (`c245929`, `98a5657`, `3c07ec9`), I broke the CSS into `src/scss/` partials, added `package.json`, ESLint, and Prettier, refined `initLayoutWidth()`, dropped `.dark` in favor of `:root` dark defaults, and extracted `navbar.njk` / `drawer.njk`. From **February 19 to 21** (`19a69b7`, `389a620`, `755971d`), I migrated the build to **Eleventy (11ty)** with GitHub Actions CI, converted guides (`windows-setup.md`) and project write-ups (`wallpapersync.md`) into Markdown with Prism syntax highlighting (`@11ty/eleventy-plugin-syntaxhighlight`), and deleted `sort.py` once Nunjucks templates took over.

![Refined layout rendered by Eleventy at commit 19a69b7](/assets/img/blog/website-evolution/10-2026-02-19-19a69b7-refined.png)

![Eleventy Markdown blog reader at commit 389a620](/assets/img/blog/website-evolution/11-2026-02-21-389a620-markdown-reader.png)

### EXIF Viewer, Five Dev Themes & First Dithering (`a6cc5fd` → `3249933` → `6f86446`)

On **February 23** (`a6cc5fd`, `602152d`, `3249933`), I added an `@11ty/eleventy-img` WebP/JPEG pipeline with View Transitions for gallery tab switching, dropped the old `lazy` → `eager` preload hack, and wired `gimg` in `eleventy.config.js` (`sharp` + `exif-reader`) so hovering a gallery frame revealed camera device, date, resolution, file size, and a `View Details` link to `/gallery/image/<slug>/`. Still unable to pick a single accent, I added five developer themes (**Dracula**, **Nord**, **Gruvbox Dark**, **Tokyo Night**, **Solarized Light**) and even gave different pages different accents.

Later that same day (`6f86446`), I finally got a long-time Linux ricing favorite working: client-side `<canvas>` ordered dithering on the `/about/` portrait, dynamically mapped to the active theme's background and foreground colors.

![Gallery image hover overlay reveal at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-gallery-hover.gif)

![Gallery image detail viewer at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-gallery-viewer.png)

![Tokyo Night developer theme at commit 3249933](/assets/img/blog/website-evolution/12-2026-02-23-3249933-dev-themes.png)

![Dithered portrait on About page at commit 6f86446](/assets/img/blog/website-evolution/13-2026-02-23-6f86446-about-dither.png)

---

## Era 4: Cyberpunk Desktop OS & Splitting Into v2 + v3 (Jun–Sep 2026)

### When the Desktop OS _Was_ the Site (`37d9138` → `e55fad4` → `a4d69f3`)

In **June 2026** (`37d9138`, `14c08ac`, `e55fad4`, `a4d69f3`), I leaned all the way into cyberpunk, neon terminals, and old IBM CRT monitors with green phosphor text. I built Version 3.0 as an interactive virtual desktop complete with a boot screen, floating window manager, tiling TTY split shell (`shell.js`), a build-time virtual filesystem (`src/_data/filesystem.js`), toggleable CRT bloom and scanline pulses, selection marquee (`14c08ac`), and Web Audio UI sounds (`a4d69f3`).

It shipped with full apps—**Console**, **File Explorer**, **Web Engine** browser, **Gallery**, **PDF Viewer**, a **Style Menu**, and a **Markdown Viewer** with a Preview/Source toggle (`e55fad4`)—while pruning the extra v2 themes back down to Light, Midnight, and Catppuccin (`14c08ac`). At that point, this desktop GUI _was_ the main website.

![Desktop OS boot sequence, app launches, and TTY switch at commit e55fad4](/assets/img/blog/website-evolution/14-2026-06-11-e55fad4-desktop-boot-wm.gif)

![Desktop OS with File Explorer and Console windows at commit e55fad4](/assets/img/blog/website-evolution/14-2026-06-11-e55fad4-desktop-apps.png)

### Buying `tasrif.dev` and Splitting v2 / v3 (`cf8866a` → `da5d50a`)

Once I bought [tasrif.dev](https://tasrif.dev) and started preparing my portfolio for recruiters, reality hit: a boot-screen desktop OS wasn't going to cut it as the landing page. On **September 15–16, 2026** (`cf8866a`, `bca8d39`, `da5d50a`), I swapped Sass for Tailwind CSS v4 (`cf8866a`), added `.markdown-layout` with a sticky left-margin Table of Contents (`bca8d39`, later polished in `cce65ec`), and split the architecture cleanly (`da5d50a`): the clean, recruiter-friendly site (`v2`) became `/` while `v3` (Desktop OS) became a toggleable gimmick behind a button in the navbar.

![Redesigned v2 homepage at commit da5d50a](/assets/img/blog/website-evolution/15-2026-09-16-da5d50a-dual-site.png)

![Sticky Markdown TOC reader on project documentation at commit da5d50a](/assets/img/blog/website-evolution/15-2026-09-16-da5d50a-markdown-toc.png)

### Squashing Years-Old Bugs & the `r/unixporn` Ripple (`8ce4c53` → `3342d11`)

Around August and September 2026, newer models like Gemini and Claude—alongside agent tools like OpenCode and Antigravity—helped me redesign rough corners and finally fix bugs I'd been stuck on since 2024. On **September 17** (`8ce4c53`), we squashed the Chromium gallery navbar animation bug for good by saving gallery state in `sessionStorage` (`v2-was-gallery`), applying `nav-starting-narrow` / `nav-starting-wide` before first paint, and releasing on double `requestAnimationFrame`.

That same day added a taskbar calendar widget and `marked.js` in the Desktop Markdown Viewer (`65b9aec`), staggered gallery fade-ins and static per-page accents (`20ec6c8`), PhosphorOS P1/P3 themes (`3342d11`), and a circular View Transitions ripple (`clip-path: circle(...)` expanding from click coordinates) inspired directly by wallpaper-switch animations on [r/unixporn](https://www.reddit.com/r/unixporn/). Raw gallery sources also moved out of `src/assets/` into `src/_gallery_source/` (`3342d11`).

![Seamless v2 navbar width expansion between Home and Gallery at commit 8ce4c53](/assets/img/blog/website-evolution/16-2026-09-17-8ce4c53-v2-nav-expand.gif)

![Circular View Transitions ripple on Light/Dark toggle at commit 3342d11](/assets/img/blog/website-evolution/17-2026-09-17-3342d11-theme-ripple.gif)

![PhosphorOS P3 Amber desktop at commit 3342d11](/assets/img/blog/website-evolution/17-2026-09-17-3342d11-phosphor-os.png)

---

## Era 5: Cyberspace Aesthetic, Bayer Dithering & Present Day (Nov 2026)

### Sticking to One Palette, `cyberspace.online` & Automated Tooling (`701a42b` → `d98b6f0`)

The current aesthetic is heavily inspired by [cyberspace.online](https://cyberspace.online), a small retro forum styled after 90s BBSes and terminals that uses dithered imagery everywhere. On **November 24, 2026** (`701a42b`, `67dee7e`), I finally forced myself to stick to a fixed color palette (`#101110` warm charcoal + `#e5a93c` phosphor amber), added build-time 4-level 8×8 Bayer `ditherThumb` thumbnails, a breadcrumb navbar (`~/tasrif/...`), and `g+h/p/b/g/a` keyboard chords.

Alongside the visual lock-in, Desktop OS got real boot telemetry (`3c7ed83`), `skillPool` (`1456bc2`) began automatically normalizing `skills:` frontmatter across `projects/*.md` into project cards, `/about/`, and filters, and `scripts/generate-resume-pdf.js` (`d98b6f0`) started building `/assets/resume.pdf` straight from `about/index.md`—alongside `IBM Plex Sans` prose, heading anchors, and code-block copy buttons.

![Phosphor-amber terminal homepage at commit d98b6f0](/assets/img/blog/website-evolution/18-2026-11-24-d98b6f0-amber-home.png)

![Automated skill pool matrix on About page at commit d98b6f0](/assets/img/blog/website-evolution/18-2026-11-24-d98b6f0-skill-pool.png)

### Finishing Touches With Gemini 4 Hydrogen (`eeaece7` → `33fc19a` → `6dec425`)

By **November 25** (`eeaece7`, `33fc19a`, `6dec425`), the current build came together with Gemini 4 Hydrogen, which finally nailed the exact look I'd been chasing the whole time. We added a dot-matrix dithered hover scrim (`.gallery-item__overlay::before`) and single Q90 JPEG download generation (`eeaece7`, `33fc19a`), renamed `src/v2/` → `src/site/` and `src/v3/` → `src/desktop/` (`6dec425`), switched UI icons to inline SVGs, fixed Desktop OS window z-index stacking, and removed `src/v2-redirect.njk` and leftover assets.

![Dithered dot-matrix gallery hover overlay animation at commit 33fc19a](/assets/img/blog/website-evolution/19-2026-11-25-33fc19a-gallery-hover.gif)

![Current main homepage at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-home.png)

![Current Gallery Image Viewer with EXIF metadata at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-gallery-viewer.png)

![Current PhosphorOS Desktop environment at commit 6dec425](/assets/img/blog/website-evolution/20-2026-11-25-6dec425-desktop.png)

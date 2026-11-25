# AGENTS.md

## Project

Eleventy 3.x static site (ESM). Dual-version personal portfolio: **V2** (traditional NJK pages at `/`) and **V3** (interactive virtual desktop SPA at `/v3/`).

## Structure

- `src/` — source root (Eleventy `input`)
- `src/v2/` — V2 pages, layouts in `src/v2/_includes/`, default layout via `v2.11tydata.json` (homepage permalinks to `/`)
- `src/v2/css/` — V2 Tailwind entrypoint (`style.css`) + layered CSS partials (7-1 architecture)
- `src/v3/` — V3 entrypoint (`index.njk`, `layout: false`, permalinks to `/v3/`)
- `src/v3/css/` — V3 Tailwind entrypoint (`desktop.css`) + cyberpunk desktop partials
- `src/_data/` — Eleventy global data (`filesystem.js` generates virtual FS tree for V3)
- `src/assets/` — static assets (JS, CSS, images, fonts) copied through via passthrough
- `src/_gallery_source/` — gallery source images (photography, AI, forza subdirs; kept out of the passthrough so raw files are not deployed)
- `src/assets/js/v3/` — V3 ES module scripts (shell.js entry, desktop, terminal, filesystem, apps)
- `_site/` — build output (gitignored)

## Commands

```bash
npm install          # install deps
npm run dev          # eleventy --serve + tailwind --watch (concurrent)
npm run build        # eleventy only (NO CSS compilation)
npm run build:css    # compile CSS with Tailwind CLI (must run separately or before build)
npm run watch:css    # tailwind --watch (CSS only)
npm run lint:js      # ESLint (all *.js, ignores _site/)
npm run format       # Prettier write (**/*.{html,js,css,md})
```

**Important**: `npm run build` does NOT compile CSS. To get a full site, run `npm run build:css` then `npm run build`, or just use `npm run dev` which handles both.

## CSS Build

Two Tailwind v4 entrypoints compiled by `tailwindcss` CLI (not Eleventy):

- `src/v2/css/style.css` → `src/assets/css/style.css`
- `src/v3/css/desktop.css` → `src/assets/css/desktop.css`

Both entries import Tailwind (`@import 'tailwindcss'`) and scan content via `@source './src'` / `@source './src/v3'`. V2 styles use `@layer components` so Tailwind utilities can override them during incremental conversion; `@theme` blocks forward the runtime theme custom properties (e.g. `--color-bg: var(--clr-body-bg)`) so utilities follow theme switching.

Compiled CSS files are **gitignored** — do not commit them. Prettier also ignores them.

## Gallery Images

Use the `gimg` Nunjucks async shortcode in V2 templates:

```
{% gimg "photography/photo.jpg", "alt text", "eager", "high" %}
```

Generates WebP + JPEG at 400/800/1200/1800 widths with `<picture>` srcset. Processes EXIF for device name overlay. Images must be in `src/_gallery_source/<subdir>/`.

## Linting / Formatting

- **ESLint**: flat config (`eslint.config.mjs`). Rules: `eqeqeq` error, `curly` multi-line error, `no-undef` error, `no-unused-vars` warn, `no-console` warn. Ignores `_site/`.
- **Prettier**: semicolons, single quotes, 2-space indent, 100 printWidth. Ignores `node_modules`, `_site`, `package-lock.json`, compiled CSS.

## Key Quirks

- V3 uses `layout: false` — it's a raw HTML entrypoint, not a V2 layout.
- `filesystem.js` scans `src/` at build time and injects a virtual FS tree into V3 via `window.__FS_TREE__`.
- `sharp` and `exif-reader` are used by the `gimg` shortcode for image processing (listed in devDeps).
- V2 raw markdown files are passed through to `_site/` for V3's markdown viewer to fetch client-side.

## Project Skill Pool

V2 builds a global skill pool (`skillPool`) from `skills:` frontmatter in `src/v2/projects/*.md` via `src/_data/skillPool.js`.

When creating or editing a project markdown file in `src/v2/projects/`:

1. **Check existing skills first:** Read `CANONICAL_META` in `src/_data/lib/skills-shared.js` (and existing `src/v2/projects/*.md` files) and reuse exact canonical skill names (e.g., `REST APIs`, `SQLite`, `Proxmox VE`, `CLI`) instead of inventing variants.
2. **Add new skills cleanly:** If a project introduces a skill not yet in `CANONICAL_META`, add it to the project's `skills:` frontmatter list **and** add an entry in `CANONICAL_META` (`src/_data/lib/skills-shared.js`) with its canonical display name and category (`Languages & Runtime`, `Infrastructure & Systems`, `Networking & Security`, `APIs & Automation`, `Systems & Hardware`, or `Data & Tooling`).
3. Keep `tags: project` in project frontmatter for Eleventy's `collections.project`.
4. **Manual overrides (`src/v2/about/index.md`):** Use `skillOverrides.add` (strings or `{ name, category }` objects) to include skills not tied to public projects, and `skillOverrides.remove` to exclude project skills from the global pool (`/about/`, `resume.pdf`).

## Blog Posts

Blog posts in `src/v2/blog/*.md` must include `tags: blogpost` in frontmatter so Eleventy's `collections.blogpost` surfaces them on `/blog/` and the homepage `Recent Writing` list.

## Incremental Build & Image Cache

- `npm run clean` (`scripts/clean.js`) preserves `_site/assets/img/gallery/` (including `.meta-cache.json`) and `_site/assets/img/dither/` so warm rebuilds skip re-encoding unchanged images.
- Run `node scripts/clean.js --all` when a full clean rebuild of all processed images is needed.

## Dithered Thumbnails & Prettier

- **1-Bit Bayer Thumbnails (`ditherThumb` in `eleventy.config.js`):** Use `{% ditherThumb "src/assets/img/photo.jpg", "alt", 120, 76 %}` to generate 2-color Bayer PNGs in `_site/assets/img/dither/`. Keep output dimensions 1:1 with the rendered CSS container to avoid downscaling moiré on mobile.
- **Prettier `.njk` Exclusion (`.prettierignore`):** `*.njk` is intentionally ignored because Prettier's HTML parser fails on Nunjucks blocks inside HTML attributes. Do not remove `*.njk` from `.prettierignore`.

## V3 Window & Tile Manager

- `src/assets/js/v3/shell.js` manages a shared `openWindows` pool across Desktop (Windows-style floating) and Shell (Linux-style tiling inside `#tty-split-pane`).
- Switching modes auto-floats or auto-tiles open windows unless explicitly pinned as `ttyFloating: true` via `[POP]` / `Alt+F`.
- Any new V3 app should attach an optional `cleanup()` method on its root element so `closeWindow()` can tear down listeners cleanly.

## Resume PDF Generator

- `scripts/generate-resume-pdf.js` uses `pdfkit` + `gray-matter` to build an ATS/OCR-friendly, single-column US Letter PDF at `_site/assets/resume.pdf` directly from `src/v2/about/index.md` frontmatter and normalized project skills (`src/v2/projects/*.md`).
- It runs automatically via `eleventy.after` in `eleventy.config.js` on every build, and can also be run standalone with `npm run build:pdf`.

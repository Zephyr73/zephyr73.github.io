# AGENTS.md

## Project

Eleventy 3.x static site (ESM). Dual-mode personal portfolio: **Basic Website** (`src/site/`, served at `/`) and **Desktop OS** (`src/desktop/`, interactive virtual desktop SPA at `/desktop/`).

## Structure

- `src/` — source root (Eleventy `input`)
- `src/site/` — main website pages, layouts & partials in `src/site/_includes/` (homepage permalinks to `/`)
- `src/site/css/` — website Tailwind entrypoint (`style.css`) + layered CSS partials (7-1 architecture)
- `src/desktop/` — Desktop OS entrypoint (`index.njk`, `layout: false`, permalinks to `/desktop/`)
- `src/desktop/css/` — Desktop OS Tailwind entrypoint (`desktop.css`) + terminal desktop partials
- `src/_data/` — Eleventy global data (`filesystem.js` generates virtual FS tree for Desktop OS)
- `src/assets/` — static assets (JS, CSS, images, fonts) copied through via passthrough
- `src/_gallery_source/` — gallery source images (photography, AI, forza subdirs; kept out of the passthrough so raw files are not deployed)
- `src/assets/js/desktop/` — Desktop OS ES module scripts (shell.js entry, desktop, terminal, filesystem, apps)
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

- `src/site/css/style.css` → `src/assets/css/style.css`
- `src/desktop/css/desktop.css` → `src/assets/css/desktop.css`

Both entries import Tailwind (`@import 'tailwindcss'`) and scan content via `@source` (`src/site/` and `src/desktop/` + `src/assets/js/desktop/`). Site styles use `@layer components` so Tailwind utilities can override them; `@theme` blocks forward the runtime theme custom properties (e.g. `--color-bg: var(--clr-body-bg)`) so utilities follow theme switching.

Compiled CSS files are **gitignored** — do not commit them. Prettier also ignores them.

## Gallery Images

Use the `gimg` Nunjucks async shortcode in Site templates:

```
{% gimg "photography/photo.jpg", "alt text", "eager", "high" %}
```

Generates responsive WebP variants (`400/800/1200/1800` widths) + a single Q90 JPEG download file (`largestWidth.jpeg`). Processes EXIF for device name overlay. Images must be in `src/_gallery_source/<subdir>/`.

## Linting / Formatting

- **ESLint**: flat config (`eslint.config.mjs`). Rules: `eqeqeq` error, `curly` multi-line error, `no-undef` error, `no-unused-vars` warn, `no-console` warn. Ignores `_site/`.
- **Prettier**: semicolons, single quotes, 2-space indent, 100 printWidth. Ignores `node_modules`, `_site`, `package-lock.json`, compiled CSS.

## Key Quirks

- Desktop OS (`src/desktop/index.njk`) uses `layout: false` — it's a raw HTML entrypoint, not a Site layout.
- `filesystem.js` scans `src/` at build time and injects a virtual FS tree into Desktop OS via `window.__FS_TREE__`.
- `sharp` and `exif-reader` are used by the `gimg` shortcode for image processing (listed in devDeps).
- Site raw markdown files are passed through to `_site/` for Desktop OS's markdown viewer to fetch client-side.

## Project Skill Pool

Eleventy builds a global skill pool (`skillPool`) from `skills:` frontmatter in `src/site/projects/*.md` via `src/_data/skillPool.js`.

When creating or editing a project markdown file in `src/site/projects/`:

1. **Check existing skills first:** Read `CANONICAL_META` in `src/_data/lib/skills-shared.js` (and existing `src/site/projects/*.md` files) and reuse exact canonical skill names (e.g., `REST APIs`, `SQLite`, `Proxmox VE`, `CLI`) instead of inventing variants.
2. **Add new skills cleanly:** If a project introduces a skill not yet in `CANONICAL_META`, add it to the project's `skills:` frontmatter list **and** add an entry in `CANONICAL_META` (`src/_data/lib/skills-shared.js`) with its canonical display name and category (`Languages & Runtime`, `Infrastructure & Systems`, `Networking & Security`, `APIs & Automation`, `Systems & Hardware`, or `Data & Tooling`).
3. Keep `tags: project` in project frontmatter for Eleventy's `collections.project`.
4. **Manual overrides (`src/site/about/index.md`):** Use `skillOverrides.add` (strings or `{ name, category }` objects) to include skills not tied to public projects, and `skillOverrides.remove` to exclude project skills from the global pool (`/about/`, `resume.pdf`).

## Blog Posts

Blog posts in `src/site/blog/*.md` must include `tags: blogpost` in frontmatter so Eleventy's `collections.blogpost` surfaces them on `/blog/` and the homepage `Recent Writing` list.

## Incremental Build & Image Cache

- `npm run clean` (`scripts/clean.js`) preserves `_site/assets/img/gallery/` (including `.meta-cache.json`) and `_site/assets/img/dither/` so warm rebuilds skip re-encoding unchanged images.
- Run `node scripts/clean.js --all` when a full clean rebuild of all processed images is needed.

## Dithered Thumbnails & Prettier

- **4-Level Bayer Thumbnails (`ditherThumb` in `eleventy.config.js`):** Use `{% ditherThumb "src/assets/img/photo.jpg", "alt", 120, 76 %}` to generate 4-color 8x8 Bayer PNGs in `_site/assets/img/dither/`. Keep output dimensions 1:1 with the rendered CSS container to avoid downscaling moiré on mobile.
- **Prettier `.njk` Exclusion (`.prettierignore`):** `*.njk` is intentionally ignored because Prettier's HTML parser fails on Nunjucks blocks inside HTML attributes. Do not remove `*.njk` from `.prettierignore`.

## Desktop OS Window & Tile Manager

- `src/assets/js/desktop/shell.js` manages a shared `openWindows` pool across Desktop (Windows-style floating) and Shell (Linux-style tiling inside `#tty-split-pane`).
- Switching modes auto-floats or auto-tiles open windows unless explicitly pinned as `ttyFloating: true` via `[POP]` / `Alt+F`.
- Any new Desktop OS app should attach an optional `cleanup()` method on its root element so `closeWindow()` can tear down listeners cleanly.

## Resume PDF Generator

- `scripts/generate-resume-pdf.js` uses `pdfkit` + `gray-matter` to build an ATS/OCR-friendly, single-column US Letter PDF at `_site/assets/resume.pdf` directly from `src/site/about/index.md` frontmatter and normalized project skills (`src/site/projects/*.md`).
- It runs automatically via `eleventy.after` in `eleventy.config.js` on every build, and can also be run standalone with `npm run build:pdf`.

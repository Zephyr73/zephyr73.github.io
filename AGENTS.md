# AGENTS.md

## Project

Eleventy 3.x static site (ESM). Dual-version personal portfolio: **V2** (traditional NJK pages at `/v2/`) and **V3** (interactive virtual desktop SPA at `/`).

## Structure

- `src/` — source root (Eleventy `input`)
- `src/v2/` — V2 pages, layouts in `src/v2/_includes/`, default layout via `v2.11tydata.json`
- `src/v2/css/` — V2 Tailwind entrypoint (`style.css`) + layered CSS partials (7-1 architecture)
- `src/v3/` — V3 entrypoint (`index.njk`, `layout: false`, permalinks to `/`)
- `src/v3/css/` — V3 Tailwind entrypoint (`desktop.css`) + cyberpunk desktop partials
- `src/_data/` — Eleventy global data (`filesystem.js` generates virtual FS tree for V3)
- `src/assets/` — static assets (JS, CSS, images, fonts) copied through via passthrough
- `src/assets/img/gallery/` — gallery source images (photography, AI, forza subdirs)
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

Generates WebP + JPEG at 400/800/1200/1800 widths with `<picture>` srcset. Processes EXIF for device name overlay. Images must be in `src/assets/img/gallery/<subdir>/`.

## Linting / Formatting

- **ESLint**: flat config (`eslint.config.mjs`). Rules: `eqeqeq` error, `curly` multi-line error, `no-undef` error, `no-unused-vars` warn, `no-console` warn. Ignores `_site/`.
- **Prettier**: semicolons, single quotes, 2-space indent, 100 printWidth. Ignores `node_modules`, `_site`, `package-lock.json`, compiled CSS.

## Key Quirks

- V3 uses `layout: false` — it's a raw HTML entrypoint, not a V2 layout.
- `filesystem.js` scans `src/` at build time and injects a virtual FS tree into V3 via `window.__FS_TREE__`.
- `sharp` and `exif-reader` are used by the `gimg` shortcode for image processing (listed in devDeps).
- V2 raw markdown files are passed through to `_site/` for V3's markdown viewer to fetch client-side.

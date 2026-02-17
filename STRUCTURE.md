# Site structure

This layout keeps pages, assets, and source code separate so you can add sections (e.g. blog, more projects) without clutter. For **class and ID naming conventions** (BEM-style, page context, JS hooks), see **[docs/NAMING.md](docs/NAMING.md)**.

## Folder layout

```
/
├── index.html              # Home
├── about/
│   └── index.html
├── gallery/
│   ├── index.html
│   ├── index_test.html
│   └── info/
│       └── index.html
├── projects/
│   ├── index.html
│   └── wallpapersync/
│       └── index.html
├── blog/
│   └── index.html          # Placeholder; add posts here later
├── assets/                 # All static files (CSS, JS, images, fonts)
│   ├── css/
│   │   └── style.css       # Compiled; do not edit by hand
│   ├── js/
│   │   └── script.js
│   ├── img/
│   │   ├── gallery/
│   │   │   ├── photography/
│   │   │   ├── ai/
│   │   │   └── forza/
│   │   ├── profile.png
│   │   └── ...
│   └── fonts/
│       └── *.woff2
└── src/                    # Source only (not served as-is)
    ├── scss/
    │   ├── style.scss      # Main entry; compile to assets/css/style.css
    │   ├── _variables.scss
    │   ├── _fonts.scss
    │   ├── _base.scss
    │   ├── _nav.scss
    │   ├── _layout.scss
    │   ├── _page-*.scss
    │   └── _media-queries.scss
    └── scripts/
        └── sort.py         # Gallery: sort/rename images and regenerate gallery HTML
```

## Gallery (dynamic)

1. Add images to `assets/img/gallery/photography`, `assets/img/gallery/ai`, or `assets/img/gallery/forza`.
2. From repo root run: `python src/scripts/sort.py`
3. The script sorts images (EXIF date for photography, mtime for ai/forza), renames them to `1.jpg`, `2.jpg`, … in place, and replaces the three column blocks inside `gallery/index.html` with the new image markup.

## Adding a new page

1. Create a folder and `index.html`, e.g. `blog/my-post/index.html`.
2. Reuse the same `<head>` (assets paths) and nav block from any existing page.
3. Set `<body class="page page--pagename" data-page="pagename">` and add `src/scss/_page-pagename.scss` if you need page-specific styles.
4. In `src/scss/style.scss`, add `@use 'page-pagename';` and compile.

## Build

From the repo root:

```bash
npx sass src/scss/style.scss assets/css/style.css
```

Optional: `--watch` to recompile on save.

## Asset paths in HTML

- CSS: `/assets/css/style.css`
- JS: `/assets/js/script.js`
- Fonts: `/assets/fonts/…`
- Images: `/assets/img/…` (e.g. `/assets/img/gallery/photography/1.jpg`)

Always use root-relative paths (starting with `/`) so links work from any page depth.

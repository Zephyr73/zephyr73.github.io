# Site structure

This layout keeps all source files, assets, and project code inside the `src` directory, keeping the root clean. For **class and ID naming conventions**, see **[docs/NAMING.md](docs/NAMING.md)**.

## Folder layout

```
/
├── .eleventy.js            # Configuration
├── src/                    # All source content and assets
│   ├── index.html          # Home
│   ├── _includes/          # Layouts and partials
│   ├── about/              # About page
│   ├── blog/               # Blog posts
│   ├── projects/           # Project pages
│   ├── gallery/            # Gallery pages
│   ├── assets/             # Static assets (images, fonts, scripts, COMPILED CSS)
│   │   ├── css/
│   │   │   └── style.css   # Compiled from SCSS
│   │   ├── js/
│   │   ├── img/
│   │   └── fonts/
│   └── scss/               # Stylesheets (modularized)
│       ├── style.scss      # Main entry
│       ├── abstracts/
│       ├── base/
│       ├── components/
│       ├── layout/
│       ├── pages/
│       └── vendors/
├── _site/                  # Built output (ready for deployment)
├── package.json            # Scripts and dependencies
└── .gitignore              # Repository settings
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
# Compile CSS
npm run build:css

# Build Site
npm run build
```

## Asset paths in HTML

Always use root-relative paths (starting with `/`) so links work from any page depth. Eleventy is configured to copy the contents of `src/assets` directly to `_site/assets`.

- CSS: `/assets/css/style.css`
- JS: `/assets/js/script.js`
- Fonts: `/assets/fonts/…`
- Images: `/assets/img/…`

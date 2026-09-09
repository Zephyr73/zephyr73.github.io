# Site Structure — Quick Reference

> 📖 **For comprehensive documentation**, see **[docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md)**
> 📝 **For BEM naming conventions**, see **[docs/NAMING.md](docs/NAMING.md)**

This is a quick reference for the project structure. All source files live in `src/`, built files go to `_site/`.

## Folder Layout

```text
/
├── eleventy.config.js        # Eleventy configuration
├── package.json              # Scripts and dependencies
├── docs/                     # Documentation
│   ├── DEVELOPER-GUIDE.md    # Comprehensive guide
│   └── NAMING.md             # BEM naming conventions
│
└── src/                      # SOURCE FILES
    │
    ├── v2/                   # ── V2: Traditional portfolio website ──
    │   ├── index.html        # V2 homepage  →  /v2/
    │   ├── v2.11tydata.json  # Directory data defaults (layout: base.njk)
    │   ├── _includes/        # V2 layouts & partials
    │   │   ├── base.njk      # Main layout template
    │   │   ├── navbar.njk    # Navigation bar
    │   │   ├── drawer.njk    # Mobile menu drawer
    │   │   └── footer.njk    # Footer
    │   ├── about/            # About/Resume page  →  /about/
    │   ├── blog/             # Blog pages
    │   │   ├── index.njk     # Blog listing  →  /blog/
    │   │   └── blogs/        # Blog posts (markdown)
    │   ├── gallery/          # Gallery pages
    │   │   ├── index.njk     # Gallery grid  →  /gallery/
    │   │   └── image.njk     # Image detail  →  /gallery/image/{slug}/
    │   ├── projects/         # Projects pages
    │   │   ├── index.njk     # Project listing  →  /projects/
    │   │   └── */            # Project pages (markdown)
    │   └── scss/             # V2 SCSS (7-1 pattern)
    │       ├── style.scss    # Entry point  →  compiles to assets/css/style.css
    │       ├── abstracts/    # Variables, mixins
    │       ├── base/         # Resets, fonts, typography
    │       ├── components/   # Nav, tables, markdown
    │       ├── layout/       # Layout patterns
    │       ├── pages/        # Page-specific styles
    │       ├── themes/       # Color themes
    │       └── vendors/      # Third-party styles (syntax highlighting)
    │
    ├── v3/                   # ── V3: OS-style interactive desktop ──
    │   ├── index.njk         # V3 desktop SPA  →  / (site root)
    │   └── scss/
    │       └── desktop.scss  # V3 styles  →  compiles to assets/css/desktop.css
    │
    ├── _data/                # Shared 11ty global data files
    │   ├── filesystem.js     # Builds virtual file tree for V3 navigator
    │   └── galleryImages.js  # Reads EXIF & generates gallery image data
    │
    └── assets/               # Shared static assets (copied as-is to _site/)
        ├── css/              # Compiled CSS (build artifacts — do not edit)
        │   ├── style.css     # V2 compiled stylesheet
        │   └── desktop.css   # V3 compiled stylesheet
        ├── js/
        │   ├── script.js     # V2 JavaScript (nav, themes, gallery, dither)
        │   └── v3/           # V3 JavaScript modules
        │       ├── shell.js          # Main V3 app entry point
        │       ├── desktop.js        # Desktop icon/window management
        │       ├── terminal.js       # TTY shell emulator
        │       ├── navigation-pane.js# File tree navigator
        │       ├── filesystem.js     # Client-side FS utils
        │       └── apps/             # App implementations
        │           ├── browser.js    # Browser app (embeds V2 via iframe)
        │           ├── file-explorer.js
        │           ├── gallery.js
        │           ├── markdown-viewer.js
        │           └── pdf-viewer.js
        ├── img/              # Images (gallery in img/gallery/)
        ├── fonts/            # Web fonts (JetBrains Mono)
        └── data/             # Static data files (about_me.md etc.)
```

## Quick Start Commands

```bash
# Development (Eleventy server + SCSS watcher)
npm run dev

# Production Build
npm run build:css      # 1. Compile both V2 and V3 SCSS
npm run build          # 2. Build site

# Code Quality
npm run format         # Format with Prettier
npm run lint           # Lint JavaScript

# Gallery Management
python src/scripts/sort.py   # Sort & rename gallery images (if script exists)
```

> **Note:** The gallery now uses an Eleventy shortcode (`{% gimg %}`) that automatically
> generates responsive images at build time. See `eleventy.config.js` for details.

## Common Tasks

### Working on V2 (traditional portfolio)

All V2 source files are under **`src/v2/`**:

- **Templates/pages**: `src/v2/{about,blog,gallery,projects}/`
- **Layouts**: `src/v2/_includes/`
- **Styles**: `src/v2/scss/` (edit SCSS, run `npm run build:css` to compile)
- **JavaScript**: `src/assets/js/script.js`

### Working on V3 (OS desktop)

All V3 source files are under **`src/v3/`** and **`src/assets/js/v3/`**:

- **Entry page**: `src/v3/index.njk`
- **Styles**: `src/v3/scss/desktop.scss`
- **App logic**: `src/assets/js/v3/`

### Adding a Blog Post

1. Create `src/v2/blog/blogs/my-post.md`
2. Add front matter:
   ```yaml
   ---
   layout: base.njk
   permalink: /blog/blogs/my-post/
   title: My Post Title
   description: Short description
   tags: blogpost
   date: 2024-01-01
   ---
   ```
3. Build site — appears on `/blog/` automatically

### Adding a Project

1. Create `src/v2/projects/my-project/my-project.md`
2. Add front matter:
   ```yaml
   ---
   layout: base.njk
   permalink: /projects/my-project/
   title: My Project
   description: Short description
   tags: project
   ---
   ```
3. Build site — appears on `/projects/` automatically

### Adding a New V2 Page

1. Create `src/v2/pagename/index.html` with front matter:
   ```yaml
   ---
   layout: base.njk
   permalink: /pagename/
   title: Page Title
   bodyClass: page--pagename
   pageId: pagename
   ---
   ```
2. Add page-specific styles (optional):
   - Create `src/v2/scss/pages/_page-pagename.scss`
   - Import in `src/v2/scss/style.scss`
   - Run `npm run build:css`

### Managing Gallery Images

1. Add images to `src/assets/img/gallery/[photography|ai|forza]/`
2. Run `python src/scripts/sort.py` from repo root
3. Script sorts by date and renames to `1.jpg, 2.jpg, ...`
4. Rebuild site

## Important Rules

### Asset Paths

**Always use root-relative paths** (starting with `/`):

```html
<!-- ✅ Correct -->
<link href="/assets/css/style.css" rel="stylesheet" />
<img src="/assets/img/photo.jpg" alt="Photo" />
<a href="/blog">Blog</a>

<!-- ❌ Wrong -->
<link href="assets/css/style.css" rel="stylesheet" />
<img src="../assets/img/photo.jpg" alt="Photo" />
```

### Page Classes

Use BEM-style classes for pages:

```html
<body class="page page--home" data-page="home">
  <body class="page page--gallery" data-page="gallery"></body>
</body>
```

See [docs/NAMING.md](docs/NAMING.md) for complete conventions.

### Explicit Permalinks (Required for v2/ pages)

All pages under `src/v2/` **must** have an explicit `permalink` in their front matter to control the output URL. Without it, 11ty would prefix the URL with `/v2/`.

## Tech Stack

- **Static Site Generator:** Eleventy v3.1.2
- **Templating:** Nunjucks
- **Styling:** SCSS (V2 uses 7-1 pattern; V3 is a single file)
- **JavaScript:** ES Modules (V3), Vanilla JS (V2)
- **Utilities:** Python (gallery management)

## URL Map

| Source File                 | Output URL               |
| --------------------------- | ------------------------ |
| `src/v3/index.njk`          | `/`                      |
| `src/v2/index.html`         | `/v2/`                   |
| `src/v2/about/index.html`   | `/about/`                |
| `src/v2/gallery/index.njk`  | `/gallery/`              |
| `src/v2/gallery/image.njk`  | `/gallery/image/{slug}/` |
| `src/v2/blog/index.njk`     | `/blog/`                 |
| `src/v2/blog/blogs/*.md`    | `/blog/blogs/{name}/`    |
| `src/v2/projects/index.njk` | `/projects/`             |
| `src/v2/projects/**/*.md`   | `/projects/{name}/`      |

## Need More Help?

- **Comprehensive guide:** [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md)
- **BEM naming:** [docs/NAMING.md](docs/NAMING.md)
- **Eleventy docs:** https://www.11ty.dev/docs/

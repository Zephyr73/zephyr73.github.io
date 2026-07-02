# Developer Guide

**Last Updated:** February 22, 2026

This document provides a comprehensive overview of the portfolio website architecture, build system, and development workflow. Use this as your primary reference for understanding how the site works and how to extend it.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Build System](#build-system)
4. [Templating System](#templating-system)
5. [Styling Architecture](#styling-architecture)
6. [JavaScript Features](#javascript-features)
7. [Content Management](#content-management)
8. [Gallery System](#gallery-system)
9. [Development Workflow](#development-workflow)
10. [Naming Conventions](#naming-conventions)
11. [Adding New Content](#adding-new-content)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Tech Stack

- **Static Site Generator:** Eleventy (11ty) v3.1.2
- **Templating Engine:** Nunjucks (.njk files)
- **Styling:** SCSS with modular architecture
- **Build Tools:** npm scripts, Sass compiler, concurrently
- **Utilities:** Python for gallery image management
- **Code Quality:** ESLint, Prettier

### Core Concepts

1. **Source-Output Pattern:**
   - Source files in `src/`
   - Built files in `_site/` (deployable)
   - Assets copied through passthrough

2. **Content Types:**
   - Static HTML pages (index, gallery, about)
   - Dynamic collections (blog posts, projects)
   - Layouts and partials (Nunjucks templates)

3. **Theme System:**
   - CSS custom properties for theming
   - localStorage persistence
   - Multiple themes: light, midnight, catppuccin-dark

---

## Project Structure

```
/
├── eleventy.config.js       # Eleventy configuration
├── package.json             # Dependencies and scripts
├── eslint.config.mjs        # Linting rules
├── STRUCTURE.md             # High-level structure reference
│
├── src/                     # SOURCE FILES
│   ├── index.html           # Homepage
│   ├── _includes/           # Layouts & partials
│   │   ├── base.njk         # Main layout template
│   │   ├── navbar.njk       # Desktop navigation
│   │   ├── drawer.njk       # Mobile drawer menu
│   │   └── footer.njk       # Footer (if used)
│   │
│   ├── about/
│   │   └── index.html       # About/Resume page
│   │
│   ├── blog/
│   │   ├── index.njk        # Blog listing page
│   │   └── blogs/           # Individual blog posts (.md)
│   │       ├── blog1.md
│   │       └── windows-setup.md
│   │
│   ├── projects/
│   │   ├── index.njk        # Projects listing page
│   │   └── wallpapersync/
│   │       └── wallpapersync.md
│   │
│   ├── gallery/
│   │   └── index.html       # Gallery with tabs
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css    # Compiled CSS (from SCSS)
│   │   ├── js/
│   │   │   └── script.js    # Main JavaScript
│   │   ├── img/
│   │   │   └── gallery/     # Gallery images
│   │   │       ├── photography/
│   │   │       ├── ai/
│   │   │       └── forza/
│   │   └── fonts/
│   │       ├── JetBrainsMono-Regular.woff2
│   │       └── JetBrainsMono-Bold.woff2
│   │
│   ├── scss/                # SCSS source files
│   │   ├── style.scss       # Main entry point
│   │   ├── abstracts/
│   │   │   └── _variables.scss    # CSS custom properties
│   │   ├── base/
│   │   │   ├── _base.scss         # Global base styles
│   │   │   └── _fonts.scss        # Font definitions
│   │   ├── components/
│   │   │   ├── _nav.scss          # Navigation styles
│   │   │   └── _markdown.scss     # Markdown content styles
│   │   ├── layout/
│   │   │   ├── _layout.scss       # Layout utilities
│   │   │   └── _media-queries.scss
│   │   ├── pages/
│   │   │   ├── _page-home.scss
│   │   │   ├── _page-about.scss
│   │   │   ├── _page-gallery.scss
│   │   │   └── _page-wallpapersync.scss
│   │   └── vendors/
│   │       └── _syntax.scss       # Syntax highlighting
│   │
│   └── scripts/
│       └── sort.py          # Gallery image sorter
│
├── _site/                   # OUTPUT (built by Eleventy)
│   └── [mirrored structure]
│
└── docs/                    # Documentation
    ├── NAMING.md            # BEM naming conventions
    └── DEVELOPER-GUIDE.md   # This file
```

---

## Build System

### Configuration Files

#### `eleventy.config.js`

```javascript
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';

export default function (eleventyConfig) {
  // Copy assets folder as-is to output
  eleventyConfig.addPassthroughCopy('src/assets');

  // Watch for changes in assets for live reload
  eleventyConfig.addWatchTarget('./src/assets/');

  // Add syntax highlighting plugin
  eleventyConfig.addPlugin(syntaxHighlight);

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
    },
  };
}
```

**Key Points:**
- Assets are copied directly (passthrough)
- Live reload watches asset changes
- Syntax highlighting for code blocks
- Input/output directories configured

#### `package.json` Scripts

```json
{
  "scripts": {
    "build": "npx @11ty/eleventy",
    "build:css": "sass src/scss/style.scss src/assets/css/style.css --no-source-map",
    "watch:css": "sass --watch src/scss/style.scss src/assets/css/style.css",
    "dev": "concurrently \"npm:start\" \"npm:watch:css\"",
    "start": "npx @11ty/eleventy --serve",
    "format": "prettier --write \"**/*.{html,js,css,scss,md}\"",
    "lint:js": "eslint \"**/*.js\"",
    "lint": "npm run lint:js"
  }
}
```

**Usage:**
- `npm run dev` - Development mode (Eleventy server + SCSS watcher)
- `npm run build` - Production build (run `build:css` first!)
- `npm run build:css` - Compile SCSS only
- `npm run format` - Format all code with Prettier
- `npm run lint` - Lint JavaScript files

---

## Templating System

### Base Template (`src/_includes/base.njk`)

The main layout template that wraps all pages.

**Features:**
1. **Font Preloading:** Preloads JetBrains Mono fonts
2. **Theme Script:** Inline script prevents FOUC (Flash of Unstyled Content)
3. **Dynamic Body Classes:** `page page--{pageId}`
4. **Markdown Wrapper:** Conditional wrapper for styled content
5. **Includes:** Navbar, drawer, footer

**Front Matter Variables:**
```yaml
---
layout: base.njk           # Use this template
title: "Page Title"        # Browser tab title
bodyClass: "page--custom"  # Additional body class
pageId: "custom"           # Used for data-page attribute
noMarkdownWrapper: true    # Skip markdown-content wrapper (optional)
description: "SEO desc"    # Meta description (optional)
---
```

### Layout Partials

1. **`navbar.njk`** - Desktop navigation with theme picker dropdown
2. **`drawer.njk`** - Mobile hamburger menu with navigation and theme options
3. **`footer.njk`** - Footer component (if used)

### Collections

Eleventy automatically creates collections based on tags:

```markdown
---
tags: blogpost    # Creates collections.blogpost
---
```

**Collection Usage in Templates:**
```nunjucks
{% for post in collections.blogpost | reverse %}
  <h2>{{ post.data.title }}</h2>
  <a href="{{ post.url }}">Read more</a>
{% endfor %}
```

---

## Styling Architecture

### SCSS Structure (7-1 Pattern)

```
scss/
├── style.scss          # Main entry: imports all partials
├── abstracts/          # Variables, mixins (no output)
├── base/               # Reset, typography, base elements
├── components/         # Reusable components (nav, buttons)
├── layout/             # Layout patterns (grid, header)
├── pages/              # Page-specific styles
└── vendors/            # Third-party styles (syntax highlighting)
```

### Theme System

**Variables:** `src/scss/abstracts/_variables.scss`

```scss
:root {
  --clr-body-bg: #0f0f0f;
  --clr-body-text: #cacaca;
  --clr-navbar-bg: #0f0f0f;
  --clr-navbar-text: #cacaca;
  --clr-container-bg: #1b1b1b;
  /* ... more variables ... */
}

.light {
  --clr-body-bg: #cacaca;
  --clr-body-text: #0f0f0f;
  /* ... overrides ... */
}

.midnight {
  /* ... theme overrides ... */
}

.catppuccin-dark {
  /* ... theme overrides ... */
}
```

**Usage in Components:**
```scss
body {
  background-color: var(--clr-body-bg);
  color: var(--clr-body-text);
}
```

### Adding a New Theme

1. Add theme class in `_variables.scss`:
   ```scss
   .my-theme {
     --clr-body-bg: #...;
     --clr-body-text: #...;
     /* override all theme variables */
   }
   ```

2. Update theme pickers in:
   - `src/_includes/navbar.njk` (desktop dropdown)
   - `src/_includes/drawer.njk` (mobile options)

3. No JavaScript changes needed (theme system is dynamic)

---

## JavaScript Features

### Main Script (`src/assets/js/script.js`)

**Sections:**
1. Navigation (hamburger menu)
2. Theme system (dropdown & drawer, localStorage)
3. Gallery tabs (photography/AI/Forza)

### Navigation

```javascript
// Hamburger toggle
const hamTrigger = document.querySelector('.site-nav__hamburger');
const drawer = document.querySelector('.site-nav__drawer');

hamTrigger.addEventListener('click', () => {
  hamTrigger.classList.toggle('active');
  drawer.classList.toggle('active');
});
```

### Theme System

**Flow:**
1. Inline script in `<head>` reads localStorage
2. Sets `data-theme-pending` before CSS loads (prevents FOUC)
3. On DOMContentLoaded, applies theme to `body.className`
4. User selection saves to localStorage

**Key Function:**
```javascript
function applyTheme(themeKey) {
  document.body.className = getBodyPageClass() + ' ' + themeKey;
  localStorage.setItem('theme', themeKey);
}
```

### Gallery Tabs

**HTML Structure:**
```html
<button class="gallery-tabs__btn">Photography</button>
<!-- Three gallery-grid containers -->
<div class="gallery-grid gallery-grid--photography"></div>
<div class="gallery-grid gallery-grid--ai"></div>
<div class="gallery-grid gallery-grid--forza"></div>
```

**JavaScript:**
- Shows/hides grids with `.is-visible` class
- Adds `.is-active` to current tab button
- Supports URL hash (`#ai-container`)

---

## Content Management

### Adding a Blog Post

1. **Create Markdown file:** `src/blog/blogs/my-post.md`

2. **Add front matter:**
   ```markdown
   ---
   layout: base.njk
   title: My Post Title
   description: Short description for the blog listing
   tags: blogpost
   date: 2026-02-22
   ---

   # My Post Title

   Content here...
   ```

3. **Build:** Post automatically appears on `/blog/`

### Adding a Project

1. **Create Markdown file:** `src/projects/my-project/my-project.md`

2. **Add front matter:**
   ```markdown
   ---
   layout: base.njk
   title: My Project
   description: Project description
   tags: project
   date: 2026-02-22
   ---

   # My Project

   Project content...
   ```

3. **Build:** Project automatically appears on `/projects/`

### Adding a Static Page

1. **Create file:** `src/contact/index.html`

2. **Use base layout:**
   ```html
   ---
   layout: base.njk
   title: Contact Me
   bodyClass: page--contact
   pageId: contact
   ---

   <h1>Contact</h1>
   <p>Your content...</p>
   ```

3. **Add navigation link** (optional):
   - Edit `navbar.njk` and `drawer.njk`

4. **Add page-specific styles** (optional):
   - Create `src/scss/pages/_page-contact.scss`
   - Import in `src/scss/style.scss`: `@use 'pages/page-contact';`

---

## Gallery System

### How It Works

The gallery uses a Python script to automatically:
1. Sort images by date (EXIF for photography, mtime for AI/Forza)
2. Rename to sequential numbers (1.jpg, 2.jpg, ...)
3. Regenerate HTML in `gallery/index.html`
4. Distribute images across 3 columns for masonry layout

### Adding Gallery Images

1. **Add images to folder:**
   ```
   src/assets/img/gallery/photography/  (for EXIF sorting)
   src/assets/img/gallery/ai/           (for mtime sorting)
   src/assets/img/gallery/forza/        (for mtime sorting)
   ```

2. **Run sort script from repo root:**
   ```bash
   python src/scripts/sort.py
   ```

3. **Review changes:**
   - Images renamed in place
   - `src/gallery/index.html` updated with new HTML

4. **Build and test:**
   ```bash
   npm run build
   ```

### Gallery Script Details (`src/scripts/sort.py`)

**Functions:**
- `get_image_exif_date()` - Extracts EXIF date from photo
- `sort_images_by_date()` - Sorts photography by EXIF
- `sort_images_by_modification_date()` - Sorts AI/Forza by mtime
- `rename_images()` - Renames to 1.jpg, 2.jpg, ... (temp rename to avoid conflicts)
- `generate_new_columns_html()` - Creates 3-column HTML markup
- `update_gallery_html()` - Replaces sections in gallery/index.html

**Important:** The script uses regex to find and replace sections between:
```html
<!-- START: photography -->
...
<!-- END: photography -->
```

Do not remove these markers!

---

## Development Workflow

### Starting Development

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start dev server with SCSS watcher
npm run dev

# Opens browser at http://localhost:8080
# Auto-reloads on changes to src/
```

### Making Changes

**HTML/Nunjucks:**
- Edit files in `src/`
- Eleventy auto-rebuilds on save
- Browser auto-reloads

**SCSS:**
- Edit files in `src/scss/`
- Sass watcher auto-compiles to `src/assets/css/style.css`
- Browser auto-reloads (Eleventy watches `src/assets/`)

**JavaScript:**
- Edit `src/assets/js/script.js`
- Browser auto-reloads (Eleventy watches `src/assets/`)

**Gallery Images:**
- Add images to `src/assets/img/gallery/[photography|ai|forza]/`
- Run `python src/scripts/sort.py`
- Reload browser manually

### Building for Production

```bash
# 1. Compile CSS
npm run build:css

# 2. Build site
npm run build

# Output in _site/ ready to deploy
```

### Code Quality

```bash
# Format all code
npm run format

# Lint JavaScript
npm run lint
```

---

## Naming Conventions

See **[docs/NAMING.md](NAMING.md)** for complete BEM guidelines.

**Quick Reference:**

### Page Classes
```html
<body class="page page--home" data-page="home">
<body class="page page--gallery" data-page="gallery">
<body class="page page--blog" data-page="blog">
```

### Component Classes (BEM)
```
Block:              .site-nav
Element:            .site-nav__brand
Element:            .site-nav__hamburger
Modifier:           .site-nav--sticky

State class:        .is-active, .is-visible, .is-open
```

### File Naming
- Layouts: `base.njk`, `navbar.njk`
- SCSS partials: `_variables.scss`, `_nav.scss`
- Pages: `index.html`, `index.njk`

---

## Adding New Content

### New Blog Post
```bash
# 1. Create file
src/blog/blogs/my-new-post.md

# 2. Add front matter with tags: blogpost
# 3. Build - appears on /blog/ automatically
```

### New Project
```bash
# 1. Create folder and file
src/projects/my-project/my-project.md

# 2. Add front matter with tags: project
# 3. Build - appears on /projects/ automatically
```

### New Theme
```scss
// 1. Add theme class in src/scss/abstracts/_variables.scss
.my-new-theme {
  --clr-body-bg: #...;
  --clr-body-text: #...;
  /* ... all theme variables ... */
}

// 2. Update navbar.njk and drawer.njk with new option
// 3. No JS changes needed!
```

### New Page-Specific Styles
```bash
# 1. Create SCSS partial
src/scss/pages/_page-mypage.scss

# 2. Import in src/scss/style.scss
@use 'pages/page-mypage';

# 3. Compile CSS
npm run build:css
```

---

## Troubleshooting

### Issue: Changes not showing up

**Solutions:**
1. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
2. Check terminal for build errors
3. Verify file is in `src/` (not `_site/`)
4. Ensure SCSS compiled: `npm run build:css`

### Issue: SCSS not compiling

**Solutions:**
1. Check for syntax errors in SCSS files
2. Restart watcher: Stop dev server, run `npm run dev` again
3. Manual compile: `npm run build:css`
4. Check `src/scss/style.scss` has all imports

### Issue: Theme not persisting

**Solutions:**
1. Check browser localStorage (DevTools > Application > Local Storage)
2. Verify theme key matches class name exactly
3. Check console for JavaScript errors
4. Ensure `script.js` loaded properly

### Issue: Gallery images in wrong order

**Solutions:**
1. Re-run `python src/scripts/sort.py`
2. Check EXIF data exists for photography (use `exiftool` to verify)
3. For AI/Forza, check file modification times
4. Rebuild site after script: `npm run build`

### Issue: Blog post not appearing

**Checklist:**
- [ ] File is `.md` in `src/blog/blogs/`
- [ ] Has `tags: blogpost` in front matter
- [ ] Has valid front matter YAML (check for syntax errors)
- [ ] Site rebuilt after adding: `npm run build`

### Issue: Navigation links not working

**Solutions:**
1. Check URL paths use root-relative paths (`/gallery` not `gallery`)
2. Verify page exists in `_site/` after build
3. Check Eleventy output for errors during build

---

## Asset Paths

**Always use root-relative paths** (starting with `/`):

```html
<!-- ✅ Correct -->
<link href="/assets/css/style.css" rel="stylesheet">
<img src="/assets/img/photo.jpg" alt="Photo">
<a href="/blog">Blog</a>

<!-- ❌ Wrong -->
<link href="assets/css/style.css" rel="stylesheet">
<img src="../assets/img/photo.jpg" alt="Photo">
<a href="blog">Blog</a>
```

**Why?** Root-relative paths work from any page depth:
- `/` (home)
- `/blog/` (blog index)
- `/blog/my-post/` (blog post)

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server + SCSS watcher

# Building
npm run build:css        # Compile SCSS only
npm run build            # Build entire site

# Code Quality
npm run format           # Format with Prettier
npm run lint             # Lint JavaScript

# Gallery
python src/scripts/sort.py   # Sort & rename gallery images

# Dependencies
npm install              # Install all dependencies
npm update               # Update dependencies
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `eleventy.config.js` | Eleventy configuration |
| `package.json` | Scripts, dependencies |
| `src/_includes/base.njk` | Main layout template |
| `src/_includes/navbar.njk` | Desktop navigation |
| `src/_includes/drawer.njk` | Mobile menu |
| `src/assets/js/script.js` | All JavaScript features |
| `src/scss/style.scss` | SCSS entry point |
| `src/scss/abstracts/_variables.scss` | Theme variables |
| `src/scripts/sort.py` | Gallery image manager |
| `docs/NAMING.md` | BEM naming conventions |

---

## Next Steps for Development

### Recommended Improvements

1. **Testing:**
   - Add automated tests
   - Test theme switching across browsers
   - Validate accessibility (ARIA, keyboard nav)

2. **Performance:**
   - Add image optimization (sharp plugin)
   - Implement lazy loading for gallery
   - Consider critical CSS extraction

3. **Features:**
   - Add search functionality
   - Implement RSS feed for blog
   - Add social sharing meta tags

4. **Documentation:**
   - Keep this guide updated
   - Document custom functions/mixins
   - Add component documentation

5. **Build Improvements:**
   - Add production minification
   - Implement cache busting for assets
   - Consider deployment automation

---

## Resources

- **Eleventy Docs:** https://www.11ty.dev/docs/
- **Nunjucks Docs:** https://mozilla.github.io/nunjucks/
- **Sass Docs:** https://sass-lang.com/documentation/
- **BEM Methodology:** https://getbem.com/
- **Project Conventions:** [docs/NAMING.md](NAMING.md)

---

**Questions or Issues?**
Refer to this guide first, then check Eleventy docs. For project-specific questions, review the actual source code with comments.

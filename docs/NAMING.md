# Naming conventions

This project uses **BEM-style** class names and **semantic IDs** only where JS or landmarks need them. All paths and selectors are consistent so another developer can extend the site easily.

## Page context

- **Body:** One class `page` plus a modifier `page--{name}`.
  - Examples: `page page--home`, `page page--about`, `page page--gallery`, `page page--blog`.
- **Main content wrapper:** `page__content` (replaces the old generic "container").
- **SCSS:** Page-specific styles use `.page--home`, `.page--about`, etc., not `#home` or `#about`.

## Blocks and elements

| Purpose               | Block                          | Elements / modifiers                                                                                                                                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Site header/nav**   | `site-nav`                     | `site-nav__brand`, `site-nav__actions`, `site-nav__links`, `site-nav__drawer`, `site-nav__drawer-item`, `site-nav__hamburger`                                             |
| **Hamburger icon**    | `hamburger`                    | `hamburger__bar` (the three lines). State: `.hamburger.is-open`                                                                                                           |
| **Theme switcher**    | `theme-picker`                 | `theme-picker__menu` (desktop dropdown), `theme-picker__drawer-options` (mobile drawer). IDs kept for JS: `#theme-switch`, `#theme-switch-ham`, `#theme-menu`             |
| **Home feature rows** | `feature-row`                  | `feature-row__media`, `feature-row__body`. Modifier: `feature-row--reverse` (image on right)                                                                              |
| **About section**     | `about`                        | `about__avatar`, `about__hobbies`, `about__signature`, `about__footer`, `about__footer-links`, `about__separator`                                                         |
| **Gallery**           | `gallery-tabs`, `gallery-grid` | `gallery-tabs__btn`, `gallery-grid__column`. Modifiers: `gallery-grid--photography`, `gallery-grid--ai`, `gallery-grid--forza`. Visible panel: `.gallery-grid.is-visible` |
| **Code blocks**       | `code-block`                   | Wraps `<pre><code>` on project pages                                                                                                                                      |

## Utilities

- `u-hidden` – hide (opacity/pointer-events).
- `u-warning` – warning/alert text style.

## IDs (use sparingly)

- **Theme UI (JS):** `theme-switch`, `theme-switch-ham`, `theme-menu`.
- **Optional landmarks:** e.g. `profile` only if you need a single in-page target; otherwise prefer classes like `about__avatar`.

## Data attributes

- `data-theme` – theme key on theme-picker links (e.g. `data-theme="dark"`). JS reads this to switch body theme class.
- `data-src` – used for lazy-loaded images (e.g. `img.lazyload`).

## Rules of thumb

1. **Classes** – Describe the component and its part/modifier (BEM); avoid generic names like "container" or "box".
2. **IDs** – Only for unique JS hooks or one-off landmarks; don’t style by ID.
3. **Body** – Use `page page--{name}` for page-specific layout; keep theme class (e.g. `.dark`) separate.
4. **JS** – Prefer `querySelector('.block__element')` or `getElementById` only where the ID is required.

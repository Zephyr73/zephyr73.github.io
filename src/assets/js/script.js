// Navigation: hamburger menu (opens drawer)
const hamTrigger = document.querySelector('.site-nav__hamburger');
const drawer = document.querySelector('.site-nav__drawer');

if (hamTrigger && drawer) {
  hamTrigger.addEventListener('click', () => {
    hamTrigger.classList.toggle('active');
    drawer.classList.toggle('active');
    // Lock page scrolling when drawer is open
    const isDrawerOpen = drawer.classList.contains('active');
    document.documentElement.classList.toggle('no-scroll', isDrawerOpen);
    document.body.classList.toggle('no-scroll', isDrawerOpen);
  });
}

// Theme: dropdown (desktop), drawer theme panel, persistence
const themeMenu = document.querySelector('.theme-picker__menu');
const themeSwitch = document.querySelector('.site-nav__theme-toggle');
const themeSwitchHam = document.querySelector('.site-nav__theme-toggle--drawer');
const themeOptions = document.querySelectorAll('.theme-picker__menu a');
const themeDrawerOptions = document.querySelector('.theme-picker__drawer-options');
const drawerNavItems = document.querySelectorAll('.site-nav__drawer-item');

function applyTheme(themeKey) {
  if (!themeKey) {
    return;
  }
  // Remove any existing theme classes without touching unrelated classes (e.g. no-scroll).
  // Snapshot first (Array.from) because DOMTokenList is live — mutating it while
  // iterating with forEach can cause entries to be skipped.
  Array.from(document.documentElement.classList)
    .filter((cls) => cls !== 'no-scroll')
    .forEach((cls) => document.documentElement.classList.remove(cls));
  document.documentElement.classList.add(themeKey);
  localStorage.setItem('theme', themeKey);
  // Re-dither the avatar using the new theme's colours
  ditherAvatar();
}

// Desktop theme dropdown
if (themeSwitch && themeMenu) {
  themeSwitch.addEventListener('click', () => {
    const isOpen = themeMenu.style.display === 'block';
    themeMenu.style.display = isOpen ? 'none' : 'block';
    themeSwitch.setAttribute('aria-expanded', String(!isOpen));
  });
}

window.addEventListener('click', (e) => {
  if (
    themeMenu &&
    !e.target.closest('.site-nav__theme-toggle') &&
    !e.target.closest('.theme-picker__menu')
  ) {
    themeMenu.style.display = 'none';
    if (themeSwitch) themeSwitch.setAttribute('aria-expanded', 'false');
  }
});

themeOptions.forEach((option) => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    applyTheme(e.target.getAttribute('data-theme'));
  });
});

// Drawer: toggle between nav links and theme options
let themePanelVisible = false;
if (themeSwitchHam && themeDrawerOptions && drawerNavItems.length) {
  themeSwitchHam.addEventListener('click', () => {
    themePanelVisible = !themePanelVisible;
    drawerNavItems.forEach((item) => {
      item.style.display = themePanelVisible ? 'none' : 'block';
    });
    themeDrawerOptions.style.display = themePanelVisible ? 'block' : 'none';
    themeDrawerOptions.style.opacity = themePanelVisible ? '1' : '0';
    themeDrawerOptions.style.pointerEvents = themePanelVisible ? 'auto' : 'none';
  });
}

document.querySelectorAll('.theme-picker__drawer-options a').forEach((option) => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    applyTheme(e.target.getAttribute('data-theme'));
    if (themeDrawerOptions) {
      themeDrawerOptions.style.display = 'none';
    }
    themePanelVisible = false;
    drawerNavItems.forEach((item) => {
      item.style.display = 'block';
    });
  });
});

// Gallery Page: Width Animation and Tabs
const GALLERY_SECTIONS = {
  Photography: '.gallery-grid--photography',
  'AI-Generations': '.gallery-grid--ai',
  Forza: '.gallery-grid--forza',
};

function initGallery() {
  const isGalleryPage = document.body.classList.contains('page--gallery');
  if (!isGalleryPage) {
    return;
  }

  // 1. Width Animation
  // Use View Transitions API so the max-width change is handled by the GPU compositor
  // (avoids layout recalculations on every frame — the cause of Chromium jank).
  //
  // If the inline script in base.njk already applied is-expanded (arriving from
  // the gallery detail page), skip the animation entirely — it was handled before
  // first paint so there is nothing left to animate.
  if (!document.body.classList.contains('is-expanded')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (document.startViewTransition) {
          document.startViewTransition(() => {
            document.body.classList.add('is-expanded');
          });
        } else {
          document.body.classList.add('is-expanded');
        }
      });
    });
  }

  // Intercept internal links to animate width back before navigating.
  // Exception: links into the gallery detail zone share the same width,
  // so we navigate directly without collapsing first.
  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // Internal navigation link (not a hash anchor, not external, not empty)
      if (href && href.startsWith('/') && !href.startsWith('#')) {
        // Navigating within the gallery zone — preserve expanded width
        if (href.startsWith('/gallery/')) {
          return; // let the browser navigate normally, no collapse
        }
        e.preventDefault();
        if (document.startViewTransition) {
          // transition.finished resolves when the exit animation completes
          const transition = document.startViewTransition(() => {
            document.body.classList.remove('is-expanded');
          });
          transition.finished.then(() => {
            window.location.href = href;
          });
        } else {
          document.body.classList.remove('is-expanded');
          setTimeout(() => {
            window.location.href = href;
          }, 500);
        }
      }
    });
  });

  // 2. Tabs Fade Animation
  const buttons = document.querySelectorAll('.gallery-tabs__btn');
  if (!buttons.length) {
    return;
  }

  const containers = {};
  Object.entries(GALLERY_SECTIONS).forEach(([name, selector]) => {
    const el = document.querySelector(selector);
    if (el) {
      containers[name] = el;
    }
  });

  let isAnimating = false;

  function show(name) {
    if (isAnimating) {
      return;
    }

    const currentActiveBtn = document.querySelector('.gallery-tabs__btn.is-active');
    const currentActiveName = currentActiveBtn ? currentActiveBtn.textContent.trim() : null;

    if (currentActiveName === name) {
      return;
    }

    isAnimating = true;

    // Update buttons immediately
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.textContent.trim() === name);
    });

    const newEl = containers[name];
    const oldEl = currentActiveName ? containers[currentActiveName] : null;

    if (oldEl) {
      // Fade out old
      oldEl.style.opacity = '0';

      setTimeout(() => {
        oldEl.classList.remove('is-visible');
        oldEl.style.display = 'none';

        // Show and fade in new
        if (newEl) {
          newEl.style.display = 'flex';
          // Force reflow
          newEl.offsetHeight;
          newEl.classList.add('is-visible');
          newEl.style.opacity = '1';
        }

        setTimeout(() => {
          isAnimating = false;
        }, 150); // Wait for fade in
      }, 150); // Wait for fade out (matches CSS transition)
    } else {
      // Initial load (no old element to fade out)
      if (newEl) {
        newEl.style.display = 'flex';
        newEl.offsetHeight;
        newEl.classList.add('is-visible');
        newEl.style.opacity = '1';
      }
      isAnimating = false;
    }
  }

  // Initial setup: hide all, then show based on hash or default
  Object.values(containers).forEach((el) => {
    if (el) {
      el.classList.remove('is-visible');
      el.style.display = 'none';
      el.style.opacity = '0';
    }
  });

  const hash = window.location.hash;
  if (hash === '#ai-container') {
    show('AI-Generations');
  } else {
    show('Photography');
  }

  buttons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      show(button.textContent.trim());
    });
  });
}

// Init: run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initGalleryDetail();
  initAvatarDither();
});

// Gallery detail page: flag that we're staying in the gallery zone so the
// gallery index page skips its expand animation when we navigate back.
// Also clamps the image wrap to the image's actual rendered width so that
// portrait images sit flush against the info panel with no gap.
function initGalleryDetail() {
  if (!document.body.classList.contains('page--gallery-detail')) {
    return;
  }

  // Navigation flag
  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/gallery/')) {
        sessionStorage.setItem('gallery-keep-expanded', '1');
      }
    });
  });

  // Clamp wrap width to image's rendered width so panel stays adjacent
  const wrap = document.querySelector('.gallery-detail__image-wrap');
  const img = wrap?.querySelector('img');
  if (!wrap || !img) return;

  function clampWrap() {
    // getBoundingClientRect gives the actual rendered size after CSS constraints
    const renderedWidth = img.getBoundingClientRect().width;
    if (renderedWidth > 0) {
      wrap.style.maxWidth = renderedWidth + 'px';
    } else {
      // Image not yet rendered (e.g. background tab); clear so layout reflows correctly
      wrap.style.maxWidth = '';
    }
  }

  if (img.complete && img.naturalWidth > 0) {
    clampWrap();
  } else {
    img.addEventListener('load', clampWrap);
  }

  // Re-clamp on resize in case the viewport changes
  window.addEventListener('resize', () => {
    // Remove the clamp so the layout reflows naturally first, then re-measure
    wrap.style.maxWidth = '';
    requestAnimationFrame(clampWrap);
  });
}

// ---- Avatar Dithering (About/Resume page) ----
// Halftone dot dithering: the image is divided into CELL×CELL blocks;
// each block gets one filled circle whose radius scales with the average
// block luminance, producing big visible dots matching the theme colours.
// A <canvas> overlay sits above the original <img> so the hover reveal is
// a CSS opacity crossfade. Luminance is cached; theme switches only repaint.

function hexToRgb(hex) {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// Coalesces rapid theme-switch repaints into a single frame.
let _ditherRafId = null;

function ditherAvatar() {
  const avatar = document.querySelector('.resume-avatar');
  if (!avatar) return;

  const style = getComputedStyle(document.documentElement);
  const bgHex = style.getPropertyValue('--clr-body-bg').trim();
  const fgHex = style.getPropertyValue('--clr-body-text').trim();
  if (!bgHex || !fgHex) return;

  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);

  // Luminance already cached — jump straight to repaint.
  if (avatar._lumCache) {
    _paintDither(avatar, bg, fg);
    return;
  }

  // First call: decode the original image and build the luminance cache.
  const originalSrc = avatar.dataset.originalSrc;
  if (!originalSrc) return;

  const tmpImg = new Image();
  tmpImg.onload = () => {
    const W = tmpImg.naturalWidth;
    const H = tmpImg.naturalHeight;
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(tmpImg, 0, 0);
    const src = ctx.getImageData(0, 0, W, H).data;

    // Pre-compute ITU-R BT.601 luminance for every pixel once.
    const lum = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      lum[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
    }
    avatar._lumCache = lum;
    avatar._lumW = W;
    avatar._lumH = H;

    // Size the overlay canvas to the source image's pixel dimensions.
    if (avatar._ditherCanvas) {
      avatar._ditherCanvas.width = W;
      avatar._ditherCanvas.height = H;
    }

    _paintDither(avatar, bg, fg);
  };
  tmpImg.src = originalSrc;
}

// Bayer 8×8 ordered dithering — the canonical algorithm used by ImageMagick,
// ffmpeg, swww, and most Linux image tools. Produces the iconic crosshatch /
// diamond tiling pattern seen in Linux ricing/wallpaper communities.
// Threshold: (matrix[y%8][x%8] + 0.5) / 64, compared against gamma-corrected
// luminance so midtones map correctly to the visible dither pattern.
const BAYER8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function _paintDither(avatar, bg, fg) {
  if (_ditherRafId) cancelAnimationFrame(_ditherRafId);
  _ditherRafId = requestAnimationFrame(() => {
    _ditherRafId = null;
    const canvas = avatar._ditherCanvas;
    if (!canvas) return;

    const W   = avatar._lumW;
    const H   = avatar._lumH;
    const lum = avatar._lumCache;

    // In a light theme bg is brighter than fg (text). Without correction,
    // bright image pixels map to the dark text colour — visually inverted.
    // Detect light themes by comparing bg/fg perceived luminance and, if
    // needed, invert the effective tone so bright always → lighter colour.
    const bgLum  = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
    const fgLum  = 0.299 * fg.r + 0.587 * fg.g + 0.114 * fg.b;
    const invert = bgLum > fgLum; // true = light theme

    const ctx       = canvas.getContext('2d');
    const imageData = ctx.createImageData(W, H);
    const out       = imageData.data;

    for (let y = 0; y < H; y++) {
      const row = BAYER8[y & 7];
      for (let x = 0; x < W; x++) {
        // Gamma-linearise, then flip tone for light themes so bright pixels
        // always resolve to the lighter of the two theme colours.
        let linear = Math.pow(lum[y * W + x] / 255, 2.2);
        if (invert) linear = 1 - linear;

        const threshold = (row[x & 7] + 0.5) / 64;
        const useFg     = linear > threshold;

        const pi    = (y * W + x) * 4;
        out[pi]     = useFg ? fg.r : bg.r;
        out[pi + 1] = useFg ? fg.g : bg.g;
        out[pi + 2] = useFg ? fg.b : bg.b;
        out[pi + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  });
}

function initAvatarDither() {
  const avatar = document.querySelector('.resume-avatar');
  if (!avatar) return;

  avatar.dataset.originalSrc = avatar.src;

  // Wrap the img so we can layer the dither canvas on top of it.
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative; display:block; width:100%;';
  avatar.parentNode.insertBefore(wrapper, avatar);
  wrapper.appendChild(avatar);

  // Overlay canvas — drawn above the original photo, pointer-events off
  // so cursor events fall through to the wrapper.
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute; inset:0; width:100%; height:100%;' +
    'transition:opacity 0.5s ease; pointer-events:none;';
  wrapper.appendChild(canvas);
  avatar._ditherCanvas = canvas;

  // Smooth crossfade: fade canvas out to reveal original, back in on leave.
  wrapper.addEventListener('mouseenter', () => { canvas.style.opacity = '0'; });
  wrapper.addEventListener('mouseleave', () => { canvas.style.opacity = '1'; });

  if (avatar.complete && avatar.naturalWidth > 0) {
    ditherAvatar();
  } else {
    avatar.addEventListener('load', ditherAvatar, { once: true });
  }
}

// Note: the lazy→eager preload hack has been removed.
// Images now use WebP/srcset variants generated at build time, which are small
// enough that native lazy-loading handles background tab preloading correctly.

// About page: copy email to clipboard on button click
// Android Chrome automatically shows a native "Copied to clipboard" toast.
// On desktop, the button text changes briefly to confirm.
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.top = '0';
    textarea.style.left = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy') ? resolve() : reject();
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

document.querySelectorAll('.resume-contact__copy[data-copy]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    const original = btn.textContent.trim();
    copyToClipboard(text)
      .then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        clearTimeout(btn._revertTimer);
        btn._revertTimer = setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 2000);
      })
      .catch(() => {
        btn.textContent = 'Failed!';
        clearTimeout(btn._revertTimer);
        btn._revertTimer = setTimeout(() => {
          btn.textContent = original;
        }, 2000);
      });
  });
});

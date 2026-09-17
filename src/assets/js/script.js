// Navigation: hamburger menu (opens drawer)
const hamTrigger = document.querySelector('.site-nav__hamburger');
const drawer = document.querySelector('.site-nav__drawer');

if (hamTrigger && drawer) {
  function closeDrawer() {
    hamTrigger.classList.remove('active');
    hamTrigger.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('active');
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  }

  hamTrigger.addEventListener('click', () => {
    const isOpening = !drawer.classList.contains('active');
    hamTrigger.classList.toggle('active', isOpening);
    hamTrigger.setAttribute('aria-expanded', String(isOpening));
    drawer.classList.toggle('active', isOpening);
    document.documentElement.classList.toggle('no-scroll', isOpening);
    document.body.classList.toggle('no-scroll', isOpening);
  });

  // Close drawer on link click
  drawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  // Close drawer and theme menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawer.classList.contains('active')) {
        closeDrawer();
      }
      if (themeMenu && themeMenu.style.display === 'block') {
        themeMenu.style.display = 'none';
        if (themeSwitch) {
          themeSwitch.setAttribute('aria-expanded', 'false');
          themeSwitch.focus();
        }
      }
    }
  });
}

// Navigation: Glassmorphism blur on scroll
const siteNav = document.querySelector('.site-nav');
if (siteNav) {
  const handleNavScroll = () => {
    if (window.scrollY > 16) {
      siteNav.classList.add('scrolled');
    } else {
      siteNav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();
}

// Theme: mode toggle, drawer theme panel, persistence
const themeMenu = document.querySelector('.theme-picker__menu');
const themeSwitch = document.querySelector('.site-nav__theme-toggle');
const modeToggle = document.querySelector('.site-nav__mode-toggle');
const modeOptions = document.querySelectorAll('[data-mode]');

function getActiveThemeState() {
  const isEmbedded = window.self !== window.top;
  let mode;
  let accent;

  if (isEmbedded) {
    mode =
      sessionStorage.getItem('v2-embedded-mode') ||
      (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    accent =
      sessionStorage.getItem('v2-embedded-accent') || localStorage.getItem('v3-theme') || 'green';
  } else {
    mode =
      localStorage.getItem('v2-mode') ||
      (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    accent = document.documentElement.getAttribute('data-static-accent') || 'periwinkle';
  }

  return { isEmbedded, mode, accent };
}

function updateThemeUI(mode) {
  if (modeToggle) {
    const nextMode = mode === 'light' ? 'dark' : 'light';
    modeToggle.setAttribute('aria-label', `Switch to ${nextMode} mode`);
    modeToggle.setAttribute('title', `Switch to ${nextMode} mode`);
  }

  document.querySelectorAll('[data-mode]').forEach((el) => {
    const m = el.getAttribute('data-mode');
    el.classList.toggle('active', m === mode);
  });
}

function applyTheme(themeKey, modeKey, fromV3 = false) {
  const { isEmbedded, mode: prevMode, accent: prevAccent } = getActiveThemeState();
  let currentMode = prevMode;
  let currentAccent = prevAccent;

  if (fromV3) {
    if (themeKey) {
      currentAccent = themeKey;
    }
    if (isEmbedded) {
      sessionStorage.removeItem('v2-embedded-accent');
    }
  } else {
    if (modeKey) {
      currentMode = modeKey;
    } else if (themeKey === 'light' || themeKey === 'dark') {
      currentMode = themeKey;
    }
  }

  // Persist preferences
  if (isEmbedded) {
    if (!fromV3) {
      sessionStorage.setItem('v2-embedded-mode', currentMode);
      sessionStorage.setItem('v2-embedded-accent', currentAccent);
    }
  } else {
    localStorage.setItem('v2-mode', currentMode);
  }

  // Preserve unrelated classes like 'no-scroll' and 'is-embedded'
  const isNoScroll = document.documentElement.classList.contains('no-scroll');
  document.documentElement.className = '';
  if (isNoScroll) {
    document.documentElement.classList.add('no-scroll');
  }
  if (isEmbedded) {
    document.documentElement.classList.add('is-embedded');
  }
  if (currentMode === 'light') {
    document.documentElement.classList.add('light');
  }
  if (currentAccent) {
    document.documentElement.classList.add(currentAccent);
  }
  // Restore static accent data attribute if it was cleared
  if (!isEmbedded && !document.documentElement.hasAttribute('data-static-accent')) {
     document.documentElement.setAttribute('data-static-accent', currentAccent);
  }

  updateThemeUI(currentMode);

  // Update theme toggle UI if present
  if (themeMenu) {
    themeMenu.style.display = 'none';
    if (themeSwitch) {
      themeSwitch.setAttribute('aria-expanded', 'false');
    }
  }

  // Re-dither the avatar using the new theme's colours
  if (typeof ditherAvatar === 'function') {
    ditherAvatar();
  }
}
window.applyTheme = applyTheme;

// Show V3 desktop sync option and hide switch-to-v3 buttons when embedded
if (window.self !== window.top) {
  document.documentElement.classList.add('is-embedded');
  document.querySelectorAll('.v3-theme-sync-opt').forEach((el) => {
    el.style.display = el.tagName === 'BUTTON' ? 'inline-flex' : 'flex';
  });
  document
    .querySelectorAll(
      '.site-nav__v3-btn, .site-nav__drawer-v3, .drawer-v3-btn, .btn--v3-launch, [data-v3-switch]',
    )
    .forEach((el) => {
      el.style.display = 'none';
    });
}

// Initialize theme UI active states
const { mode: initialMode } = getActiveThemeState();
updateThemeUI(initialMode);

// Mode toggle button (Sun / Moon)
if (modeToggle) {
  modeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(null, isLight ? 'dark' : 'light');
  });
}

// Mode options in dropdown and drawer
modeOptions.forEach((option) => {
  option.addEventListener('click', (e) => {
    e.preventDefault();
    const m = option.getAttribute('data-mode');
    applyTheme(null, m);
    if (option.classList.contains('drawer-mode-btn') && hamTrigger && drawer) {
      hamTrigger.classList.remove('active');
      drawer.classList.remove('active');
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    }
  });
});

// Desktop theme dropdown
if (themeSwitch && themeMenu) {
  themeSwitch.addEventListener('click', (e) => {
    e.stopPropagation();
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
    if (themeSwitch) {
      themeSwitch.setAttribute('aria-expanded', 'false');
    }
  }
});



// Gallery Page: Tabs switching
const GALLERY_SECTIONS = {
  Photography: '.gallery-grid--photography',
  'AI-Generations': '.gallery-grid--ai',
  Forza: '.gallery-grid--forza',
};

const SECTION_HASHES = {
  '#ai-container': 'AI-Generations',
  '#ai': 'AI-Generations',
  '#forza': 'Forza',
  '#photography': 'Photography',
};

function initGallery() {
  const isGalleryPage = document.body.classList.contains('page--gallery');
  if (!isGalleryPage) {
    return;
  }

  // Tabs Fade Animation
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

  function syncHashForName(name) {
    if (!window.history.replaceState) return;
    const hash = name === 'AI-Generations' ? '#ai-container' : `#${name.toLowerCase()}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }

  function getSectionFromHash() {
    const raw = (window.location.hash || '').toLowerCase();
    return SECTION_HASHES[raw] || 'Photography';
  }

  // Pure DOM swap — used on initial load and instant fallbacks.
  function swapSections(name, updateHash = false) {
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.textContent.trim() === name);
    });

    const target = containers[name];
    Object.values(containers).forEach((el) => {
      if (!el) {
        return;
      }
      const visible = el === target;
      el.classList.toggle('is-visible', visible);
      el.style.display = visible ? '' : 'none';
      el.style.opacity = visible ? '1' : '0';
    });

    if (updateHash) {
      syncHashForName(name);
    }
  }

  function show(name, updateHash = true) {
    if (isAnimating) {
      return;
    }

    const currentActiveBtn = document.querySelector('.gallery-tabs__btn.is-active');
    const currentActiveName = currentActiveBtn ? currentActiveBtn.textContent.trim() : null;

    if (currentActiveName === name) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    isAnimating = true;

    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.textContent.trim() === name);
    });

    if (updateHash) {
      syncHashForName(name);
    }

    const newEl = containers[name];
    const oldEl = currentActiveName ? containers[currentActiveName] : null;

    if (reducedMotion) {
      if (newEl) {
        newEl.style.display = '';
        newEl.classList.add('is-visible');
        newEl.style.opacity = '1';
      }
      if (oldEl && oldEl !== newEl) {
        oldEl.classList.remove('is-visible');
        oldEl.style.display = 'none';
        oldEl.style.opacity = '0';
      }
      isAnimating = false;
      return;
    }

    if (oldEl) {
      oldEl.style.opacity = '0';

      setTimeout(() => {
        oldEl.classList.remove('is-visible');
        oldEl.style.display = 'none';

        if (newEl) {
          newEl.style.display = '';
          void newEl.offsetHeight;
          newEl.classList.add('is-visible');
          newEl.style.opacity = '1';
        }

        setTimeout(() => {
          isAnimating = false;
        }, 150);
      }, 150);
    } else {
      if (newEl) {
        newEl.style.display = '';
        void newEl.offsetHeight;
        newEl.classList.add('is-visible');
        newEl.style.opacity = '1';
      }
      isAnimating = false;
    }
  }

  // Initial setup: show the default or hash-selected section directly
  swapSections(getSectionFromHash(), false);

  // Handle in-page hash changes (e.g. back/forward navigation or anchor links)
  window.addEventListener('hashchange', () => {
    const targetSection = getSectionFromHash();
    show(targetSection, false);
  });

  buttons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      show(button.textContent.trim(), true);
    });
  });
}

// Init: run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initAvatarDither();
});

// ---- Avatar Dithering (About/Resume page) ----
// Halftone dot dithering: the image is divided into CELL×CELL blocks;
// each block gets one filled circle whose radius scales with the average
// block luminance, producing big visible dots matching the theme colours.
// A <canvas> overlay sits above the original <img> so the hover reveal is
// a CSS opacity crossfade. Luminance is cached; theme switches only repaint.

function hexToRgb(hex) {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
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
  if (!avatar) {
    return;
  }

  const style = getComputedStyle(document.documentElement);
  const bgHex = style.getPropertyValue('--clr-body-bg').trim();
  const fgHex = style.getPropertyValue('--clr-body-text').trim();
  if (!bgHex || !fgHex) {
    return;
  }

  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);

  // Luminance already cached — jump straight to repaint.
  if (avatar._lumCache) {
    _paintDither(avatar, bg, fg);
    return;
  }

  // First call: decode the original image and build the luminance cache.
  const originalSrc = avatar.dataset.originalSrc;
  if (!originalSrc) {
    return;
  }

  const tmpImg = new Image();
  tmpImg.onload = () => {
    const rect = avatar.getBoundingClientRect();
    const cssW = rect.width || 160;
    const cssH = rect.height || 160;
    const dpr = window.devicePixelRatio || 1;

    const W = Math.round(cssW * dpr);
    const H = Math.round(cssH * dpr);
    
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(tmpImg, 0, 0, W, H);
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
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function _paintDither(avatar, bg, fg) {
  if (_ditherRafId) {
    cancelAnimationFrame(_ditherRafId);
  }
  _ditherRafId = requestAnimationFrame(() => {
    _ditherRafId = null;
    const canvas = avatar._ditherCanvas;
    if (!canvas) {
      return;
    }

    const W = avatar._lumW;
    const H = avatar._lumH;
    const lum = avatar._lumCache;

    // In a light theme bg is brighter than fg (text). Without correction,
    // bright image pixels map to the dark text colour — visually inverted.
    // Detect light themes by comparing bg/fg perceived luminance and, if
    // needed, invert the effective tone so bright always → lighter colour.
    const bgLum = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
    const fgLum = 0.299 * fg.r + 0.587 * fg.g + 0.114 * fg.b;
    const invert = bgLum > fgLum; // true = light theme

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(W, H);
    const out = imageData.data;

    for (let y = 0; y < H; y++) {
      const row = BAYER8[y & 7];
      for (let x = 0; x < W; x++) {
        // Gamma-linearise, then flip tone for light themes so bright pixels
        // always resolve to the lighter of the two theme colours.
        let linear = Math.pow(lum[y * W + x] / 255, 2.2);
        if (invert) {
          linear = 1 - linear;
        }

        const threshold = (row[x & 7] + 0.5) / 64;
        const useFg = linear > threshold;

        const pi = (y * W + x) * 4;
        out[pi] = useFg ? fg.r : bg.r;
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
  if (!avatar || avatar.dataset.ditherInit) {
    return;
  }
  avatar.dataset.ditherInit = 'true';
  avatar.dataset.originalSrc = avatar.src;

  // Wrap the img so we can layer the dither canvas on top of it.
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative; display:block; width:100%; height:100%;';
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
  wrapper.addEventListener('mouseenter', () => {
    canvas.style.opacity = '0';
  });
  wrapper.addEventListener('mouseleave', () => {
    canvas.style.opacity = '1';
  });

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
    const textSpan = btn.querySelector('.btn-text');
    const originalText = textSpan ? textSpan.textContent : btn.textContent.trim();
    copyToClipboard(text)
      .then(() => {
        if (textSpan) {
          textSpan.textContent = 'Copied!';
        } else {
          btn.textContent = 'Copied!';
        }
        btn.classList.add('copied');
        clearTimeout(btn._revertTimer);
        btn._revertTimer = setTimeout(() => {
          if (textSpan) {
            textSpan.textContent = originalText;
          } else {
            btn.textContent = originalText;
          }
          btn.classList.remove('copied');
        }, 2000);
      })
      .catch(() => {
        if (textSpan) {
          textSpan.textContent = 'Failed!';
        } else {
          btn.textContent = 'Failed!';
        }
        clearTimeout(btn._revertTimer);
        btn._revertTimer = setTimeout(() => {
          if (textSpan) {
            textSpan.textContent = originalText;
          } else {
            btn.textContent = originalText;
          }
          btn.classList.remove('copied');
        }, 2000);
      });
  });
});

// Markdown Table of Contents (Left-side Header Navigation Tree)
function initMarkdownToc() {
  const tocList = document.querySelector('.markdown-toc__list');
  const markdownContent = document.querySelector('.markdown-content');
  const tocAside = document.querySelector('.markdown-toc');
  if (!tocList || !markdownContent || !tocAside) {
    return;
  }

  const headings = Array.from(markdownContent.querySelectorAll('h2, h3'));
  if (headings.length < 2) {
    tocAside.style.display = 'none';
    const layout = document.querySelector('.markdown-layout');
    if (layout) {
      layout.style.display = 'block';
    }
    return;
  }

  const usedSlugs = new Set();
  function generateSlug(text) {
    let slug = text
      .toLowerCase()
      .replace(/^[/\s#]+/, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    if (!slug) {
      slug = 'section';
    }
    let uniqueSlug = slug;
    let counter = 1;
    while (usedSlugs.has(uniqueSlug) || document.getElementById(uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    usedSlugs.add(uniqueSlug);
    return uniqueSlug;
  }

  const tocLinks = [];

  headings.forEach((heading) => {
    let id = heading.id;
    if (!id) {
      id = generateSlug(heading.textContent);
      heading.id = id;
    }

    const level = heading.tagName.toLowerCase();
    const cleanText = heading.textContent.replace(/^\/\/\s*/, '').trim();

    const li = document.createElement('li');
    li.className = `markdown-toc__item markdown-toc__item--${level}`;

    const a = document.createElement('a');
    a.href = `#${id}`;
    a.className = 'markdown-toc__link';
    a.textContent = cleanText;

    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${id}`);
      tocLinks.forEach(({ link }) => link.classList.remove('active'));
      a.classList.add('active');
    });

    li.appendChild(a);
    tocList.appendChild(li);
    tocLinks.push({ heading, link: a });
  });

  // Active section scrollspy
  if ('IntersectionObserver' in window && tocLinks.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentId = entry.target.id;
            tocLinks.forEach(({ link }) => {
              link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
            });
          }
        });
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      },
    );

    headings.forEach((h) => observer.observe(h));
  }

  // Improved TOC Hitbox & Smooth Scroll Routing
  // When scrolling in the expanded hitbox (left margin, bottom dead space, etc.),
  // applies an interpolated easing curve matching native browser smooth scrolling,
  // preventing the "scrolling too fast" sensation from instant scrollTop jumps.
  let targetScrollTop = tocAside.scrollTop;
  let rafId = null;

  function updateTocSmoothScroll() {
    const current = tocAside.scrollTop;
    const maxScroll = tocAside.scrollHeight - tocAside.clientHeight;
    targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));

    const diff = targetScrollTop - current;
    if (Math.abs(diff) < 0.5) {
      tocAside.scrollTop = targetScrollTop;
      rafId = null;
      return;
    }

    // Exponential decay interpolation (~200ms ease-out)
    tocAside.scrollTop = current + diff * 0.18;
    rafId = requestAnimationFrame(updateTocSmoothScroll);
  }

  // Keep target in sync if scrolled directly or programmatically
  tocAside.addEventListener('scroll', () => {
    if (!rafId) {
      targetScrollTop = tocAside.scrollTop;
    }
  });

  window.addEventListener(
    'wheel',
    (e) => {
      // Don't interfere with browser zoom or predominantly horizontal swipes
      if (e.ctrlKey || (e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
        return;
      }
      // Only active when TOC is displayed (desktop landscape)
      if (window.getComputedStyle(tocAside).display === 'none') {
        return;
      }
      // Only intervene if TOC has scrollable overflow
      if (tocAside.scrollHeight <= tocAside.clientHeight) {
        return;
      }

      const rect = tocAside.getBoundingClientRect();

      // Expanded hitbox: from screen left edge (0) up to 20px past the TOC's right border,
      // and vertically within the visible area of the TOC sidebar down to the bottom of the TOC
      // (or viewport bottom while reading the article).
      const inTocHitbox =
        e.clientX <= rect.right + 20 &&
        e.clientY >= rect.top - 20 &&
        e.clientY <= Math.min(window.innerHeight, rect.bottom + 30);

      if (!inTocHitbox) {
        return; // Cursor is in main content area; let browser scroll content natively
      }

      if (tocAside.contains(e.target)) {
        // Cursor is directly over the TOC element.
        // Native browser smooth scrolling handles this with full smoothness.
        // Prevent scroll chaining when hitting the top or bottom limits.
        targetScrollTop = tocAside.scrollTop;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        const maxScroll = tocAside.scrollHeight - tocAside.clientHeight;
        const atTop = tocAside.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = tocAside.scrollTop >= maxScroll - 1 && e.deltaY > 0;
        if (atTop || atBottom) {
          e.preventDefault();
        }
      } else {
        // Cursor is in the expanded left hitbox (left margin, bottom dead space, etc.)
        // Apply smooth calibrated scrolling matching native TOC speed.
        e.preventDefault();

        let deltaY = e.deltaY;
        if (e.deltaMode === 1) {
          deltaY *= 33; // DOM_DELTA_LINE normalization
        } else if (e.deltaMode === 2) {
          deltaY *= tocAside.clientHeight; // DOM_DELTA_PAGE normalization
        }

        const isTrackpad =
          e.deltaMode === 0 && (!Number.isInteger(deltaY) || Math.abs(deltaY) < 30);
        if (isTrackpad) {
          // Trackpads already supply high-frequency smooth deltas
          targetScrollTop = tocAside.scrollTop + deltaY;
          tocAside.scrollTop = targetScrollTop;
        } else {
          // Mouse wheel notches: scale delta to ~60px per click and animate with rAF easing
          const maxScroll = tocAside.scrollHeight - tocAside.clientHeight;
          const current = tocAside.scrollTop;
          const stepDelta = deltaY * 0.65;

          if (rafId === null) {
            targetScrollTop = current;
          }

          // Direction reversal: if user quickly scrolls in opposite direction of current easing,
          // anchor to the current scroll position so reversal is instantaneous without inertia lag
          if (
            (stepDelta < 0 && targetScrollTop > current) ||
            (stepDelta > 0 && targetScrollTop < current)
          ) {
            targetScrollTop = current + stepDelta;
          } else {
            targetScrollTop = targetScrollTop + stepDelta;
          }

          targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));
          if (!rafId) {
            rafId = requestAnimationFrame(updateTocSmoothScroll);
          }
        }
      }
    },
    { passive: false },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMarkdownToc);
} else {
  initMarkdownToc();
}

// ---- Link Prefetch (Fast Navigation) -------------------------------------
// Prefetching the hovered/focused destination warms the HTTP cache so that
// subsequent page navigations load instantly.
const prefetchCache = new Set();
const galleryImageCache = new Set();

function prefetchGalleryImages() {
  if (
    navigator.connection &&
    (navigator.connection.saveData ||
      navigator.connection.effectiveType === 'slow-2g' ||
      navigator.connection.effectiveType === '2g' ||
      navigator.connection.effectiveType === '3g')
  ) {
    return;
  }
  const isMobile =
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  if (isMobile) {
    return; // Preserve mobile cellular bandwidth
  }
  const urls = window.__GALLERY_PRELOAD__;
  if (!Array.isArray(urls) || urls.length === 0) {
    return;
  }
  const limit = 6;
  for (const imageUrl of urls.slice(0, limit)) {
    if (galleryImageCache.has(imageUrl)) {
      continue;
    }
    galleryImageCache.add(imageUrl);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = imageUrl;
    document.head.appendChild(link);
  }
}

function prefetchHref(href) {
  if (!href || prefetchCache.has(href)) {
    return;
  }

  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin) {
    return; // external
  }
  if (url.pathname === window.location.pathname) {
    return; // current page / in-page anchors
  }
  if (url.pathname.startsWith('/v3/')) {
    return; // V3 is a hard-cut SPA by design
  }
  const extMatch = url.pathname.match(/\.([a-z0-9]+)$/i);
  if (extMatch && !/^(html?|md)$/i.test(extMatch[1])) {
    return; // binary/asset links don't navigate to a document
  }

  if (url.pathname.startsWith('/gallery')) {
    prefetchGalleryImages();
  }

  prefetchCache.add(href);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

function initLinkPrefetch() {
  document.querySelectorAll('a[href]').forEach((link) => {
    // pointerover is hit before click settles; focus covers keyboard users.
    // Skip touch events to avoid congesting mobile network right before navigation.
    link.addEventListener(
      'pointerover',
      (e) => {
        if (e.pointerType === 'touch') {
          return;
        }
        prefetchHref(link.href);
      },
      { passive: true },
    );
    link.addEventListener('focus', () => prefetchHref(link.href), { passive: true });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLinkPrefetch);
} else {
  initLinkPrefetch();
}

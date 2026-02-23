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
  // Apply theme to html element to match the inline script in base.njk
  document.documentElement.className = themeKey;
  localStorage.setItem('theme', themeKey);
}

// Desktop theme dropdown
if (themeSwitch && themeMenu) {
  themeSwitch.addEventListener('click', () => {
    themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
  });
}

window.addEventListener('click', (e) => {
  if (
    themeMenu &&
    !e.target.closest('.site-nav__theme-toggle') &&
    !e.target.closest('.theme-picker__menu')
  ) {
    themeMenu.style.display = 'none';
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
    copyToClipboard(text).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      clearTimeout(btn._revertTimer);
      btn._revertTimer = setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    });
  });
});

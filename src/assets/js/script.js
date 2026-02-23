// Navigation: hamburger menu (opens drawer)
const hamTrigger = document.querySelector('.site-nav__hamburger') || document.querySelector('.hamburger');
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
const themeMenu = document.getElementById('theme-menu');
const themeSwitch = document.getElementById('theme-switch');
const themeSwitchHam = document.getElementById('theme-switch-ham');
const themeOptions = document.querySelectorAll('.theme-picker__menu a');
const themeDrawerOptions = document.querySelector('.theme-picker__drawer-options');
const drawerNavItems = document.querySelectorAll('.site-nav__drawer-item');

function applyTheme(themeKey) {
  if (!themeKey) return;
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
  if (themeMenu && !e.target.closest('#theme-switch') && !e.target.closest('.theme-picker__menu')) {
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
  'Photography': '.gallery-grid--photography',
  'AI-Generations': '.gallery-grid--ai',
  'Forza': '.gallery-grid--forza',
};

function initGallery() {
  const isGalleryPage = document.body.classList.contains('page--gallery');
  if (!isGalleryPage) return;

  // 1. Width Animation
  // Expand width shortly after load
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('is-expanded');
    });
  });

  // Intercept internal links to animate width back before navigating
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // Check if it's an internal navigation link (not a hash, not external, not empty)
      if (href && href.startsWith('/') && !href.startsWith('#')) {
        e.preventDefault();
        document.body.classList.remove('is-expanded');

        // Wait for CSS transition (0.5s) before navigating
        setTimeout(() => {
          window.location.href = href;
        }, 500);
      }
    });
  });

  // 2. Tabs Fade Animation
  const buttons = document.querySelectorAll('.gallery-tabs__btn');
  if (!buttons.length) return;

  const containers = {};
  Object.entries(GALLERY_SECTIONS).forEach(([name, selector]) => {
    const el = document.querySelector(selector);
    if (el) containers[name] = el;
  });

  let isAnimating = false;

  function show(name) {
    if (isAnimating) return;

    const currentActiveBtn = document.querySelector('.gallery-tabs__btn.is-active');
    const currentActiveName = currentActiveBtn ? currentActiveBtn.textContent.trim() : null;

    if (currentActiveName === name) return;

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
  Object.values(containers).forEach(el => {
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
});

// Preload gallery images after the main page has finished loading
window.addEventListener('load', () => {
  const isGalleryPage = document.body.classList.contains('page--gallery');
  if (!isGalleryPage) return;

  // Find all lazy-loaded images in the gallery
  const lazyImages = document.querySelectorAll('.gallery-grid img[loading="lazy"]');

  // Change them to eager to force the browser to download them in the background
  lazyImages.forEach(img => {
    img.setAttribute('loading', 'eager');
  });
});

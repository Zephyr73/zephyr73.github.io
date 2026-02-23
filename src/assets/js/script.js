// Navigation: hamburger menu (opens drawer)

const hamTrigger =
  document.querySelector('.site-nav__hamburger') || document.querySelector('.hamburger');
const drawer = document.querySelector('.site-nav__drawer');

if (hamTrigger && drawer) {
  hamTrigger.addEventListener('click', () => {
    hamTrigger.classList.toggle('active');
    drawer.classList.toggle('active');
  });
}

// Theme: dropdown (desktop), drawer theme panel, persistence

const themeMenu = document.getElementById('theme-menu');
const themeSwitch = document.getElementById('theme-switch');
const themeSwitchHam = document.getElementById('theme-switch-ham');
const themeOptions = document.querySelectorAll('.theme-picker__menu a');
const themeDrawerOptions = document.querySelector('.theme-picker__drawer-options');
const drawerNavItems = document.querySelectorAll('.site-nav__drawer-item');

function getBodyPageClass() {
  const page = document.body.getAttribute('data-page') || 'home';
  return `page page--${page}`;
}

function applyTheme(themeKey) {
  if (!themeKey) {
    return;
  }
  document.body.className = getBodyPageClass() + ' ' + themeKey;
  localStorage.setItem('theme', themeKey);
}

// Restore saved theme on load (the inline script in <head> set data-theme-pending
// before CSS loaded; now apply it to body.className)
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.body.className = getBodyPageClass() + ' ' + savedTheme;
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

// Gallery page: tab buttons (Photography / AI-Generations / Forza)

const GALLERY_SECTIONS = {
  Photography: '.gallery-grid--photography',
  'AI-Generations': '.gallery-grid--ai',
  Forza: '.gallery-grid--forza',
};

function initGallery() {
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

  function hideAll() {
    Object.values(containers).forEach((el) => {
      if (el) {
        el.classList.remove('is-visible');
      }
    });
  }

  function show(name) {
    hideAll();
    const el = containers[name];
    if (el) {
      el.classList.add('is-visible');
    }
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.textContent.trim() === name);
    });
  }

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

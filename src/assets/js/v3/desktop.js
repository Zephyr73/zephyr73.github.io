/**
 * desktop.js — Desktop Mode Icons & Widgets
 */

const DESKTOP_ICONS = [
  {
    id: 'console',
    label: 'Console',
    type: 'app',
    appName: 'terminal',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  },
  {
    id: 'about_me',
    label: 'About Me',
    type: 'app',
    appName: 'about',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  },
  {
    id: 'web_engine',
    label: 'Web Engine',
    type: 'app',
    appName: 'browser',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  {
    id: 'file_explorer',
    label: 'File Explorer',
    type: 'app',
    appName: 'fileExplorer',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  },
];

export function initDesktop({ openApp }) {
  const iconGrid = document.getElementById('desktop-icon-grid');
  if (!iconGrid) return;

  iconGrid.innerHTML = '';

  DESKTOP_ICONS.forEach((cfg) => {
    const iconEl = document.createElement('div');
    iconEl.className = 'desktop-icon';
    iconEl.id = `icon-${cfg.id}`;
    iconEl.setAttribute('role', 'listitem');
    iconEl.setAttribute('tabindex', '0');
    iconEl.setAttribute('aria-label', `${cfg.label} desktop shortcut`);

    iconEl.innerHTML = `
      <div class="desktop-icon__img">${cfg.icon}</div>
      <div class="desktop-icon__label">${cfg.label}</div>
    `;

    // Click to select or double click/tap to open
    let lastClick = 0;
    iconEl.addEventListener('click', (e) => {
      window.playSound?.('click');
      e.stopPropagation();
      const now = Date.now();
      const isDoubleClick = now - lastClick < 300;
      lastClick = now;

      if (isDoubleClick || iconEl.classList.contains('selected')) {
        openIconShortcut(cfg, openApp);
      } else {
        deselectAll();
        iconEl.classList.add('selected');
      }
    });

    // Support keyboard Enter key
    iconEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        window.playSound?.('click');
        openIconShortcut(cfg, openApp);
      }
    });

    iconGrid.appendChild(iconEl);
  });

  // Drag selection marquee box logic
  const modeDesktop = document.getElementById('mode-desktop');
  if (modeDesktop) {
    let marquee = null;
    let startX = 0;
    let startY = 0;

    modeDesktop.addEventListener('mousedown', (e) => {
      // Only left click
      if (e.button !== 0) return;

      // Do not start selection if clicking inside interactive elements
      if (
        e.target.closest('.window') ||
        e.target.closest('.desktop-icon') ||
        e.target.closest('.desktop-notification') ||
        e.target.closest('.status-bar') ||
        e.target.closest('.navbar') ||
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('textarea') ||
        e.target.closest('select') ||
        e.target.closest('a')
      ) {
        return;
      }

      deselectAll();

      const rect = modeDesktop.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;

      marquee = document.createElement('div');
      marquee.className = 'selection-marquee';
      marquee.style.left = `${startX}px`;
      marquee.style.top = `${startY}px`;
      marquee.style.width = '0px';
      marquee.style.height = '0px';
      modeDesktop.appendChild(marquee);

      const onMouseMove = (moveEvt) => {
        if (!marquee) return;
        const currentRect = modeDesktop.getBoundingClientRect();
        const curX = moveEvt.clientX - currentRect.left;
        const curY = moveEvt.clientY - currentRect.top;

        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const width = Math.abs(startX - curX);
        const height = Math.abs(startY - curY);

        marquee.style.left = `${x}px`;
        marquee.style.top = `${y}px`;
        marquee.style.width = `${width}px`;
        marquee.style.height = `${height}px`;

        // Check intersection with each desktop icon
        const marqueeRect = marquee.getBoundingClientRect();
        const icons = modeDesktop.querySelectorAll('.desktop-icon');
        icons.forEach((icon) => {
          const iconRect = icon.getBoundingClientRect();
          const intersect = !(
            marqueeRect.right < iconRect.left ||
            marqueeRect.left > iconRect.right ||
            marqueeRect.bottom < iconRect.top ||
            marqueeRect.top > iconRect.bottom
          );
          if (intersect) {
            icon.classList.add('selected');
          } else {
            icon.classList.remove('selected');
          }
        });
      };

      const onMouseUp = () => {
        if (marquee) {
          marquee.remove();
          marquee = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
}

function deselectAll() {
  document.querySelectorAll('.desktop-icon.selected').forEach((el) => {
    el.classList.remove('selected');
  });
}

function openIconShortcut(cfg, openApp) {
  if (cfg.type === 'app') {
    if (cfg.appName === 'about') {
      openApp('html', '/about/index.html', 'About Me');
    } else {
      openApp(cfg.appName);
    }
  } else if (cfg.type === 'file') {
    openApp(cfg.fileType, cfg.path, cfg.title);
  }
}

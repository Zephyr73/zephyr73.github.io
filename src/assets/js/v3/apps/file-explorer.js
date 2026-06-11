/**
 * file-explorer.js — File Explorer App (Thunar-mimicking)
 */

import { ls, getNodeByPath, resolvePath } from '../filesystem.js';

export function createFileExpApp(initialPath = '/') {
  const container = document.createElement('div');
  container.className = 'app-fileexp';

  // State
  let currentPath = resolvePath(initialPath);
  let historyStack = [currentPath];
  let historyIndex = 0;
  let selectedItemNode = null;

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'fileexp-toolbar';

  const backBtn = document.createElement('button');
  backBtn.className = 'fileexp-nav-btn';
  backBtn.innerHTML = '◀';
  backBtn.title = 'Back';
  backBtn.disabled = true;

  const forwardBtn = document.createElement('button');
  forwardBtn.className = 'fileexp-nav-btn';
  forwardBtn.innerHTML = '▶';
  forwardBtn.title = 'Forward';
  forwardBtn.disabled = true;

  const upBtn = document.createElement('button');
  upBtn.className = 'fileexp-nav-btn';
  upBtn.innerHTML = '▲';
  upBtn.title = 'Parent Directory';
  upBtn.disabled = currentPath === '/';

  const pathBar = document.createElement('div');
  pathBar.className = 'fileexp-path-bar';

  toolbar.appendChild(backBtn);
  toolbar.appendChild(forwardBtn);
  toolbar.appendChild(upBtn);
  toolbar.appendChild(pathBar);

  // Body
  const body = document.createElement('div');
  body.className = 'fileexp-body';

  const grid = document.createElement('div');
  grid.className = 'fileexp-grid';
  body.appendChild(grid);

  // Statusbar
  const statusbar = document.createElement('div');
  statusbar.className = 'fileexp-statusbar';
  statusbar.textContent = '0 items';

  container.appendChild(toolbar);
  container.appendChild(body);
  container.appendChild(statusbar);

  // Navigate to path
  function navigateTo(path, addToHistory = true) {
    const targetPath = resolvePath(path);
    const node = getNodeByPath(targetPath);
    if (!node || node.type !== 'dir') return;

    currentPath = targetPath;
    selectedItemNode = null;

    if (addToHistory) {
      // Truncate forward history if navigating new path
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(currentPath);
      historyIndex = historyStack.length - 1;
    }

    // Update buttons
    backBtn.disabled = historyIndex === 0;
    forwardBtn.disabled = historyIndex === historyStack.length - 1;
    upBtn.disabled = currentPath === '/';

    renderBreadcrumbs();
    renderGrid();
    updateStatusbar();
  }

  // Render Breadcrumbs
  function renderBreadcrumbs() {
    pathBar.innerHTML = '';

    // Add root
    const rootBread = document.createElement('span');
    rootBread.className = 'fileexp-breadcrumb';
    rootBread.textContent = 'root';
    rootBread.addEventListener('click', () => {
      window.playSound?.('click');
      navigateTo('/');
    });
    pathBar.appendChild(rootBread);

    if (currentPath === '/') return;

    const parts = currentPath.split('/').filter(Boolean);
    let accumPath = '';

    parts.forEach((part) => {
      accumPath += '/' + part;

      const sep = document.createElement('span');
      sep.className = 'fileexp-breadcrumb-sep';
      sep.textContent = '›';
      pathBar.appendChild(sep);

      const bread = document.createElement('span');
      bread.className = 'fileexp-breadcrumb';
      bread.textContent = part;
      const target = accumPath; // lock variable
      bread.addEventListener('click', () => {
        window.playSound?.('click');
        navigateTo(target);
      });
      pathBar.appendChild(bread);
    });
  }

  // Render file grid
  function renderGrid() {
    grid.innerHTML = '';
    const entries = ls(currentPath);
    if (!entries) return;

    entries.forEach((node) => {
      const item = document.createElement('div');
      item.className = 'fileexp-item';
      item.setAttribute('tabindex', '0');

      const icon = document.createElement('div');
      icon.className = 'fileexp-item__icon';

      // SVG icons matching type
      if (node.type === 'dir') {
        icon.className += ' icon-dir';
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
      } else {
        const fileType = node.fileType || 'other';
        icon.className += ` icon-${fileType}`;
        switch (fileType) {
          case 'md':
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`;
            break;
          case 'html':
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
            break;
          case 'img':
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
            break;
          case 'pdf':
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
            break;
          default:
            icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
            break;
        }
      }

      const name = document.createElement('div');
      name.className = 'fileexp-item__name';
      name.textContent = node.name;

      item.appendChild(icon);
      item.appendChild(name);

      // Selection handling & double click/tap to open
      let lastClick = 0;
      item.addEventListener('click', (e) => {
        window.playSound?.('click');
        e.stopPropagation();
<<<<<<< HEAD
        const now = Date.now();
        const isDoubleClick = (now - lastClick) < 300;
        lastClick = now;
=======
        document
          .querySelectorAll('.fileexp-item.selected')
          .forEach((el) => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedItemNode = node;
        updateStatusbar();
      });
>>>>>>> 5f2c9920115485e87ae3240ed2abfe76c01c2b56

        if (isDoubleClick || item.classList.contains('selected')) {
          openItem(node);
        } else {
          document.querySelectorAll('.fileexp-item.selected').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          selectedItemNode = node;
          updateStatusbar();
        }
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          window.playSound?.('click');
          openItem(node);
        }
      });

      grid.appendChild(item);
    });
  }

  function openItem(node) {
    if (node.type === 'dir') {
      navigateTo(node.path);
    } else {
      // Call window manager
      window.__shell__?.openApp(node);
    }
  }

  function updateStatusbar() {
    const entries = ls(currentPath) || [];
    const count = entries.length;

    if (selectedItemNode) {
      const sizeStr =
        selectedItemNode.type === 'file' ? ` (${selectedItemNode.size || '0 B'})` : '';
      statusbar.textContent = `Selected: "${selectedItemNode.name}"${sizeStr}`;
    } else {
      statusbar.textContent = `${count} item${count === 1 ? '' : 's'}`;
    }
  }

  // Click background to deselect
  body.addEventListener('click', () => {
    document
      .querySelectorAll('.fileexp-item.selected')
      .forEach((el) => el.classList.remove('selected'));
    selectedItemNode = null;
    updateStatusbar();
  });

  // Nav actions
  backBtn.addEventListener('click', () => {
    window.playSound?.('click');
    if (historyIndex > 0) {
      historyIndex--;
      navigateTo(historyStack[historyIndex], false);
    }
  });

  forwardBtn.addEventListener('click', () => {
    window.playSound?.('click');
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      navigateTo(historyStack[historyIndex], false);
    }
  });

  upBtn.addEventListener('click', () => {
    window.playSound?.('click');
    if (currentPath !== '/') {
      const idx = currentPath.lastIndexOf('/');
      const parent = currentPath.substring(0, idx) || '/';
      navigateTo(parent);
    }
  });

  // Initial load
  navigateTo(currentPath, false);

  return container;
}

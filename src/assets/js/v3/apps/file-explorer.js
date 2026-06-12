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
  let viewMode = localStorage.getItem('fileexp-view-mode') || 'grid'; // 'grid' or 'list'
  const expandedPaths = new Set(['/']);

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

  const viewBtn = document.createElement('button');
  viewBtn.className = 'fileexp-view-btn';
  viewBtn.innerHTML = viewMode === 'grid' ? '⬡ VIEW: GRID' : '⬡ VIEW: LIST';
  viewBtn.title = 'Switch View Mode';

  toolbar.appendChild(backBtn);
  toolbar.appendChild(forwardBtn);
  toolbar.appendChild(upBtn);
  toolbar.appendChild(pathBar);
  toolbar.appendChild(viewBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'fileexp-body';

  // Sidebar (Navigation Pane)
  const sidebar = document.createElement('div');
  sidebar.className = 'fileexp-sidebar';

  // Content Area
  const contentArea = document.createElement('div');
  contentArea.className = viewMode === 'grid' ? 'fileexp-grid' : 'fileexp-list';

  body.appendChild(sidebar);
  body.appendChild(contentArea);

  // Statusbar
  const statusbar = document.createElement('div');
  statusbar.className = 'fileexp-statusbar';
  statusbar.textContent = '0 items';

  container.appendChild(toolbar);
  container.appendChild(body);
  container.appendChild(statusbar);

  // Helpers
  function getIconSVG(node) {
    if (node.type === 'dir') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    const fileType = node.fileType || 'other';
    switch (fileType) {
      case 'md':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`;
      case 'html':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
      case 'img':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      case 'pdf':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }
  }

  function getNodeTypeString(node) {
    if (node.type === 'dir') return 'Folder';
    const fileType = node.fileType || 'other';
    switch (fileType) {
      case 'md': return 'Markdown Document';
      case 'html': return 'HTML Document';
      case 'img': return 'Image Asset';
      case 'pdf': return 'PDF Document';
      case 'js': return 'JavaScript File';
      case 'json': return 'JSON File';
      case 'css': return 'CSS Stylesheet';
      case 'txt': return 'Text Document';
      default: return 'File';
    }
  }

  function autoExpandParentPaths(path) {
    if (!path) return;
    expandedPaths.add('/');
    const parts = path.split('/').filter(Boolean);
    let accum = '';
    for (let i = 0; i < parts.length - 1; i++) {
      accum += '/' + parts[i];
      expandedPaths.add(accum);
    }
  }

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

    // Auto-expand parents
    autoExpandParentPaths(currentPath);

    renderBreadcrumbs();
    renderSidebar();
    renderContent();
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

  // Render Sidebar Tree (Recursive Directory Builder)
  function buildTreeHTML(node) {
    if (node.type !== 'dir') return null;

    const subdirs = (node.children || []).filter(c => c.type === 'dir');
    const hasSubdirs = subdirs.length > 0;
    const isExpanded = expandedPaths.has(node.path);
    const isActive = currentPath === node.path;

    const nodeEl = document.createElement('div');
    nodeEl.className = 'fileexp-tree-node';
    if (isExpanded) nodeEl.classList.add('expanded');

    const rowEl = document.createElement('div');
    rowEl.className = 'fileexp-tree-row';
    if (isActive) rowEl.classList.add('active');
    rowEl.setAttribute('data-path', node.path);

    // Expand/Collapse toggle button
    if (hasSubdirs) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'fileexp-tree-toggle';
      toggleBtn.innerHTML = isExpanded ? '▼' : '▶';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.playSound?.('click');
        if (expandedPaths.has(node.path)) {
          expandedPaths.delete(node.path);
        } else {
          expandedPaths.add(node.path);
        }
        renderSidebar();
      });
      rowEl.appendChild(toggleBtn);
    } else {
      const spacer = document.createElement('div');
      spacer.className = 'fileexp-tree-toggle-spacer';
      rowEl.appendChild(spacer);
    }

    // Folder Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'fileexp-tree-icon';
    iconEl.innerHTML = getIconSVG(node);
    rowEl.appendChild(iconEl);

    // Folder Name
    const labelEl = document.createElement('span');
    labelEl.className = 'fileexp-tree-label';
    labelEl.textContent = node.name || 'root';
    rowEl.appendChild(labelEl);

    // Row Click navigation
    rowEl.addEventListener('click', (e) => {
      e.stopPropagation();
      window.playSound?.('click');
      navigateTo(node.path);
    });

    nodeEl.appendChild(rowEl);

    // Children Directories
    if (hasSubdirs) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'fileexp-tree-children';
      subdirs.forEach(child => {
        const childEl = buildTreeHTML(child);
        if (childEl) {
          childrenContainer.appendChild(childEl);
        }
      });
      nodeEl.appendChild(childrenContainer);
    }

    return nodeEl;
  }

  function renderSidebar() {
    sidebar.innerHTML = '';
    const rootNode = window.__FS_TREE__;
    if (!rootNode) return;
    const treeRoot = buildTreeHTML(rootNode);
    if (treeRoot) {
      sidebar.appendChild(treeRoot);
    }
  }

  // Render central panel content area
  function renderContent() {
    contentArea.innerHTML = '';
    const entries = ls(currentPath);
    if (!entries) return;

    if (viewMode === 'grid') {
      entries.forEach((node) => {
        const item = document.createElement('div');
        item.className = 'fileexp-item';
        item.setAttribute('tabindex', '0');

        const icon = document.createElement('div');
        icon.className = 'fileexp-item__icon';
        const fileType = node.fileType || 'other';
        icon.className += node.type === 'dir' ? ' icon-dir' : ` icon-${fileType}`;
        icon.innerHTML = getIconSVG(node);

        const name = document.createElement('div');
        name.className = 'fileexp-item__name';
        name.textContent = node.name;

        item.appendChild(icon);
        item.appendChild(name);

        let lastClick = 0;
        item.addEventListener('click', (e) => {
          window.playSound?.('click');
          e.stopPropagation();
          const now = Date.now();
          const isDoubleClick = (now - lastClick) < 300;
          lastClick = now;

          if (isDoubleClick || item.classList.contains('selected')) {
            openItem(node);
          } else {
            contentArea.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
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

        contentArea.appendChild(item);
      });
    } else {
      // List View Table Structure
      const header = document.createElement('div');
      header.className = 'fileexp-list-header';
      header.innerHTML = `
        <div class="fileexp-col-name">Name</div>
        <div class="fileexp-col-type">Type</div>
        <div class="fileexp-col-size">Size</div>
      `;
      contentArea.appendChild(header);

      entries.forEach((node) => {
        const row = document.createElement('div');
        row.className = 'fileexp-list-row';
        row.setAttribute('tabindex', '0');

        const nameCol = document.createElement('div');
        nameCol.className = 'fileexp-col-name';
        nameCol.innerHTML = `${getIconSVG(node)}<span>${node.name}</span>`;

        const typeCol = document.createElement('div');
        typeCol.className = 'fileexp-col-type';
        typeCol.textContent = getNodeTypeString(node);

        const sizeCol = document.createElement('div');
        sizeCol.className = 'fileexp-col-size';
        sizeCol.textContent = node.type === 'file' ? (node.size || '0 B') : '--';

        row.appendChild(nameCol);
        row.appendChild(typeCol);
        row.appendChild(sizeCol);

        let lastClick = 0;
        row.addEventListener('click', (e) => {
          window.playSound?.('click');
          e.stopPropagation();
          const now = Date.now();
          const isDoubleClick = (now - lastClick) < 300;
          lastClick = now;

          if (isDoubleClick || row.classList.contains('selected')) {
            openItem(node);
          } else {
            contentArea.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            row.classList.add('selected');
            selectedItemNode = node;
            updateStatusbar();
          }
        });

        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            window.playSound?.('click');
            openItem(node);
          }
        });

        contentArea.appendChild(row);
      });
    }
  }

  function openItem(node) {
    if (node.type === 'dir') {
      navigateTo(node.path);
    } else {
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
    contentArea.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
    selectedItemNode = null;
    updateStatusbar();
  });

  // Toolbar actions
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

  viewBtn.addEventListener('click', () => {
    window.playSound?.('click');
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('fileexp-view-mode', viewMode);
    viewBtn.innerHTML = viewMode === 'grid' ? '⬡ VIEW: GRID' : '⬡ VIEW: LIST';

    contentArea.className = viewMode === 'grid' ? 'fileexp-grid' : 'fileexp-list';
    renderContent();
  });

  // Initial load
  navigateTo(currentPath, false);

  return container;
}

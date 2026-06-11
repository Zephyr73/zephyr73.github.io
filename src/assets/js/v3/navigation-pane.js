/**
 * navigation-pane.js — TTY Navigation Pane (File System Tree)
 */
let sortType = 'alpha'; // 'alpha' or 'type'
let onFileSelectCallback = null;
// Initialize Navigation Pane
export function initNavPane({ openApp }) {
  onFileSelectCallback = openApp;
  const treeContainer = document.getElementById('nav-tree');
  const sortBtn = document.getElementById('nav-sort-btn');
  const themeSelect = document.getElementById('nav-theme-select');
  if (!treeContainer) return;
  // Render initial tree
  renderTree();
  // Setup sorting toggle
  sortBtn?.addEventListener('click', () => {
    window.playSound?.('click');
    sortType = sortType === 'alpha' ? 'type' : 'alpha';
    sortBtn.textContent = sortType === 'alpha' ? 'SORT:A-Z' : 'SORT:TYPE';
    renderTree();
  });
  // Setup theme changer
  if (themeSelect) {
    const savedTheme = localStorage.getItem('v3-theme') || 'green';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    themeSelect.addEventListener('change', (e) => {
      window.playSound?.('click');
      const theme = e.target.value;
      localStorage.setItem('v3-theme', theme);
      applyTheme(theme);
    });
  }
  // Set up stats & volume info
  updateStatsAndVolume();
}
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('v3-theme', theme);
  localStorage.setItem('theme', theme);

  document.querySelectorAll('.browser-viewport iframe').forEach((iframe) => {
    try {
      iframe.contentWindow?.applyTheme?.(theme);
    } catch {
      // Ignore cross-origin security errors if iframe loaded external URL
    }
  });
}
function updateStatsAndVolume() {
  let foldersCount = 0;
  let filesCount = 0;
  let totalSizeBytes = 0;
  function traverse(node) {
    if (node.type === 'dir') {
      foldersCount++;
      if (node.children) {
        node.children.forEach(traverse);
      }
    } else if (node.type === 'file') {
      filesCount++;
      const sz = node.size || '';
      const num = parseFloat(sz);
      if (!isNaN(num)) {
        if (sz.includes('MB')) totalSizeBytes += num * 1024 * 1024;
        else if (sz.includes('KB')) totalSizeBytes += num * 1024;
        else totalSizeBytes += num;
      }
    }
  }
  const fsRoot = window.__FS_TREE__;
  if (fsRoot && fsRoot.children) {
    fsRoot.children.forEach(traverse);
  }
  const statsEl = document.getElementById('nav-stats');
  if (statsEl) {
    statsEl.textContent = `Folders: ${foldersCount} | Files: ${filesCount}`;
  }
  const volEl = document.querySelector('.nav-pane__footer .vol-info');
  if (volEl) {
    const usedMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);
    volEl.textContent = `Volume: ${usedMb}MB / 50.0MB`;
  }
}
function sortNodes(nodes) {
  const list = [...nodes];
  if (sortType === 'alpha') {
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } else {
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (a.type === 'dir') return a.name.localeCompare(b.name);
      const extA = (a.fileType || '').toLowerCase();
      const extB = (b.fileType || '').toLowerCase();
      if (extA !== extB) return extA.localeCompare(extB);
      return a.name.localeCompare(b.name);
    });
  }
}
function renderTree() {
  const container = document.getElementById('nav-tree');
  if (!container) return;
  // Cache open folders paths
  const openPaths = new Set(
    Array.from(container.querySelectorAll('.tree-node.open')).map((el) => el.dataset.path),
  );
  window.__OPEN_PATHS__ = openPaths;
  container.innerHTML = '';
  const fsRoot = window.__FS_TREE__;
  if (fsRoot && fsRoot.children) {
    const sorted = sortNodes(fsRoot.children);
    const fragment = document.createDocumentFragment();
    sorted.forEach((child) => {
      fragment.appendChild(createNodeEl(child));
    });
    container.appendChild(fragment);
  }
  delete window.__OPEN_PATHS__;
}
// ASCII icon map — no emojis, cyberpunk style
const FILE_ICONS = {
  dir: '[D]',
  md: 'MD',
  html: 'WB',
  img: 'IM',
  pdf: 'PD',
  txt: 'TX',
  js: 'JS',
  json: 'JS',
  css: 'CS',
  other: '--',
};
function createNodeEl(node) {
  const nodeEl = document.createElement('div');
  nodeEl.className = 'tree-node';
  nodeEl.dataset.path = node.path;
  const rowEl = document.createElement('div');
  rowEl.className = 'tree-node__row';
  rowEl.setAttribute('role', 'treeitem');
  rowEl.dataset.path = node.path;
  const toggleEl = document.createElement('span');
  toggleEl.className = 'tree-node__toggle';
  const iconEl = document.createElement('span');
  const isFolderOpen = window.__OPEN_PATHS__ && window.__OPEN_PATHS__.has(node.path);
  if (node.type === 'dir') {
    if (isFolderOpen) {
      nodeEl.classList.add('open');
      toggleEl.textContent = '[-]';
    } else {
      toggleEl.textContent = '[+]';
    }
    iconEl.className = 'tree-node__icon icon-dir';
    iconEl.textContent = FILE_ICONS.dir;
  } else {
    toggleEl.textContent = '  ';
    const fileType = node.fileType || 'other';
    iconEl.className = `tree-node__icon icon-${fileType}`;
    iconEl.textContent = FILE_ICONS[fileType] || FILE_ICONS.other;
  }
  const nameEl = document.createElement('span');
  nameEl.className = 'tree-node__name';
  nameEl.textContent = node.name;
  rowEl.appendChild(toggleEl);
  rowEl.appendChild(iconEl);
  rowEl.appendChild(nameEl);
  nodeEl.appendChild(rowEl);
  if (node.type === 'dir') {
    const childrenCont = document.createElement('div');
    childrenCont.className = 'tree-node__children';
    // Eagerly render sorted children (ensures sort always applies immediately)
    if (node.children && node.children.length > 0) {
      const sortedChildren = sortNodes(node.children);
      sortedChildren.forEach((child) => {
        childrenCont.appendChild(createNodeEl(child));
      });
    }
    nodeEl.appendChild(childrenCont);
    rowEl.addEventListener('click', (e) => {
      window.playSound?.('click');
      e.stopPropagation();
      const isOpen = nodeEl.classList.toggle('open');
      toggleEl.textContent = isOpen ? '[-]' : '[+]';
      document
        .querySelectorAll('.tree-node__row.selected')
        .forEach((el) => el.classList.remove('selected'));
      rowEl.classList.add('selected');
    });
  } else {
    rowEl.addEventListener('click', (e) => {
      window.playSound?.('click');
      e.stopPropagation();
      document
        .querySelectorAll('.tree-node__row.selected')
        .forEach((el) => el.classList.remove('selected'));
      rowEl.classList.add('selected');
      // Dismiss navigation drawer on mobile selection
      document.getElementById('mode-tty')?.classList.remove('nav-pane-open');
      if (onFileSelectCallback) {
        onFileSelectCallback(node);
      }
    });
  }
  return nodeEl;
}

/**
 * shell.js — Portfolio 3.0 Core Orchestrator
 * Manages: modes, window manager, status bar, CRT, app registry
 */
import { initDesktop } from './desktop.js';
import { initNavPane, applyTheme } from './navigation-pane.js';
import { initTerminal } from './terminal.js';
import { createBrowserApp    } from './apps/browser.js';
import { createFileExpApp    } from './apps/file-explorer.js';
import { createMarkdownApp   } from './apps/markdown-viewer.js';
import { createGalleryApp    } from './apps/gallery.js';
import { createPdfApp        } from './apps/pdf-viewer.js';
/* ─────────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────────── */
let currentMode = localStorage.getItem('v3-mode') || 'desktop';
let crtActive = localStorage.getItem('v3-crt') === '1';
let windowIdCounter = 0;
const openWindows = new Map(); // id → { el, state, appName, title }
let topZ = 200;
let activeSplitWindowId = null; // tracks the currently focused split window
/* ─────────────────────────────────────────────────────────────
   SOUND ENGINE (Web Audio API — procedural, no files needed)
───────────────────────────────────────────────────────────── */
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
export function playSound(type) {
  try {
    const ctx = _getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    switch (type) {
      case 'click':
        // Warm mechanical thock keyboard click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      case 'open':
        // Rising double mechanical click/pop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
        
        // Second popup click
        osc.frequency.setValueAtTime(190, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        gain.gain.setValueAtTime(0.25, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      case 'close':
        // Deep mechanical key drop thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      case 'minimize':
        // Bouncy hollow mechanical pop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'maximize':
        // A crisp double mechanical tap
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
        osc.frequency.setValueAtTime(220, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.10);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        gain.gain.setValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
        osc.start(now);
        osc.stop(now + 0.10);
        break;
      case 'error': {
        // Double oscillator warning key-thud/buzz
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
        
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
        
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        subGain.gain.setValueAtTime(0.05, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        
        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.25);
        subOsc.stop(now + 0.25);
        break;
      }
      default:
        osc.stop(now);
    }
  } catch {
    // Silently fail if audio not available
  }
}
/* ─────────────────────────────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────────────────────────────── */
const modeDesktop  = document.getElementById('mode-desktop');
const modeTTY      = document.getElementById('mode-tty');
const tabDesktop   = document.getElementById('tab-desktop');
const tabTTY       = document.getElementById('tab-tty');
const styleToggle  = document.getElementById('style-toggle');
const styleMenu    = document.getElementById('style-menu');
const activeApps   = document.getElementById('statusbar-active-apps');
const floatCont    = document.getElementById('desktop-floating-container');
const splitPane    = document.getElementById('tty-split-pane');
const resizeSplit  = document.getElementById('resize-split');
const body         = document.body;
/* ─────────────────────────────────────────────────────────────
   APP REGISTRY
   Maps file extensions → app factory functions
───────────────────────────────────────────────────────────── */
const APP_REGISTRY = {
  md: (path, title) => createMarkdownApp(path, title),
  html: (path, title) => createBrowserApp(path, title),
  pdf: (path, title) => createPdfApp(path, title),
  img: (path, title) => createGalleryApp(path, title),
  dir: (path, title) => createFileExpApp(path, title),
  other: (path, title) => createMarkdownApp(path, title), // raw text fallback
};
function getAppForFile(node) {
  if (!node) return null;
  if (node.type === 'dir') return 'dir';
  const ft = node.fileType || 'other';
  return ft in APP_REGISTRY ? ft : 'other';
}
/* ─────────────────────────────────────────────────────────────
   PUBLIC: openApp
   Opens any named app (browser, fileExplorer) or a file node.
───────────────────────────────────────────────────────────── */
export function openApp(appNameOrNode, pathArg, titleArg) {
  let appFactory, filePath, title;
  if (typeof appNameOrNode === 'string' && !pathArg) {
    // Named app with no file (e.g. 'browser', 'fileExplorer')
    switch (appNameOrNode) {
      case 'browser':
        appFactory = () => createBrowserApp('/v2/', 'Portfolio');
        title = 'Portfolio Browser';
        filePath = '/v2/';
        break;
      case 'fileExplorer':
        appFactory = () => createFileExpApp('/', 'File Explorer');
        title = 'File Explorer';
        filePath = '/';
        break;
      case 'terminal':
        // Open a floating terminal in desktop mode
        appFactory = () => createTerminalFloatApp();
        title = 'Console';
        filePath = null;
        break;
      default:
        console.warn('Unknown app:', appNameOrNode);
        return;
    }
  } else if (typeof appNameOrNode === 'object') {
    // File node from navigation pane
    const node = appNameOrNode;
    const appType = getAppForFile(node);
    appFactory = () => APP_REGISTRY[appType](node.path, node.name);
    title = node.name;
    filePath = node.path;
  } else {
    // Explicit app + path
    const appType = appNameOrNode;
    appFactory = () =>
      APP_REGISTRY[appType]?.(pathArg, titleArg) ?? createMarkdownApp(pathArg, titleArg);
    title = titleArg || pathArg;
    filePath = pathArg;
  }
  const id = ++windowIdCounter;
  const appEl = appFactory();
  if (!appEl) return;
  if (currentMode === 'desktop') {
    _openFloating(id, appEl, title, filePath);
  } else {
    // TTY: open in split pane (or floating if split is occupied)
    _openSplit(id, appEl, title, filePath);
  }
}
/* ─────────────────────────────────────────────────────────────
   WINDOW CREATION HELPERS
───────────────────────────────────────────────────────────── */
function _buildWindow(id, appEl, title, filePath, state) {
  const win = document.createElement('div');
  win.className = `window window--${state}`;
  win.dataset.windowId = id;
  win.id = `win-${id}`;
  // Build title bar
  const tbar = document.createElement('div');
  tbar.className = 'window-titlebar';
  tbar.setAttribute('role', 'toolbar');
  // Icon
  const iconEl = document.createElement('span');
  iconEl.className = 'window-titlebar-icon';
  iconEl.innerHTML = _getAppIcon(title, filePath);
  tbar.appendChild(iconEl);
  // Title
  const titleEl = document.createElement('span');
  titleEl.className = 'window-titlebar-title';
  titleEl.textContent = title;
  titleEl.setAttribute('aria-label', `Window: ${title}`);
  tbar.appendChild(titleEl);
  // Path (if file)
  if (filePath && filePath !== '/') {
    const pathEl = document.createElement('span');
    pathEl.className = 'window-titlebar-path';
    pathEl.textContent = `› ${filePath}`;
    tbar.appendChild(pathEl);
  }
  // Buttons
  const btns = document.createElement('div');
  btns.className = 'window-titlebar-btns';
  // Pop-out: only in TTY split state
  if (state === 'split') {
    const popupBtn = document.createElement('button');
    popupBtn.className = 'window-btn window-btn--popup';
    popupBtn.title = 'Pop out to floating window';
    popupBtn.setAttribute('aria-label', 'Pop window out to floating');
    popupBtn.textContent = '[POP]';
    popupBtn.addEventListener('click', () => popUp(id));
    btns.appendChild(popupBtn);
  }
  // Pop-in: only for floating windows in TTY mode
  if (state === 'floating' && currentMode === 'tty') {
    const popinBtn = document.createElement('button');
    popinBtn.className = 'window-btn window-btn--popin';
    popinBtn.id = `popin-btn-${id}`;
    popinBtn.title = 'Pop back into split pane';
    popinBtn.setAttribute('aria-label', 'Pop window into split pane');
    popinBtn.textContent = '[IN]';
    popinBtn.addEventListener('click', () => popIn(id));
    btns.appendChild(popinBtn);
  }
  // Floating-only: maximize and minimize buttons
  if (state === 'floating') {
    const minBtn = document.createElement('button');
    minBtn.className = 'window-btn window-btn--minimize';
    minBtn.title = 'Minimize';
    minBtn.setAttribute('aria-label', 'Minimize window');
    minBtn.textContent = '[_]';
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      minimizeWindow(id);
    });
    btns.appendChild(minBtn);
    const maxBtn = document.createElement('button');
    maxBtn.className = 'window-btn window-btn--maximize';
    maxBtn.title = 'Maximize / Restore';
    maxBtn.setAttribute('aria-label', 'Maximize window');
    maxBtn.textContent = '[M]';
    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      maximizeWindow(id);
    });
    btns.appendChild(maxBtn);
  }
  // Close button (always)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'window-btn window-btn--close';
  closeBtn.title = 'Close';
  closeBtn.setAttribute('aria-label', 'Close window');
  closeBtn.textContent = '[X]';
  closeBtn.addEventListener('click', () => closeWindow(id));
  btns.appendChild(closeBtn);
  tbar.appendChild(btns);
  win.appendChild(tbar);
  // Body
  const winBody = document.createElement('div');
  winBody.className = 'window-body';
  winBody.appendChild(appEl);
  if (state === 'floating') {
    const overlay = document.createElement('div');
    overlay.className = 'window-iframe-overlay';
    winBody.appendChild(overlay);
  }
  win.appendChild(winBody);
  // Drag (floating only)
  if (state === 'floating') {
    _makeDraggable(win, tbar);
    // Resize handles
    ['e', 's', 'se'].forEach((dir) => {
      const handle = document.createElement('div');
      handle.className = `window-resize-${dir}`;
      win.appendChild(handle);
      _makeResizeHandle(win, handle, dir);
    });
  }
  // Click to focus
  win.addEventListener('mousedown', () => focusWindow(id), true);
  return win;
}
function _getAppIcon(title, filePath) {
  const t = (title || '').toLowerCase();
  const p = (filePath || '').toLowerCase();
  if (t.includes('browser') || t.includes('portfolio') || t.includes('web')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  }
  if (p.endsWith('.pdf')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }
  if (/\.(jpg|jpeg|png|webp|gif)/.test(p)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  if (p.endsWith('.md') || t.includes('markdown') || t.includes('about')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`;
  }
  if (t.includes('explorer') || t.includes('files')) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
  }
  // Console/Terminal
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
}
function _openFloating(id, appEl, title, filePath) {
  const win = _buildWindow(id, appEl, title, filePath, 'floating');
  // Default size & centered position
  const W = Math.min(900, window.innerWidth - 80);
  const H = Math.min(640, window.innerHeight - 80);
  const L = Math.round((window.innerWidth - W) / 2) + (id % 5) * 20;
  const T = Math.round((window.innerHeight - H) / 2) + (id % 5) * 20 - 20;
  win.style.width  = `${W}px`;
  win.style.height = `${H}px`;
  win.style.left   = `${L}px`;
  win.style.top    = `${T}px`;
  floatCont.appendChild(win);
  playSound('open');
  openWindows.set(id, { el: win, state: 'floating', appName: title, title, filePath });
  focusWindow(id);
  _addAppTab(id, title);
}
function rootMatchesDir(el, dir) {
  const currentDir = el.style.flexDirection || 'column';
  return currentDir === dir;
}

function _openSplit(id, appEl, title, filePath) {
  const win = _buildWindow(id, appEl, title, filePath, 'split');
  
  // Set up splitPane visibility & initial width if this is the first pane being opened
  const isFirst = !splitPane.classList.contains('visible');
  if (isFirst) {
    splitPane.innerHTML = '';
    splitPane.classList.add('visible');
    resizeSplit.classList.remove('hidden');
    
    // Default: cap split pane at 50% of available TTY area width
    const totalW = window.innerWidth;
    const navW = document.getElementById('tty-nav-pane')?.offsetWidth || 280;
    const available = totalW - navW - 8; // subtract nav + handles
    const maxHalf = Math.floor(available * 0.5);
    splitPane.style.width = `${maxHalf}px`;
    splitPane.style.flex = 'none';
    splitPane.style.flexDirection = 'column'; // Root layout default is column (stacked rows)
  }

  // Find where to place the new split window
  let targetEl = null;
  
  if (activeSplitWindowId !== null) {
    const targetInfo = openWindows.get(activeSplitWindowId);
    if (targetInfo && targetInfo.state === 'split' && splitPane.contains(targetInfo.el)) {
      targetEl = targetInfo.el;
    }
  }
  
  if (!targetEl) {
    // Fallback: split the last window currently inside the split pane
    const allWindows = splitPane.querySelectorAll('.window--split');
    if (allWindows.length > 0) {
      targetEl = allWindows[allWindows.length - 1];
    }
  }

  if (targetEl) {
    // Determine optimal split direction based on the target element's client dimensions
    const rect = targetEl.getBoundingClientRect();
    const splitDir = rect.width >= rect.height ? 'row' : 'column';
    const targetParent = targetEl.parentElement;
    
    // If the parent container has the exact class/direction we want,
    // we insert next to it to prevent redundant nested containers.
    const isParentMatching = targetParent.classList.contains(`split-container--${splitDir}`) || 
                            (targetParent === splitPane && rootMatchesDir(splitPane, splitDir));
    
    if (isParentMatching) {
      targetParent.insertBefore(win, targetEl.nextSibling);
    } else {
      // Create a sub-container
      const container = document.createElement('div');
      container.className = `split-container split-container--${splitDir}`;
      
      // Swap targetEl with container in its parent
      targetParent.replaceChild(container, targetEl);
      
      // Put targetEl and win inside container
      container.appendChild(targetEl);
      container.appendChild(win);
    }
  } else {
    // If it's the absolute first window, append directly to splitPane
    splitPane.appendChild(win);
  }

  openWindows.set(id, { el: win, state: 'split', appName: title, title, filePath });
  _addAppTab(id, title);
  
  // Focus the newly opened split window
  focusWindow(id);
}
/* ─────────────────────────────────────────────────────────────
   SPLIT TREE CLEANUP HELPER
───────────────────────────────────────────────────────────── */
function _cleanupSplitTree(parentEl) {
  const root = splitPane;
  if (!parentEl || parentEl === root) {
    // If the root itself has only one child and that child is a split-container,
    // we flatten it by promoting its children to the root.
    if (root && root.children.length === 1 && root.firstElementChild.classList.contains('split-container')) {
      const subContainer = root.firstElementChild;
      const children = Array.from(subContainer.children);
      
      // Update root flex direction to match sub-container
      if (subContainer.classList.contains('split-container--row')) {
        root.style.flexDirection = 'row';
      } else if (subContainer.classList.contains('split-container--column')) {
        root.style.flexDirection = 'column';
      }
      
      for (const child of children) {
        root.appendChild(child);
      }
      subContainer.remove();
    }
    
    // If root is empty, hide split pane
    if (root && root.children.length === 0) {
      root.classList.remove('visible');
      resizeSplit?.classList.add('hidden');
      activeSplitWindowId = null;
    }
    return;
  }

  const grandParent = parentEl.parentElement;

  if (parentEl.children.length === 0) {
    parentEl.remove();
    _cleanupSplitTree(grandParent);
  } else if (parentEl.children.length === 1) {
    const soleChild = parentEl.firstElementChild;
    // Replace parentEl with soleChild in grandParent
    grandParent.replaceChild(soleChild, parentEl);
    _cleanupSplitTree(grandParent);
  }
}
/* ─────────────────────────────────────────────────────────────
   POP UP / POP IN
───────────────────────────────────────────────────────────── */
export function popUp(id) {
  const info = openWindows.get(id);
  if (!info || info.state !== 'split') return;
  
  const winEl = info.el;
  const parentEl = winEl.parentElement;
  
  // Extract content
  const appBody = winEl.querySelector('.window-body');
  const appContent = appBody?.firstElementChild;
  
  // Remove window from DOM
  winEl.remove();
  
  // Clean up the split tree
  _cleanupSplitTree(parentEl);
  
  // Re-create as floating
  if (appContent) {
    const newId = ++windowIdCounter;
    openWindows.delete(id);
    _removeAppTab(id);
    _openFloating(newId, appContent, info.title, info.filePath);
  }
}
export function popIn(id) {
  const info = openWindows.get(id);
  if (!info || info.state !== 'floating' || currentMode !== 'tty') return;
  const winBody = info.el.querySelector('.window-body');
  const appContent = winBody?.firstElementChild;
  // Remove floating
  info.el.remove();
  openWindows.delete(id);
  _removeAppTab(id);
  // Re-open in split
  if (appContent) {
    const newId = ++windowIdCounter;
    _openSplit(newId, appContent, info.title, info.filePath);
  }
}
/* ─────────────────────────────────────────────────────────────
   MAXIMIZE / MINIMIZE
───────────────────────────────────────────────────────────── */
export function maximizeWindow(id) {
  const info = openWindows.get(id);
  if (!info || info.state !== 'floating') return;
  playSound('maximize');
  const win = info.el;
  if (win.dataset.maximized === '1') {
    // Restore
    win.style.width = win.dataset.prevW || '900px';
    win.style.height = win.dataset.prevH || '640px';
    win.style.left = win.dataset.prevL || '80px';
    win.style.top = win.dataset.prevT || '60px';
    win.dataset.maximized = '0';
    win.querySelector('.window-btn--maximize').textContent = '[M]';
  } else {
    // Save and maximize
    win.dataset.prevW = win.style.width;
    win.dataset.prevH = win.style.height;
    win.dataset.prevL = win.style.left;
    win.dataset.prevT = win.style.top;
    win.style.width  = '100%';
    win.style.height = 'calc(100% - var(--status-bar-h))';
    win.style.width  = '100%';
    win.style.height = 'calc(100% - var(--status-bar-h))';
    win.style.left   = '0px';
    win.style.top    = '0px';
    win.dataset.maximized = '1';
    win.querySelector('.window-btn--maximize').textContent = '[R]';
  }
  focusWindow(id);
}
export function minimizeWindow(id) {
  const info = openWindows.get(id);
  if (!info || info.state !== 'floating') return;
  const win = info.el;
  const isMinimized = win.classList.contains('window--minimized');
  if (isMinimized) {
    // Restore
    win.classList.remove('window--minimized');
    win.querySelector('.window-btn--minimize').textContent = '[_]';
    const tabR = document.getElementById(`apptab-${id}`);
    if (tabR) tabR.classList.remove('minimized');
    playSound('minimize');
    focusWindow(id);
  } else {
    // Minimize
    win.classList.add('window--minimized');
    win.querySelector('.window-btn--minimize').textContent = '[_]';
    const tabM = document.getElementById(`apptab-${id}`);
    if (tabM) tabM.classList.add('minimized');
    win.classList.remove('focused');
    playSound('minimize');
  }
}
/* ─────────────────────────────────────────────────────────────
   CLOSE WINDOW
───────────────────────────────────────────────────────────── */
export function closeWindow(id) {
  const info = openWindows.get(id);
  if (!info) return;
  playSound('close');
  
  if (info.state === 'split') {
    const winEl = info.el;
    const parentEl = winEl.parentElement;
    
    // Call cleanup if app has it
    const appBody = winEl.querySelector('.window-body');
    const appContent = appBody?.firstElementChild;
    if (appContent && typeof appContent.cleanup === 'function') {
      appContent.cleanup();
    }
    
    winEl.remove();
    _cleanupSplitTree(parentEl);
  } else {
    info.el.style.animation = 'win-close 80ms ease-in forwards';
    setTimeout(() => {
      const appBody = info.el.querySelector('.window-body');
      const appContent = appBody?.firstElementChild;
      if (appContent && typeof appContent.cleanup === 'function') {
        appContent.cleanup();
      }
      info.el.remove();
    }, 80);
  }
  openWindows.delete(id);
  _removeAppTab(id);
}
/* ─────────────────────────────────────────────────────────────
   FOCUS WINDOW
───────────────────────────────────────────────────────────── */
export function focusWindow(id) {
  // Remove focused class from all windows and tabs
  document.querySelectorAll('.window.focused').forEach(w => w.classList.remove('focused'));
  document.querySelectorAll('.statusbar-app-tab.focused').forEach(t => t.classList.remove('focused'));
  
  const info = openWindows.get(id);
  if (!info) return;
  
  if (info.state === 'floating') {
    info.el.style.zIndex = ++topZ;
  } else if (info.state === 'split') {
    activeSplitWindowId = id;
  }
  
  info.el.classList.add('focused');
  const tab = document.getElementById(`apptab-${id}`);
  if (tab) tab.classList.add('focused');
}
/* ─────────────────────────────────────────────────────────────
   DRAG & RESIZE
───────────────────────────────────────────────────────────── */
function _makeDraggable(win, handle) {
  let startX, startY, origLeft, origTop;
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('.window-btn')) return; // don't drag on button clicks
    if (win.dataset.maximized === '1') return;   // don't drag if maximized
    e.preventDefault();
    document.body.classList.add('resize-active');
    startX   = e.clientX;
    startY   = e.clientY;
    origLeft = parseInt(win.style.left) || 0;
    origTop  = parseInt(win.style.top)  || 0;
    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.left = `${Math.max(0, origLeft + dx)}px`;
      win.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, origTop + dy))}px`;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('resize-active');
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
function _makeResizeHandle(win, handle, dir) {
  handle.addEventListener('mousedown', (e) => {
    if (win.dataset.maximized === '1') return; // don't resize if maximized
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.add('resize-active');
    const startX  = e.clientX;
    const startY  = e.clientY;
    const origW   = win.offsetWidth;
    const origH   = win.offsetHeight;
    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dir === 'e' || dir === 'se') win.style.width = `${Math.max(300, origW + dx)}px`;
      if (dir === 's' || dir === 'se') win.style.height = `${Math.max(200, origH + dy)}px`;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('resize-active');
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
/* ─────────────────────────────────────────────────────────────
   STATUS BAR APP TABS
───────────────────────────────────────────────────────────── */
function _addAppTab(id, title) {
  const tab = document.createElement('div');
  tab.className = 'statusbar-app-tab';
  tab.id = `apptab-${id}`;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-label', `Switch to ${title}`);
  tab.innerHTML = `<span>${title.length > 18 ? title.slice(0, 16) + '…' : title}</span>`;
  tab.addEventListener('click', () => {
    playSound('click');
    const info = openWindows.get(id);
    if (info?.el?.classList.contains('window--minimized')) {
      minimizeWindow(id); // toggles restore
    } else {
      focusWindow(id);
    }
  });
  activeApps.appendChild(tab);
}
function _removeAppTab(id) {
  document.getElementById(`apptab-${id}`)?.remove();
}
/* ─────────────────────────────────────────────────────────────
   MODE SWITCHING
───────────────────────────────────────────────────────────── */
function switchMode(mode) {
  // Minimize open apps on mobile when switching to desktop or tty shell mode
  // We do this at the start so that if an app is open, clicking the current active tab still minimizes it
  if (window.innerWidth <= 768) {
    for (const [id, info] of openWindows.entries()) {
      if (info.state === 'floating') {
        const isMinimized = info.el.classList.contains('window--minimized');
        if (!isMinimized) {
          minimizeWindow(id);
        }
      }
    }
  }

  if (mode === currentMode) return;
  currentMode = mode;
  localStorage.setItem('v3-mode', mode);
  modeDesktop.classList.toggle('active', mode === 'desktop');
  modeTTY.classList.toggle('active',     mode === 'tty');
  tabDesktop.classList.toggle('active', mode === 'desktop');
  tabTTY.classList.toggle('active', mode === 'tty');
  tabDesktop.setAttribute('aria-selected', String(mode === 'desktop'));
  tabTTY.setAttribute('aria-selected', String(mode === 'tty'));

  // Move any floating windows into the correct container
  if (mode === 'tty') {
    // Move floating container into TTY mode
    modeTTY.appendChild(floatCont);
    floatCont.style.zIndex = '200';
  } else {
    modeDesktop.appendChild(floatCont);
  }
}
/* ─────────────────────────────────────────────────────────────
   CRT TOGGLE
───────────────────────────────────────────────────────────── */
function toggleCRT() {
  crtActive = !crtActive;
  body.classList.toggle('crt-active', crtActive);
  localStorage.setItem('v3-crt', crtActive ? '1' : '0');
}
/* ─────────────────────────────────────────────────────────────
   STYLE MENU & WALLPAPER CYCLING
───────────────────────────────────────────────────────────── */
const WALLPAPERS = [
  {
    name: 'Cyber Grid',
    background: 'radial-gradient(ellipse at 20% 80%, rgba(0, 255, 65, 0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0, 229, 255, 0.02) 0%, transparent 60%), var(--cp-bg)',
    showGrid: true,
  },
  {
    name: 'Synth Wave',
    background: 'linear-gradient(135deg, #2b0830 0%, #080f30 100%)',
    showGrid: true,
  },
  {
    name: 'Deep Space',
    background: 'radial-gradient(circle at center, #0a1b2a 0%, #030810 100%)',
    showGrid: false,
  }
];

let currentWallpaperIdx = 0;

function setWallpaper(idx) {
  if (idx < 0 || idx >= WALLPAPERS.length) {
    idx = 0;
  }
  currentWallpaperIdx = idx;
  const wp = WALLPAPERS[currentWallpaperIdx];
  const modeDesktop = document.getElementById('mode-desktop');
  if (modeDesktop) {
    modeDesktop.style.background = wp.background;
    modeDesktop.classList.toggle('hide-grid', !wp.showGrid);
  }
  localStorage.setItem('v3-wallpaper', currentWallpaperIdx);
  
  // Update status text in style menu
  const statusEl = document.getElementById('style-wallpaper-status');
  if (statusEl) {
    statusEl.textContent = wp.name;
  }
}

function initStyleMenu() {
  const themeSelect = document.getElementById('style-theme-select');
  const crtBtn = document.getElementById('style-crt-btn');
  const crtStatus = document.getElementById('style-crt-status');
  const wallpaperBtn = document.getElementById('style-wallpaper-btn');

  if (!styleToggle || !styleMenu) return;

  // Toggle menu visibility
  styleToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('click');
    styleMenu.classList.toggle('hidden');
  });

  // Click outside to dismiss menu
  document.addEventListener('click', (e) => {
    if (!styleMenu.classList.contains('hidden') && !styleMenu.contains(e.target) && e.target !== styleToggle) {
      styleMenu.classList.add('hidden');
    }
  });

  // Initialize and Sync active theme
  const activeTheme = localStorage.getItem('v3-theme') || 'green';
  if (themeSelect) {
    themeSelect.value = activeTheme;
    themeSelect.addEventListener('change', (e) => {
      playSound('click');
      const theme = e.target.value;
      
      themeSelect.value = theme;
      applyTheme(theme);
    });
  }

  // Initialize and Toggle CRT bloom state
  const updateCrtStatusUI = () => {
    if (crtStatus) {
      crtStatus.textContent = crtActive ? 'ON' : 'OFF';
      crtStatus.style.color = crtActive ? 'var(--cp-green)' : 'var(--cp-amber)';
      crtStatus.style.borderColor = crtActive ? 'var(--cp-green)' : 'var(--cp-border-2)';
    }
  };
  
  updateCrtStatusUI();
  
  crtBtn?.addEventListener('click', () => {
    playSound('click');
    toggleCRT();
    updateCrtStatusUI();
  });

  // Initialize Wallpaper state on startup
  const savedWpIdx = parseInt(localStorage.getItem('v3-wallpaper')) || 0;
  setWallpaper(savedWpIdx);

  wallpaperBtn?.addEventListener('click', () => {
    playSound('click');
    const nextIdx = (currentWallpaperIdx + 1) % WALLPAPERS.length;
    setWallpaper(nextIdx);
  });
}
/* ─────────────────────────────────────────────────────────────
   STATUS BAR: CLOCK & STATS
───────────────────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const hh = String(h).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  document.getElementById('clock-time').textContent = `${hh}:${mm} ${ampm}`;
  document.getElementById('clock-date').textContent =
    `${days[now.getDay()]} ${now.getDate()}, ${now.getFullYear()}`;
}
// Fake stats for immersion — fluctuate around realistic baselines
let _cpuBase = 8,
  _gpuBase = 5,
  _memBase = 4.2,
  _satBase = 87;
function updateStats() {
  const jitter = (base, range) => Math.max(0, Math.min(99, base + (Math.random() - 0.5) * range));
  const cpu  = Math.round(jitter(_cpuBase, 8));
  const gpu  = Math.round(jitter(_gpuBase, 6));
  const mem  = (jitter(_memBase, 0.4)).toFixed(1);
  const sat  = Math.round(jitter(_satBase, 4));
  document.getElementById('stat-cpu').textContent = `${String(cpu).padStart(2,'0')}%`;
  document.getElementById('stat-gpu').textContent = `${String(gpu).padStart(2,'0')}%`;
  document.getElementById('stat-mem').textContent = `${mem}G`;
  document.getElementById('stat-sat').textContent = `${String(sat).padStart(2, '0')}%`;
}
/* ─────────────────────────────────────────────────────────────
   PANE RESIZE (nav pane drag handle)
───────────────────────────────────────────────────────────── */
function initPaneResize() {
  const navPane = document.getElementById('tty-nav-pane');
  const navHandle = document.getElementById('resize-nav');
  const ttyMode   = document.getElementById('mode-tty');
  if (!navPane || !navHandle) return;
  let dragging = false;
  navHandle.addEventListener('mousedown', (e) => {
    dragging = true;
    navHandle.classList.add('dragging');
    document.body.classList.add('resize-active');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = ttyMode.getBoundingClientRect();
    const newW = Math.max(140, Math.min(400, e.clientX - rect.left));
    navPane.style.width = `${newW}px`;
    document.documentElement.style.setProperty('--nav-pane-w', `${newW}px`);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    navHandle.classList.remove('dragging');
    document.body.classList.remove('resize-active');
  });
  // Split pane resize handle — use rAF to prevent layout thrash
  const splitHandle = document.getElementById('resize-split');
  let splitDragging = false;
  let splitRafId = null;
  let lastSplitClientX = 0;
  splitHandle?.addEventListener('mousedown', e => {
    splitDragging = true;
    splitHandle.classList.add('dragging');
    document.body.classList.add('resize-active');
    splitPane.style.willChange = 'width';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!splitDragging) return;
    lastSplitClientX = e.clientX;
    if (splitRafId) return; // already scheduled
    splitRafId = requestAnimationFrame(() => {
      splitRafId = null;
      const rect = ttyMode.getBoundingClientRect();
      const navW = navPane.offsetWidth + 4;
      const totalW = rect.width;
      const splitW = Math.max(
        200,
        Math.min(totalW - navW - 200, totalW - (lastSplitClientX - rect.left)),
      );
      splitPane.style.width = `${splitW}px`;
      splitPane.style.flex = 'none';
    });
  });
  document.addEventListener('mouseup', () => {
    if (!splitDragging) return;
    splitDragging = false;
    splitHandle?.classList.remove('dragging');
    document.body.classList.remove('resize-active');
    splitPane.style.willChange = '';
  });
}
/* ─────────────────────────────────────────────────────────────
   FLOATING TERMINAL (for desktop mode console icon)
───────────────────────────────────────────────────────────── */
function createTerminalFloatApp() {
  const el = document.createElement('div');
  el.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
  const out = document.createElement('div');
  out.style.cssText = 'flex:1;overflow-y:auto;padding:10px 14px;font-size:12px;line-height:1.7;font-family:var(--font-mono);background:var(--cp-bg);color:var(--cp-white);';
  // Initial draw from buffer
  const renderBuffer = () => {
    out.innerHTML = '';
    window.__TERMINAL_SESSION__.buffer.forEach((event) => {
      const div = document.createElement('div');
      div.className = `console-line ${event.type}`;
      if (/<[a-z][\s\S]*>/i.test(event.text)) {
        div.innerHTML = event.text;
      } else {
        div.textContent = event.text;
      }
      out.appendChild(div);
    });
    out.scrollTop = out.scrollHeight;
  };
  renderBuffer();
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;padding:6px 14px;border-top:1px solid var(--cp-border);background:var(--cp-panel);gap:8px;';
  const prompt = document.createElement('span');
  prompt.style.cssText = 'color:var(--cp-green);font-size:12px;white-space:nowrap;';
  const currentCwd = window.__TERMINAL_SESSION__.cwd || '/';
  prompt.textContent = `guest@portfolio:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
  const inp = document.createElement('input');
  inp.style.cssText =
    'flex:1;background:transparent;border:none;color:var(--cp-white);font-family:var(--font-mono);font-size:12px;outline:none;';
  inp.placeholder = 'type a command...';
  let histIdx = -1;
  // Subscribe to changes
  const unsubscribe = window.__TERMINAL_SESSION__.subscribe((event) => {
    if (event.type === 'clear') {
      out.innerHTML = '';
    } else if (event.type === 'write') {
      const div = document.createElement('div');
      div.className = `console-line ${event.lineType}`;
      if (/<[a-z][\s\S]*>/i.test(event.text)) {
        div.innerHTML = event.text;
      } else {
        div.textContent = event.text;
      }
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    }
  });
  // Attach cleanup to DOM node
  el.cleanup = unsubscribe;
  inp.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      const cmd = inp.value.trim();
      inp.value = '';
      if (!cmd) return;

      histIdx = -1;
      // Run unified execution on shared session
      await window.__TERMINAL_SESSION__.execute(cmd);
      // Update prompt label in case directory changed
      const currentCwd = window.__TERMINAL_SESSION__.cwd || '/';
      prompt.textContent = `guest@portfolio:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
      out.scrollTop = out.scrollHeight;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = window.__TERMINAL_SESSION__.history;
      if (history.length > 0) {
        histIdx = Math.min(histIdx + 1, history.length - 1);
        inp.value = history[histIdx] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.max(histIdx - 1, -1);
      inp.value = histIdx < 0 ? '' : window.__TERMINAL_SESSION__.history[histIdx];
    }
  });
  row.appendChild(prompt);
  row.appendChild(inp);
  el.appendChild(out);
  el.appendChild(row);
  setTimeout(() => inp.focus(), 100);
  return el;
}
/* ─────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS
───────────────────────────────────────────────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Alt+1 = Desktop, Alt+2 = TTY
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      switchMode('desktop');
    }
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      switchMode('tty');
    }
    // Alt+C = Toggle CRT
    if (e.altKey && e.key === 'c') {
      e.preventDefault();
      toggleCRT();
    }
    // Escape = focus console input in TTY
    if (e.key === 'Escape' && currentMode === 'tty') {
      document.getElementById('console-input')?.focus();
    }
  });
}
/* ─────────────────────────────────────────────────────────────
   BOOT SCREEN SEQUENCE
───────────────────────────────────────────────────────────── */
function initBootScreen() {
  const bootScreen = document.getElementById('boot-screen');
  const bootLogs = document.getElementById('boot-logs');
  const bootProgress = document.getElementById('boot-progress');
  const statusPct = document.getElementById('boot-status-pct');
  if (!bootScreen) return;
  const bootLines = [
    '// ROM BIOS INTEL SANDBOX TX_OS V4.0.5-95638D',
    '',
    '>> SYSTEM_BOOT: SEARCHING FOR CORE LOGIC IMAGE...',
    '>> RAM_CONF: ALLOCATING STORAGE POOLS... 8385',
    '>> DISK_MNT: COMPILING PHYSICAL LOCALSTORAGE SECTOR',
    '>> DISK_MNT: RECOVERY MOUNTING SYSTEM COMPILATION BLOCKS... DONE',
    '>> NET_CONN: LOCAL_IP LOOPBACK VERIFIED AT 127.0.0.1',
    '>> SECURITY: TRIPLE SANDBOX INTEGRITY BUFFER ACTIVE',
    '>> SYS_READY: BOOT LOAD COMPLETED SUCCESSFULLY.',
    '>>',
  ];
  let lineIndex = 0;
  let logText = '';
  let progress = 0;
  let isSkipped = false;
  let logInterval, progressInterval;
  function skipBoot() {
    if (isSkipped) return;
    isSkipped = true;
    clearInterval(logInterval);
    clearInterval(progressInterval);
    bootScreen.classList.add('fade-out');
    setTimeout(() => {
      bootScreen.remove();
    }, 450);
  }
  // Click anywhere to skip
  bootScreen.addEventListener('click', skipBoot);
  // Print lines
  logInterval = setInterval(() => {
    if (lineIndex < bootLines.length) {
      logText += bootLines[lineIndex] + '\n';
      if (bootLogs) {
        bootLogs.textContent = logText;
        bootLogs.scrollTop = bootLogs.scrollHeight;
      }
      lineIndex++;
    } else {
      clearInterval(logInterval);
    }
  }, 180);
  // Animate progress bar (takes ~2.2 seconds)
  progressInterval = setInterval(() => {
    progress += 2;
    if (progress > 100) progress = 100;

    if (bootProgress) bootProgress.style.width = `${progress}%`;
    if (statusPct) statusPct.textContent = `LOAD STATUS: ${progress}% COMPLETE`;
    if (progress >= 100) {
      clearInterval(progressInterval);
      setTimeout(skipBoot, 400);
    }
  }, 40);
}
/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Start boot screen animation
  initBootScreen();
  // Apply saved CRT state
  if (crtActive) {
    body.classList.add('crt-active');
  }
  // Apply saved mode
  const initialMode = currentMode;
  currentMode = null;
  switchMode(initialMode);
  // Status bar events
  tabDesktop.addEventListener('click',  () => { playSound('click'); switchMode('desktop'); });
  tabTTY.addEventListener('click',      () => { playSound('click'); switchMode('tty'); });
  tabDesktop.addEventListener('keydown', e => e.key === 'Enter' && (playSound('click'), switchMode('desktop')));
  tabTTY.addEventListener('keydown',     e => e.key === 'Enter' && (playSound('click'), switchMode('tty')));
  // Clock & stats
  updateClock();
  updateStats();
  setInterval(updateClock, 1000);
  setInterval(updateStats, 2500);
  // Pane resize handles
  initPaneResize();
  // Keyboard shortcuts
  initKeyboard();
  // Initialize style menu
  initStyleMenu();
  // Initialize sub-systems
  initDesktop({ openApp });
  initNavPane({ openApp });
  initTerminal({ openApp });
});
// Expose openApp and playSound globally so apps can open other apps and play sounds
window.playSound = playSound;
window.__shell__ = {
  openApp,
  closeWindow,
  popUp,
  popIn,
  maximizeWindow,
  minimizeWindow,
  playSound,
};

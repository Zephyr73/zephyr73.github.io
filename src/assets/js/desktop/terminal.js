/**
 * terminal.js — Linux-style TTY Terminal Emulator
 * Unified inline-prompt renderer with block cursor, Readline shortcuts,
 * Tab completion, and shared session buffer across TTY & floating windows.
 */

import { ls, cd, pwd, resolvePath, getFileContent, getNodeByPath } from './filesystem.js';
import { startBadApple, stopBadApple, isBadAppleRunning } from './bad-apple.js';

const USER = 'tasrif';
const HOST = 'os';
const COMMANDS = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'open',
  'clear',
  'neofetch',
  'matrix',
  'bad-apple',
  'tree',
  'echo',
  'whoami',
  'hostname',
  'uname',
  'id',
  'uptime',
  'date',
  'history',
  'man',
  'cursor',
  'browser',
  'exit',
];

const MAN_PAGES = {
  ls: 'ls [-l] [-a] [-la] [path] — List directory contents.',
  cd: 'cd [path] — Change the shell working directory (defaults to ~).',
  pwd: 'pwd — Print the full pathname of the current working directory.',
  cat: 'cat <file> — Concatenate and print file contents to standard output.',
  open: 'open <file> — Open a file in the Desktop/Split graphical viewer.',
  clear: 'clear — Clear the terminal screen (also Ctrl+L).',
  tree: 'tree [path] — List contents of directories in a tree-like format.',
  neofetch: 'neofetch — Display system information and color palette.',
  uname: 'uname [-a] — Print system kernel and architecture information.',
  id: 'id — Print real and effective user and group IDs.',
  uptime: 'uptime — Tell how long the system has been running.',
  history: 'history — Display the command history list with line numbers.',
  cursor: 'cursor [block|underline|bar] — View or change the terminal cursor style.',
  matrix: 'matrix — Run a streaming digital rain simulation (Ctrl+C to stop).',
  'bad-apple': 'bad-apple — Play Bad Apple!! ASCII video with 8-bit Web Audio synth.',
  browser: 'browser — Launch the Phosphor Web Engine browser.',
  exit: 'exit — Close the floating terminal window (or Ctrl+D).',
};

let openAppCallback = null;
let getAudioContextCallback = null;
let matrixInterval = null;
let globalInterruptInstalled = false;

function formatTildePath(absPath) {
  if (!absPath || absPath === '/') return '~';
  return `~${absPath}`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPromptHtml(cwdPath = pwd(), exitCode = 0) {
  const pathStr = escapeHtml(formatTildePath(cwdPath));
  const errBadge = exitCode !== 0 ? `<span class="term-prompt-err">[${exitCode}]</span> ` : '';
  return (
    `${errBadge}<span class="term-prompt-user">${USER}@${HOST}</span>` +
    `<span class="term-prompt-sep">:</span>` +
    `<span class="term-prompt-cwd">${pathStr}</span>` +
    `<span class="term-prompt-sigil">$ </span>`
  );
}

/**
 * Tokenizes a command line into character-accurate spans for live syntax highlighting.
 * @param {string} text
 * @returns {Array<{ text: string, cls: string }>}
 */
function tokenizeCommandLine(text) {
  const tokens = [];
  const re = /(\s+|"[^"]*"?|'[^']*'?|[^\s]+)/g;
  let match;
  let seenCmd = false;

  while ((match = re.exec(text)) !== null) {
    const seg = match[0];
    if (/^\s+$/.test(seg)) {
      tokens.push({ text: seg, cls: '' });
      continue;
    }

    if (!seenCmd) {
      seenCmd = true;
      const isKnown = COMMANDS.includes(seg.toLowerCase());
      tokens.push({ text: seg, cls: isKnown ? 'syn-cmd' : 'syn-err' });
    } else if (seg.startsWith('"') || seg.startsWith("'")) {
      tokens.push({ text: seg, cls: 'syn-str' });
    } else if (seg.startsWith('-')) {
      tokens.push({ text: seg, cls: 'syn-flag' });
    } else if (getNodeByPath(seg)) {
      tokens.push({ text: seg, cls: 'syn-path' });
    } else {
      tokens.push({ text: seg, cls: 'syn-arg' });
    }
  }
  return tokens;
}

function renderHighlightedHtml(text, cursorPos = -1) {
  const tokens = tokenizeCommandLine(text);
  let html = '';
  let idx = 0;

  for (const tok of tokens) {
    const start = idx;
    const end = idx + tok.text.length;

    if (cursorPos >= start && cursorPos < end) {
      const rel = cursorPos - start;
      const before = tok.text.slice(0, rel);
      const ch = tok.text[rel];
      const after = tok.text.slice(rel + 1);
      if (before) {
        html += tok.cls
          ? `<span class="${tok.cls}">${escapeHtml(before)}</span>`
          : escapeHtml(before);
      }
      html += `<span class="term-cursor ${tok.cls}">${escapeHtml(ch)}</span>`;
      if (after) {
        html += tok.cls
          ? `<span class="${tok.cls}">${escapeHtml(after)}</span>`
          : escapeHtml(after);
      }
    } else {
      html += tok.cls
        ? `<span class="${tok.cls}">${escapeHtml(tok.text)}</span>`
        : escapeHtml(tok.text);
    }
    idx = end;
  }

  if (cursorPos >= text.length) {
    html += '<span class="term-cursor">\u00A0</span>';
  }
  return html;
}

function setForegroundProcess(procName) {
  window.__TERMINAL_SESSION__.foregroundProcess = procName || null;
  window.__TERMINAL_SESSION__.emit({
    type: 'proc-change',
    process: procName || null,
  });
}

function stopMatrix(interrupted = false) {
  if (matrixInterval === null) return false;
  clearInterval(matrixInterval);
  matrixInterval = null;
  setForegroundProcess(null);
  if (interrupted) {
    window.__TERMINAL_SESSION__.write('^C', 'dim');
  }
  return true;
}

/**
 * Sends SIGINT (Ctrl+C) to any active terminal foreground process.
 * @returns {boolean} True if a running process was stopped
 */
export function interruptTerminalProcess() {
  if (isBadAppleRunning()) {
    const stopped = stopBadApple('interrupted');
    if (stopped) setForegroundProcess(null);
    return stopped;
  }
  if (matrixInterval !== null) {
    return stopMatrix(true);
  }
  return false;
}

function isProcessRunning() {
  return isBadAppleRunning() || matrixInterval !== null;
}

// Shared Terminal Session Model
window.__TERMINAL_SESSION__ = window.__TERMINAL_SESSION__ || {
  history: [],
  buffer: [],
  subscribers: new Set(),
  cwd: '/',
  lastExitCode: 0,
  foregroundProcess: null,
  cursorStyle: localStorage.getItem('terminal-cursor') || 'block',
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  },
  write(text, type = 'output') {
    this.buffer.push({ text, type });
    this.subscribers.forEach((cb) => cb({ type: 'write', text, lineType: type }));
  },
  emit(event) {
    if (event.type === 'bad-apple-start') {
      this.foregroundProcess = 'bad-apple';
      this.buffer.push({
        type: 'bad-apple',
        frameText: event.frameText,
        active: true,
      });
    } else if (event.type === 'bad-apple-frame' || event.type === 'bad-apple-end') {
      for (let i = this.buffer.length - 1; i >= 0; i--) {
        if (this.buffer[i].type === 'bad-apple') {
          this.buffer[i].frameText = event.frameText;
          if (event.type === 'bad-apple-end') {
            this.buffer[i].active = false;
            this.buffer[i].reason = event.reason;
            this.foregroundProcess = null;
          }
          break;
        }
      }
    }
    this.subscribers.forEach((cb) => cb(event));
  },
  clear() {
    if (isBadAppleRunning()) {
      stopBadApple('aborted');
    }
    stopMatrix(false);
    this.buffer = [];
    this.subscribers.forEach((cb) => cb({ type: 'clear' }));
  },
  setCursorStyle(style) {
    this.cursorStyle = style;
    localStorage.setItem('terminal-cursor', style);
    this.subscribers.forEach((cb) => cb({ type: 'cursor-style', style }));
  },
  async execute(commandLine, context = {}) {
    if (!commandLine) return;

    const currentCwd = pwd();
    const promptHtml = buildPromptHtml(currentCwd, this.lastExitCode);
    this.write(
      `${promptHtml}<span class="term-cmd-echo">${renderHighlightedHtml(commandLine, -1)}</span>`,
      'prompt-echo',
    );

    this.history.unshift(commandLine);

    try {
      const result = await execCommand(commandLine, context);
      this.lastExitCode = 0;
      if (result) {
        this.write(result, 'output');
      }
    } catch (err) {
      this.lastExitCode = err.exitCode || 1;
      this.write(err.message, 'error');
    }
    this.cwd = pwd();
    this.emit({ type: 'state-sync', cwd: this.cwd, exitCode: this.lastExitCode });
  },
};

function createBadAppleElement(frameText, isActive = false) {
  const wrap = document.createElement('div');
  wrap.className = 'console-line bad-apple-line';

  const screen = document.createElement('pre');
  screen.className = `bad-apple-screen${isActive ? ' bad-apple-screen--active' : ''}`;
  screen.textContent = frameText || '';
  if (isActive) {
    screen.title = 'Tap or press Ctrl+C to stop';
  }

  screen.addEventListener('click', (e) => {
    if (!screen.classList.contains('bad-apple-screen--active')) return;
    if (window.getSelection()?.toString()) return;
    if (interruptTerminalProcess()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  wrap.appendChild(screen);
  return { wrap, screen };
}

function updateTtyHeader() {
  const titleEl = document.getElementById('console-header-title');
  if (!titleEl) return;
  const cwdEl = titleEl.querySelector('.console-header-cwd');
  const procEl = document.getElementById('console-header-proc');
  if (cwdEl) cwdEl.textContent = formatTildePath(pwd());
  if (procEl) {
    procEl.textContent = window.__TERMINAL_SESSION__.foregroundProcess || 'bash';
  }
}

/**
 * Mounts a full Linux-style inline terminal inside `mountEl`.
 * Used by both TTY mode (#console-terminal-mount) and floating Console windows.
 * @param {HTMLElement} mountEl
 * @param {{ onExit?: () => void, onDimensions?: (cols: number, rows: number) => void }} [options]
 * @returns {() => void} Cleanup function
 */
export function mountTerminal(mountEl, { onExit = null, onDimensions = null } = {}) {
  mountEl.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'term-viewport';
  viewport.dataset.cursor = window.__TERMINAL_SESSION__.cursorStyle || 'block';
  viewport.setAttribute('role', 'log');
  viewport.setAttribute('aria-live', 'polite');

  const bufferEl = document.createElement('div');
  bufferEl.className = 'term-buffer';

  const promptLine = document.createElement('div');
  promptLine.className = 'term-prompt-line';

  const promptSpan = document.createElement('span');
  promptSpan.className = 'term-prompt';

  const inputDisplay = document.createElement('span');
  inputDisplay.className = 'term-input-display';

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'text';
  hiddenInput.className = 'term-hidden-input';
  hiddenInput.autocomplete = 'off';
  hiddenInput.autocorrect = 'off';
  hiddenInput.autocapitalize = 'off';
  hiddenInput.spellcheck = false;
  hiddenInput.setAttribute('aria-label', 'Terminal command input');

  promptLine.appendChild(promptSpan);
  promptLine.appendChild(inputDisplay);
  promptLine.appendChild(hiddenInput);

  const runningBanner = document.createElement('div');
  runningBanner.className = 'term-running-hint hidden';
  runningBanner.textContent = '[running — press Ctrl+C or tap to interrupt]';

  // Character metric probe for cols x rows readout
  const charProbe = document.createElement('span');
  charProbe.className = 'term-char-probe';
  charProbe.setAttribute('aria-hidden', 'true');
  charProbe.textContent = 'MMMMMMMMMM';

  viewport.appendChild(charProbe);
  viewport.appendChild(bufferEl);
  viewport.appendChild(promptLine);
  viewport.appendChild(runningBanner);
  mountEl.appendChild(viewport);

  let liveScreen = null;
  let historyIndex = -1;

  const syncPromptLabel = () => {
    const sess = window.__TERMINAL_SESSION__;
    promptSpan.innerHTML = buildPromptHtml(pwd(), sess.lastExitCode);
    updateTtyHeader();
  };

  const syncCursor = () => {
    const val = hiddenInput.value;
    const pos = Math.max(0, Math.min(val.length, hiddenInput.selectionStart ?? val.length));
    inputDisplay.innerHTML = renderHighlightedHtml(val, pos);
  };

  const setForegroundRunning = (running) => {
    promptLine.classList.toggle('hidden', running);
    runningBanner.classList.toggle('hidden', !running);
    hiddenInput.readOnly = running;
    if (!running) {
      syncPromptLabel();
      syncCursor();
    }
  };

  const scrollToBottom = () => {
    viewport.scrollTop = viewport.scrollHeight;
  };

  const appendLine = (text, type) => {
    const div = document.createElement('div');
    div.className = `console-line ${type}`;
    if (/<[a-z][\s\S]*>/i.test(text)) {
      div.innerHTML = text;
    } else {
      div.textContent = text;
    }
    bufferEl.appendChild(div);
  };

  const renderBuffer = () => {
    bufferEl.innerHTML = '';
    liveScreen = null;
    window.__TERMINAL_SESSION__.buffer.forEach((entry) => {
      if (entry.type === 'bad-apple') {
        const els = createBadAppleElement(entry.frameText, Boolean(entry.active));
        bufferEl.appendChild(els.wrap);
        if (entry.active) {
          liveScreen = els.screen;
        }
      } else {
        appendLine(entry.text, entry.type);
      }
    });
    setForegroundRunning(isProcessRunning());
    scrollToBottom();
  };

  syncPromptLabel();
  renderBuffer();
  syncCursor();

  const unsubSession = window.__TERMINAL_SESSION__.subscribe((event) => {
    if (event.type === 'clear') {
      bufferEl.innerHTML = '';
      liveScreen = null;
      setForegroundRunning(false);
      scrollToBottom();
    } else if (event.type === 'write') {
      appendLine(event.text, event.lineType);
      scrollToBottom();
    } else if (event.type === 'state-sync') {
      syncPromptLabel();
      scrollToBottom();
    } else if (event.type === 'cursor-style') {
      viewport.dataset.cursor = event.style;
    } else if (event.type === 'proc-change') {
      setForegroundRunning(isProcessRunning());
      updateTtyHeader();
    } else if (event.type === 'bad-apple-start') {
      const els = createBadAppleElement(event.frameText, true);
      liveScreen = els.screen;
      bufferEl.appendChild(els.wrap);
      setForegroundRunning(true);
      updateTtyHeader();
      scrollToBottom();
    } else if (event.type === 'bad-apple-frame' && liveScreen) {
      liveScreen.textContent = event.frameText;
    } else if (event.type === 'bad-apple-end' && liveScreen) {
      if (event.frameText) {
        liveScreen.textContent = event.frameText;
      }
      liveScreen.classList.remove('bad-apple-screen--active');
      liveScreen.removeAttribute('title');
      liveScreen = null;
      setForegroundRunning(false);
      updateTtyHeader();
      scrollToBottom();
    }
  });

  // ResizeObserver for live cols x rows readout
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    const updateDims = () => {
      const probeRect = charProbe.getBoundingClientRect();
      const vpRect = viewport.getBoundingClientRect();
      const charW = probeRect.width / 10;
      const lineH = probeRect.height || 20;
      if (charW > 0 && vpRect.width > 0) {
        const cols = Math.max(20, Math.floor((vpRect.width - 28) / charW));
        const rows = Math.max(6, Math.floor((vpRect.height - 24) / lineH));
        onDimensions?.(cols, rows);
      }
    };
    resizeObserver = new ResizeObserver(updateDims);
    resizeObserver.observe(viewport);
    requestAnimationFrame(updateDims);
  }

  // Focus & click handling
  const onViewportClick = (e) => {
    if (e.target.closest('#console-nav-toggle')) return;
    document.getElementById('mode-tty')?.classList.remove('nav-pane-open');

    if (isProcessRunning() && e.target.closest('.term-running-hint')) {
      interruptTerminalProcess();
      hiddenInput.focus({ preventScroll: true });
      return;
    }

    if (window.getSelection()?.toString()) return;
    hiddenInput.focus({ preventScroll: true });
    scrollToBottom();
  };

  const onFocus = () => {
    viewport.classList.add('term-focused');
    syncCursor();
  };

  const onBlur = () => {
    viewport.classList.remove('term-focused');
  };

  const onInput = () => {
    syncCursor();
    scrollToBottom();
  };

  const onKeyup = () => syncCursor();

  const onKeydown = async (e) => {
    // Ctrl+C: interrupt process or echo ^C
    if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'c') {
      const hasSelection = Boolean(window.getSelection()?.toString());
      if (interruptTerminalProcess()) {
        e.preventDefault();
        hiddenInput.value = '';
        syncCursor();
        return;
      }
      if (hasSelection) return;
      e.preventDefault();
      const sess = window.__TERMINAL_SESSION__;
      const promptHtml = buildPromptHtml(pwd(), sess.lastExitCode);
      sess.write(
        `${promptHtml}<span class="term-cmd-echo">${escapeHtml(hiddenInput.value)}^C</span>`,
        'prompt-echo',
      );
      hiddenInput.value = '';
      syncCursor();
      return;
    }

    if (hiddenInput.readOnly) {
      return;
    }

    // Readline shortcuts
    if (e.ctrlKey && !e.metaKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'l') {
        e.preventDefault();
        window.__TERMINAL_SESSION__.clear();
        return;
      }
      if (k === 'a') {
        e.preventDefault();
        hiddenInput.setSelectionRange(0, 0);
        syncCursor();
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        const len = hiddenInput.value.length;
        hiddenInput.setSelectionRange(len, len);
        syncCursor();
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        const pos = hiddenInput.selectionStart ?? hiddenInput.value.length;
        hiddenInput.value = hiddenInput.value.slice(pos);
        hiddenInput.setSelectionRange(0, 0);
        syncCursor();
        return;
      }
      if (k === 'k') {
        e.preventDefault();
        const pos = hiddenInput.selectionStart ?? hiddenInput.value.length;
        hiddenInput.value = hiddenInput.value.slice(0, pos);
        hiddenInput.setSelectionRange(pos, pos);
        syncCursor();
        return;
      }
      if (k === 'w') {
        e.preventDefault();
        const pos = hiddenInput.selectionStart ?? hiddenInput.value.length;
        const before = hiddenInput.value.slice(0, pos).replace(/\s+$/, '');
        const lastSpace = before.lastIndexOf(' ');
        const nextPos = lastSpace === -1 ? 0 : lastSpace + 1;
        hiddenInput.value = hiddenInput.value.slice(0, nextPos) + hiddenInput.value.slice(pos);
        hiddenInput.setSelectionRange(nextPos, nextPos);
        syncCursor();
        return;
      }
      if (k === 'd' && hiddenInput.value === '') {
        e.preventDefault();
        if (onExit) {
          onExit();
        } else {
          window.__TERMINAL_SESSION__.write('Use Alt+1 to switch to Desktop mode.', 'dim');
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const commandLine = hiddenInput.value.trim();
      hiddenInput.value = '';
      syncCursor();

      if (!commandLine) {
        const sess = window.__TERMINAL_SESSION__;
        sess.write(buildPromptHtml(pwd(), sess.lastExitCode), 'prompt-echo');
        return;
      }

      historyIndex = -1;
      await window.__TERMINAL_SESSION__.execute(commandLine, { onExit });
      syncPromptLabel();
      scrollToBottom();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = window.__TERMINAL_SESSION__.history;
      if (history.length > 0) {
        historyIndex = Math.min(historyIndex + 1, history.length - 1);
        hiddenInput.value = history[historyIndex];
        const len = hiddenInput.value.length;
        hiddenInput.setSelectionRange(len, len);
        syncCursor();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.max(historyIndex - 1, -1);
      hiddenInput.value =
        historyIndex === -1 ? '' : window.__TERMINAL_SESSION__.history[historyIndex];
      const len = hiddenInput.value.length;
      hiddenInput.setSelectionRange(len, len);
      syncCursor();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(hiddenInput);
      syncCursor();
    }
  };

  viewport.addEventListener('click', onViewportClick);
  hiddenInput.addEventListener('focus', onFocus);
  hiddenInput.addEventListener('blur', onBlur);
  hiddenInput.addEventListener('input', onInput);
  hiddenInput.addEventListener('keydown', onKeydown);
  hiddenInput.addEventListener('keyup', onKeyup);

  // Auto-focus when mounted in visible pane
  requestAnimationFrame(() => {
    if (mountEl.offsetParent !== null) {
      hiddenInput.focus({ preventScroll: true });
    }
  });

  return () => {
    unsubSession();
    resizeObserver?.disconnect();
    viewport.removeEventListener('click', onViewportClick);
    hiddenInput.removeEventListener('focus', onFocus);
    hiddenInput.removeEventListener('blur', onBlur);
    hiddenInput.removeEventListener('input', onInput);
    hiddenInput.removeEventListener('keydown', onKeydown);
    hiddenInput.removeEventListener('keyup', onKeyup);
  };
}

/**
 * Focuses the TTY terminal input if mounted.
 */
export function focusActiveTerminal() {
  const inp = document.querySelector('#console-terminal-mount .term-hidden-input');
  inp?.focus({ preventScroll: true });
}

const MOTD_BANNER = `<div class="term-motd"><div><span class="term-motd-os">Tasrif Linux 6.12.0-phosphor</span> <span class="term-dim">(x86_64 tty1)</span></div><div class="term-dim">Last login: ${new Date().toDateString()} on pts/0</div><div class="term-motd-hint">Type <span class="term-hl">help</span> for commands, <span class="term-hl">neofetch</span> for system info, or <span class="term-hl">Tab</span> to autocomplete.</div></div>`;

export function initTerminal({ openApp, getAudioContext }) {
  openAppCallback = openApp;
  getAudioContextCallback = getAudioContext || null;

  const mountEl = document.getElementById('console-terminal-mount');
  const dimsEl = document.getElementById('console-header-dims');
  if (!mountEl) return;

  if (window.__TERMINAL_SESSION__.buffer.length === 0) {
    window.__TERMINAL_SESSION__.write(MOTD_BANNER, 'banner');
  }

  mountTerminal(mountEl, {
    onDimensions: (cols, rows) => {
      if (dimsEl) dimsEl.textContent = `${cols}×${rows}`;
    },
  });

  // Global Ctrl+C fallback so user can stop playback even if terminal isn't focused
  if (!globalInterruptInstalled) {
    globalInterruptInstalled = true;
    document.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'c') return;
      if (e.target && e.target.tagName === 'INPUT') return;
      if (window.getSelection()?.toString()) return;
      if (interruptTerminalProcess()) {
        e.preventDefault();
      }
    });
  }

  const navToggle = document.getElementById('console-nav-toggle');
  navToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.playSound?.('click');
    document.getElementById('mode-tty')?.classList.toggle('nav-pane-open');
  });
}

function handleTabCompletion(inputEl) {
  const val = inputEl.value;
  const words = val.split(/\s+/);

  // Command completion on first token when no trailing space
  if (words.length === 1 && !val.endsWith(' ')) {
    const prefix = words[0].toLowerCase();
    const cmdMatches = COMMANDS.filter((c) => c.startsWith(prefix));
    if (cmdMatches.length === 1) {
      inputEl.value = `${cmdMatches[0]} `;
      const len = inputEl.value.length;
      inputEl.setSelectionRange(len, len);
      return;
    }
    if (cmdMatches.length > 1) {
      const sess = window.__TERMINAL_SESSION__;
      sess.write(
        `${buildPromptHtml(pwd(), sess.lastExitCode)}<span class="term-cmd-echo">${escapeHtml(val)}</span>`,
        'prompt-echo',
      );
      sess.write(
        `<div class="ls-grid">${cmdMatches.map((c) => `<span class="ls-item">${c}</span>`).join('')}</div>`,
        'output',
      );
      return;
    }
  }

  const spaceSplit = val.split(' ');
  const lastWord = spaceSplit[spaceSplit.length - 1] || '';

  let searchDir = pwd();
  let searchPrefix = lastWord;

  if (lastWord.includes('/')) {
    const parts = lastWord.split('/');
    searchPrefix = parts.pop();
    const dirPart = parts.join('/') || '/';
    searchDir = resolvePath(dirPart);
  }

  const entries = ls(searchDir);
  if (!entries) return;

  const matches = entries.filter((e) =>
    e.name.toLowerCase().startsWith(searchPrefix.toLowerCase()),
  );

  if (matches.length === 1) {
    const match = matches[0];
    const completedName = match.name + (match.type === 'dir' ? '/' : ' ');
    spaceSplit[spaceSplit.length - 1] = lastWord.includes('/')
      ? lastWord.substring(0, lastWord.lastIndexOf('/') + 1) + completedName
      : completedName;
    inputEl.value = spaceSplit.join(' ');
    const len = inputEl.value.length;
    inputEl.setSelectionRange(len, len);
  } else if (matches.length > 1) {
    const sess = window.__TERMINAL_SESSION__;
    sess.write(
      `${buildPromptHtml(pwd(), sess.lastExitCode)}<span class="term-cmd-echo">${escapeHtml(val)}</span>`,
      'prompt-echo',
    );
    const optionStr = matches
      .map((e) => {
        const cls = e.type === 'dir' ? 'ls-item ls-dir' : 'ls-item';
        return `<span class="${cls}">${escapeHtml(e.name)}${e.type === 'dir' ? '/' : ''}</span>`;
      })
      .join('');
    sess.write(`<div class="ls-grid">${optionStr}</div>`, 'output');
  }
}

function getFileColorClass(node) {
  if (node.type === 'dir') return 'ls-dir';
  switch (node.fileType) {
    case 'md':
      return 'ls-md';
    case 'html':
      return 'ls-html';
    case 'img':
      return 'ls-img';
    case 'pdf':
      return 'ls-pdf';
    default:
      return 'ls-file';
  }
}

// Command execution
async function execCommand(commandLine, context = {}) {
  const trimmed = commandLine.trim();
  if (!trimmed) return '';

  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const tokens = [];
  let match;
  while ((match = regex.exec(trimmed)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[0]);
  }

  const cmd = (tokens[0] || '').toLowerCase();
  const args = tokens.slice(1);
  const positionalArgs = args.filter((a) => !a.startsWith('-'));
  const flags = new Set(args.filter((a) => a.startsWith('-')).flatMap((a) => a.slice(1).split('')));

  const resolveTarget = () => {
    const full = positionalArgs.join(' ');
    return getNodeByPath(full) ? full : positionalArgs[0];
  };

  switch (cmd) {
    case 'help': {
      const rows = [
        ['help', '', 'Show this command reference'],
        ['ls', '[-l] [path]', 'List directory contents'],
        ['cd', '[path]', 'Change working directory'],
        ['pwd', '', 'Print working directory'],
        ['cat', '<file>', 'Print file contents to stdout'],
        ['open', '<file>', 'Open file in graphical viewer'],
        ['tree', '[path]', 'Display directory tree'],
        ['clear', '', 'Clear terminal screen (Ctrl+L)'],
        ['neofetch', '', 'System & hardware summary'],
        ['uname', '[-a]', 'Print kernel / OS info'],
        ['whoami / id', '', 'Print user & group identity'],
        ['uptime / date', '', 'Show session uptime or UTC date'],
        ['history', '', 'Show command history'],
        ['man', '<cmd>', 'Show manual page for a command'],
        ['cursor', '<style>', 'Set cursor: block | underline | bar'],
        ['matrix', '', 'Matrix digital rain (Ctrl+C to stop)'],
        ['bad-apple', '', 'Play Bad Apple!! ASCII + 8-bit synth'],
        ['browser', '', 'Launch Phosphor Web Engine'],
        ['exit', '', 'Close floating terminal (Ctrl+D)'],
      ];
      return (
        `<div class="term-help">` +
        `<div class="term-dim">GNU bash, version 5.2.32(1)-release (x86_64-pc-linux-gnu)</div>` +
        rows
          .map(([c, arg, desc]) => {
            const argHtml = arg ? ` <span class="syn-flag">${escapeHtml(arg)}</span>` : '';
            const pad = ' '.repeat(Math.max(1, 18 - c.length - (arg ? arg.length + 1 : 0)));
            return `<div class="term-help-row">  <span class="syn-cmd">${escapeHtml(c)}</span>${argHtml}${pad}<span class="term-help-desc">${escapeHtml(desc)}</span></div>`;
          })
          .join('') +
        `</div>`
      );
    }

    case 'clear':
      window.__TERMINAL_SESSION__.clear();
      return '';

    case 'pwd':
      return pwd();

    case 'whoami':
      return USER;

    case 'hostname':
      return HOST;

    case 'id':
      return `uid=1000(${USER}) gid=1000(${USER}) groups=1000(${USER}),27(sudo),998(wheel)`;

    case 'uname':
      if (flags.has('a')) {
        return `Linux ${HOST} 6.12.0-phosphor #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
      }
      return 'Linux';

    case 'uptime': {
      const sec = Math.floor((performance.now() || 0) / 1000);
      const mins = Math.floor(sec / 60);
      const hrs = Math.floor(mins / 60);
      const upStr = hrs > 0 ? `${hrs}:${String(mins % 60).padStart(2, '0')}` : `${mins} min`;
      const now = new Date().toTimeString().slice(0, 8);
      return ` ${now} up ${upStr},  1 user,  load average: 0.12, 0.08, 0.05`;
    }

    case 'date':
      return new Date().toUTCString();

    case 'history': {
      const hist = [...window.__TERMINAL_SESSION__.history].reverse();
      if (hist.length === 0) return '<span class="term-dim">(no history)</span>';
      return `<pre class="term-pre-block">${hist
        .map((entry, idx) => `${String(idx + 1).padStart(4, ' ')}  ${escapeHtml(entry)}`)
        .join('\n')}</pre>`;
    }

    case 'man': {
      const topic = (positionalArgs[0] || '').toLowerCase();
      if (!topic) {
        throw new Error("What manual page do you want?\nFor example, try 'man ls'.");
      }
      const entry = MAN_PAGES[topic];
      if (!entry) {
        throw new Error(`No manual entry for ${topic}`);
      }
      return `<div class="term-man"><div><span class="term-hl">NAME</span></div><div class="term-man-body">${escapeHtml(entry)}</div></div>`;
    }

    case 'cursor': {
      const style = (positionalArgs[0] || '').toLowerCase();
      if (!style) {
        return `Current cursor: ${window.__TERMINAL_SESSION__.cursorStyle} (options: block, underline, bar)`;
      }
      if (!['block', 'underline', 'bar'].includes(style)) {
        throw new Error(`cursor: invalid style '${style}' (use block, underline, or bar)`);
      }
      window.__TERMINAL_SESSION__.setCursorStyle(style);
      return `Cursor style set to ${style}.`;
    }

    case 'echo':
      return escapeHtml(args.join(' '));

    case 'ls': {
      const target = resolveTarget() || '';
      const entries = ls(target);
      if (entries === null) {
        throw new Error(`ls: cannot access '${target}': No such file or directory`);
      }
      if (entries.length === 0) return '<span class="term-dim">(empty)</span>';

      if (flags.has('l')) {
        const rows = entries.map((node) => {
          const perms = node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = (node.type === 'dir' ? '4.0K' : node.size || '1.0K').padStart(6, ' ');
          const cls = getFileColorClass(node);
          const suffix = node.type === 'dir' ? '/' : '';
          return `<div><span class="term-dim">${perms}  ${USER}  ${size}</span>  <span class="${cls}">${escapeHtml(node.name)}${suffix}</span></div>`;
        });
        return `<div class="ls-long"><div class="term-dim">total ${entries.length}</div>${rows.join('')}</div>`;
      }

      const items = entries.map((node) => {
        const cls = getFileColorClass(node);
        const suffix = node.type === 'dir' ? '/' : '';
        return `<span class="ls-item ${cls}">${escapeHtml(node.name)}${suffix}</span>`;
      });
      return `<div class="ls-grid">${items.join('')}</div>`;
    }

    case 'cd': {
      const target = resolveTarget();
      if (!target || target === '~') {
        cd('/');
        return '';
      }
      const ok = cd(target);
      if (!ok) {
        throw new Error(`bash: cd: ${target}: No such file or directory`);
      }
      return '';
    }

    case 'cat': {
      const target = resolveTarget();
      if (!target) {
        throw new Error('cat: missing file operand');
      }
      const node = getNodeByPath(target);
      if (!node) {
        throw new Error(`cat: ${target}: No such file or directory`);
      }
      if (node.type === 'dir') {
        throw new Error(`cat: ${target}: Is a directory`);
      }

      const content = await getFileContent(target);
      return `<pre class="term-pre-block">${escapeHtml(content)}</pre>`;
    }

    case 'open': {
      const target = resolveTarget();
      if (!target) {
        throw new Error('open: missing file operand');
      }
      const node = getNodeByPath(target);
      if (!node) {
        throw new Error(`open: ${target}: No such file or directory`);
      }
      if (openAppCallback) {
        openAppCallback(node);
      }
      return `Opening ${escapeHtml(node.name)}...`;
    }

    case 'browser':
      if (openAppCallback) {
        openAppCallback('browser');
      }
      return 'Launching Phosphor Web Engine...';

    case 'exit':
      if (context.onExit) {
        context.onExit();
        return '';
      }
      return 'Use Alt+1 to return to Desktop mode.';

    case 'matrix': {
      stopMatrix(false);
      setForegroundProcess('matrix');
      window.__TERMINAL_SESSION__.write('INITIALIZING MATRIX STREAM... [CTRL+C TO STOP]', 'info');
      const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
      let linesPrinted = 0;
      matrixInterval = setInterval(() => {
        let stream = '';
        for (let i = 0; i < 48; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const isHighlight = Math.random() > 0.85;
          stream += isHighlight
            ? `<span style="color:var(--cp-white);font-weight:bold">${char}</span>`
            : `<span style="color:var(--cp-green)">${char}</span>`;
        }
        window.__TERMINAL_SESSION__.write(stream, 'output');
        linesPrinted++;
        if (linesPrinted >= 25) {
          stopMatrix(false);
          window.__TERMINAL_SESSION__.write('// MATRIX STREAM COMPLETE //', 'dim');
        }
      }, 80);
      return '';
    }

    case 'bad-apple': {
      startBadApple({
        terminalSession: window.__TERMINAL_SESSION__,
        getAudioContext: getAudioContextCallback,
      });
      return '';
    }

    case 'neofetch': {
      const uptimeSec = Math.round((performance.now() || 0) / 1000);
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = uptimeSec % 60;
      const uptimeStr =
        hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      const curTheme = document.body.dataset.theme || 'phosphor';
      const memVal = navigator.deviceMemory ? `${navigator.deviceMemory} GiB` : 'sandboxed';

      return (
        `<div class="neofetch-output">` +
        `<pre class="neofetch-ascii">       /\\\n      /  \\\n     /\\   \\\n    /      \\\n   /   ,,   \\\n  /   |  |  -\\\n /_-''    ''-_\\</pre>` +
        `<div class="neofetch-info">` +
        `<div><span class="term-prompt-user">${USER}</span>@<span class="term-prompt-cwd">${HOST}</span></div>` +
        `<div class="term-dim">---------------</div>` +
        `<div><span class="neofetch-key">OS</span>: Tasrif Linux (x86_64)</div>` +
        `<div><span class="neofetch-key">Host</span>: Virtual Desktop Rig</div>` +
        `<div><span class="neofetch-key">Kernel</span>: 6.12.0-eleventy3</div>` +
        `<div><span class="neofetch-key">Uptime</span>: ${uptimeStr}</div>` +
        `<div><span class="neofetch-key">Shell</span>: bash 5.2.32</div>` +
        `<div><span class="neofetch-key">WM</span>: PhosphorWM (Tiling/Float)</div>` +
        `<div><span class="neofetch-key">Terminal</span>: phosphor-tty</div>` +
        `<div><span class="neofetch-key">Theme</span>: ${escapeHtml(curTheme)}</div>` +
        `<div><span class="neofetch-key">Memory</span>: ${memVal}</div>` +
        `<div class="neofetch-swatches"><span style="background:var(--cp-bg-3)">   </span><span style="background:var(--cp-red)">   </span><span style="background:var(--cp-green)">   </span><span style="background:var(--cp-amber)">   </span><span style="background:var(--cp-cyan)">   </span><span style="background:var(--cp-magenta)">   </span><span style="background:var(--cp-white)">   </span></div>` +
        `</div></div>`
      );
    }

    case 'tree': {
      const target = positionalArgs[0] || '';
      const rootNode = getNodeByPath(target);
      if (!rootNode) {
        throw new Error(`tree: ${target}: No such directory`);
      }
      if (rootNode.type === 'file') {
        throw new Error(`tree: ${target}: Is a file`);
      }

      let output = `<span class="ls-dir">${escapeHtml(rootNode.name || '~')}/</span>\n`;

      function buildTreeString(node, prefix = '') {
        if (!node.children || node.children.length === 0) return '';

        let result = '';
        node.children.forEach((child, index) => {
          const isLast = index === node.children.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          const cls = getFileColorClass(child);
          const suffix = child.type === 'dir' ? '/' : '';
          result += `${prefix}${connector}<span class="${cls}">${escapeHtml(child.name)}${suffix}</span>\n`;

          if (child.type === 'dir') {
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            result += buildTreeString(child, nextPrefix);
          }
        });
        return result;
      }

      output += buildTreeString(rootNode);
      return `<pre class="term-pre-block">${output}</pre>`;
    }

    default: {
      const err = new Error(`bash: ${cmd}: command not found`);
      err.exitCode = 127;
      throw err;
    }
  }
}

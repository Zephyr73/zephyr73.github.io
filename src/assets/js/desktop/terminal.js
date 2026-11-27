/**
 * terminal.js — TTY Terminal Emulator
 */

import { ls, cd, pwd, resolvePath, getFileContent, getNodeByPath } from './filesystem.js';
import { startBadApple, stopBadApple, isBadAppleRunning } from './bad-apple.js';

let historyIndex = -1;
let openAppCallback = null;
let getAudioContextCallback = null;
let matrixInterval = null;
let globalInterruptInstalled = false;

function stopMatrix(interrupted = false) {
  if (matrixInterval === null) return false;
  clearInterval(matrixInterval);
  matrixInterval = null;
  if (interrupted) {
    window.__TERMINAL_SESSION__.write('^C', 'dim');
    window.__TERMINAL_SESSION__.write('// MATRIX STREAM INTERRUPTED //', 'dim');
  }
  return true;
}

/**
 * Sends SIGINT (Ctrl+C) to any active terminal foreground process.
 * @returns {boolean} True if a running process was stopped
 */
export function interruptTerminalProcess() {
  if (isBadAppleRunning()) {
    return stopBadApple('interrupted');
  }
  if (matrixInterval !== null) {
    return stopMatrix(true);
  }
  return false;
}

// Shared Terminal Session Model
window.__TERMINAL_SESSION__ = window.__TERMINAL_SESSION__ || {
  history: [],
  buffer: [],
  subscribers: new Set(),
  cwd: '/',
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
  async execute(commandLine) {
    if (!commandLine) return;

    // Echo command
    const currentCwd = pwd();
    const promptText = `guest@phosphor:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
    this.write(promptText + commandLine, 'prompt');

    // Add to history
    this.history.unshift(commandLine);

    // Execute command
    try {
      const result = await execCommand(commandLine);
      if (result) {
        this.write(result, 'output');
      }
    } catch (err) {
      this.write(err.message, 'error');
    }
    this.cwd = pwd();
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

/**
 * Mounts a live terminal output element to the shared session buffer & stream.
 * @param {HTMLElement} outputEl
 * @param {{ inputRow?: HTMLElement|null, inputEl?: HTMLInputElement|null }} [controls]
 * @returns {() => void} Unsubscribe cleanup function
 */
export function mountTerminalOutput(outputEl, { inputRow = null, inputEl = null } = {}) {
  let liveScreen = null;
  const defaultPlaceholder = inputEl ? inputEl.placeholder : 'type a command...';

  const setForegroundRunning = (running) => {
    if (inputRow) {
      inputRow.classList.toggle('console-input-row--running', running);
    }
    if (inputEl) {
      inputEl.readOnly = running;
      if (running) {
        inputEl.placeholder = 'tap or press Ctrl+C to stop';
      } else {
        inputEl.placeholder = defaultPlaceholder;
        inputEl.focus();
      }
    }
  };

  const onInputRowClick = (e) => {
    if (inputEl && inputEl.readOnly) {
      if (interruptTerminalProcess()) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  if (inputRow) {
    inputRow.addEventListener('click', onInputRowClick);
  }

  const appendLine = (text, type) => {
    const div = document.createElement('div');
    div.className = `console-line ${type}`;
    if (/<[a-z][\s\S]*>/i.test(text)) {
      div.innerHTML = text;
    } else {
      div.textContent = text;
    }
    outputEl.appendChild(div);
  };

  const renderBuffer = () => {
    outputEl.innerHTML = '';
    liveScreen = null;
    let hasActive = false;
    window.__TERMINAL_SESSION__.buffer.forEach((entry) => {
      if (entry.type === 'bad-apple') {
        const els = createBadAppleElement(entry.frameText, Boolean(entry.active));
        outputEl.appendChild(els.wrap);
        if (entry.active) {
          liveScreen = els.screen;
          hasActive = true;
        }
      } else {
        appendLine(entry.text, entry.type);
      }
    });
    setForegroundRunning(hasActive);
    outputEl.scrollTop = outputEl.scrollHeight;
  };

  renderBuffer();

  const unsubSession = window.__TERMINAL_SESSION__.subscribe((event) => {
    if (event.type === 'clear') {
      outputEl.innerHTML = '';
      liveScreen = null;
      setForegroundRunning(false);
    } else if (event.type === 'write') {
      appendLine(event.text, event.lineType);
      outputEl.scrollTop = outputEl.scrollHeight;
    } else if (event.type === 'bad-apple-start') {
      const els = createBadAppleElement(event.frameText, true);
      liveScreen = els.screen;
      outputEl.appendChild(els.wrap);
      setForegroundRunning(true);
      outputEl.scrollTop = outputEl.scrollHeight;
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
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  });

  return () => {
    unsubSession();
    if (inputRow) {
      inputRow.removeEventListener('click', onInputRowClick);
    }
  };
}

/**
 * Handles Ctrl+C inside any terminal <input> element.
 * @param {KeyboardEvent} e
 * @param {HTMLInputElement} inputEl
 * @returns {boolean} True if handled
 */
export function handleTerminalInputCtrlC(e, inputEl) {
  if (!e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'c') {
    return false;
  }

  // Allow copying selected text when no foreground process is running
  const hasSelection = Boolean(window.getSelection()?.toString());
  if (interruptTerminalProcess()) {
    e.preventDefault();
    inputEl.value = '';
    return true;
  }

  if (hasSelection) {
    return false;
  }

  e.preventDefault();
  const currentCwd = pwd();
  const promptText = `guest@phosphor:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
  window.__TERMINAL_SESSION__.write(`${promptText}${inputEl.value}^C`, 'prompt');
  inputEl.value = '';
  return true;
}

const BANNER = `
<div class="console-banner">
<span class="console-banner-art">██████╗ ██╗  ██╗ ██████╗ ███████╗██████╗ ██╗  ██╗ ██████╗ ██████╗ 
██╔══██╗██║  ██║██╔═══██╗██╔════╝██╔══██╗██║  ██║██╔═══██╗██╔══██╗
██████╔╝███████║██║   ██║███████╗██████╔╝███████║██║   ██║██████╔╝
██╔═══╝ ██╔══██║██║   ██║╚════██║██╔═══╝ ██╔══██║██║   ██║██╔══██╗
██║     ██║  ██║╚██████╔╝███████║██║     ██║  ██║╚██████╔╝██║  ██║
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
</span><span class="console-banner-text">
Welcome to PHOSPHOR_SHELL.
Type 'help' to list available commands.</span>
</div>`;

export function initTerminal({ openApp, getAudioContext }) {
  openAppCallback = openApp;
  getAudioContextCallback = getAudioContext || null;

  const consoleOutput = document.getElementById('console-output');
  const consoleInput = document.getElementById('console-input');
  const consoleInputRow = consoleInput?.closest('.console-input-row') || null;
  const consolePane = document.getElementById('tty-console');
  const promptLabel = document.getElementById('console-prompt-label');

  if (!consoleInput || !consoleOutput) return;

  // Initialize banner if session buffer is empty
  if (window.__TERMINAL_SESSION__.buffer.length === 0) {
    window.__TERMINAL_SESSION__.write(BANNER, 'banner');
  }

  mountTerminalOutput(consoleOutput, { inputRow: consoleInputRow, inputEl: consoleInput });
  updatePromptLabel(promptLabel);

  // Global Ctrl+C fallback so user can stop playback even if input isn't focused
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

  // Focus input when clicking console
  consolePane?.addEventListener('click', (e) => {
    if (e.target.closest('#console-nav-toggle')) return;
    document.getElementById('mode-tty')?.classList.remove('nav-pane-open');
    consoleInput.focus();
  });

  const navToggle = document.getElementById('console-nav-toggle');
  navToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.playSound?.('click');
    document.getElementById('mode-tty')?.classList.toggle('nav-pane-open');
  });

  // Event handler for Enter/Arrow keys/Tab/Ctrl+C
  consoleInput.addEventListener('keydown', async (e) => {
    if (handleTerminalInputCtrlC(e, consoleInput)) {
      updatePromptLabel(promptLabel);
      return;
    }

    if (e.key === 'Enter') {
      const commandLine = consoleInput.value.trim();
      consoleInput.value = '';
      if (!commandLine) return;

      historyIndex = -1;

      // Execute command on shared session
      await window.__TERMINAL_SESSION__.execute(commandLine);

      // Update prompt label in case directory changed
      updatePromptLabel(promptLabel);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = window.__TERMINAL_SESSION__.history;
      if (history.length > 0) {
        historyIndex = Math.min(historyIndex + 1, history.length - 1);
        consoleInput.value = history[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.max(historyIndex - 1, -1);
      consoleInput.value =
        historyIndex === -1 ? '' : window.__TERMINAL_SESSION__.history[historyIndex];
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(consoleInput);
    }
  });
}

function updatePromptLabel(labelEl) {
  if (!labelEl) return;
  const currentCwd = pwd();
  labelEl.textContent = `guest@phosphor:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
}

function writeLine(text, type = 'output') {
  const consoleOutput = document.getElementById('console-output');
  if (!consoleOutput) return;

  const div = document.createElement('div');
  div.className = `console-line ${type}`;

  // Detect HTML content (ls, help, tree, neofetch use spans/divs)
  if (/<[a-z][\s\S]*>/i.test(text)) {
    div.innerHTML = text;
  } else {
    div.textContent = text;
  }

  consoleOutput.appendChild(div);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Tab completion
function handleTabCompletion(inputEl) {
  const val = inputEl.value;
  const words = val.split(' ');
  const lastWord = words[words.length - 1] || '';

  // Resolve directory of last word if it has slashes
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
    // Exact match
    const match = matches[0];
    const completedName = match.name + (match.type === 'dir' ? '/' : ' ');

    // Replace the last word
    words[words.length - 1] = lastWord.includes('/')
      ? lastWord.substring(0, lastWord.lastIndexOf('/') + 1) + completedName
      : completedName;

    inputEl.value = words.join(' ');
  } else if (matches.length > 1) {
    // Print multiple options
    writeLine(`guest@phosphor:${pwd()}$ ${val}`, 'prompt');
    const optionStr = matches
      .map((e) => {
        const color = e.type === 'dir' ? 'var(--cp-cyan)' : 'var(--cp-white)';
        return `<span style="color:${color}">${e.name}</span>`;
      })
      .join('  ');
    writeLine(optionStr, 'info');
  }
}

// Command execution
async function execCommand(commandLine) {
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
  const resolveTarget = () => {
    const full = args.join(' ');
    return getNodeByPath(full) ? full : args[0];
  };

  switch (cmd) {
    case 'help':
      return `
Available commands:
  <span style="color:var(--cp-amber)">help</span>         - Shows this help manual
  <span style="color:var(--cp-amber)">ls [path]</span>    - List files/directories
  <span style="color:var(--cp-amber)">cd &lt;path&gt;</span>    - Change active directory
  <span style="color:var(--cp-amber)">pwd</span>          - Print working directory
  <span style="color:var(--cp-amber)">cat &lt;file&gt;</span>   - Output text file content
  <span style="color:var(--cp-amber)">open &lt;file&gt;</span>  - Open file in visual viewer split/window
  <span style="color:var(--cp-amber)">clear</span>        - Clear terminal logs
  <span style="color:var(--cp-amber)">neofetch</span>     - Show hardware & system configuration summary
  <span style="color:var(--cp-amber)">matrix</span>       - Digital matrix stream simulation
  <span style="color:var(--cp-amber)">bad-apple</span>    - Play Bad Apple!! ASCII video with 8-bit audio
  <span style="color:var(--cp-amber)">tree [path]</span>  - Draw file system directory tree structure
  <span style="color:var(--cp-amber)">echo &lt;text&gt;</span>  - Echo input text back to console
  <span style="color:var(--cp-amber)">whoami</span>       - Display logged in system role
  <span style="color:var(--cp-amber)">date</span>         - View UTC system hardware date
  <span style="color:var(--cp-amber)">browser</span>      - Launch phosphor Web Engine browser
`;

    case 'clear':
      window.__TERMINAL_SESSION__.clear();
      return '';

    case 'pwd':
      return pwd();

    case 'whoami':
      return 'guest';

    case 'date':
      return new Date().toUTCString();

    case 'echo':
      return args.join(' ');

    case 'ls': {
      const target = resolveTarget() || '';
      const entries = ls(target);
      if (entries === null) {
        throw new Error(`ls: no such file or directory: ${target}`);
      }
      if (entries.length === 0) return '<span style="color:var(--cp-dim)">(empty directory)</span>';

      // Grid layout, 3 cols max, with type-colored entries
      const items = entries.map((node) => {
        if (node.type === 'dir') {
          return `<span style="color:var(--cp-cyan);font-weight:bold;min-width:150px;display:inline-block">${node.name}/</span>`;
        } else {
          let color = 'var(--cp-white)';
          if (node.fileType === 'md') color = 'var(--cp-green)';
          else if (node.fileType === 'html') color = 'var(--cp-amber)';
          else if (node.fileType === 'img') color = 'var(--cp-magenta)';
          else if (node.fileType === 'pdf') color = 'var(--cp-red)';
          const size = node.size
            ? ` <span style="color:var(--cp-dim);font-size:10px">${node.size}</span>`
            : '';
          return `<span style="color:${color};min-width:150px;display:inline-block">${node.name}${size}</span>`;
        }
      });
      return `<div style="display:flex;flex-wrap:wrap;gap:2px 0">${items.join('')}</div>`;
    }

    case 'cd': {
      const target = resolveTarget();
      if (!target) {
        cd('/');
        return '';
      }
      const ok = cd(target);
      if (!ok) {
        throw new Error(`cd: no such directory: ${target}`);
      }
      return '';
    }

    case 'cat': {
      const target = resolveTarget();
      if (!target) {
        throw new Error('cat: missing operand');
      }
      const node = getNodeByPath(target);
      if (!node) {
        throw new Error(`cat: ${target}: No such file`);
      }
      if (node.type === 'dir') {
        throw new Error(`cat: ${target}: Is a directory`);
      }

      const content = await getFileContent(target);
      // Display raw content in a pre element for proper whitespace
      const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;word-break:break-all;color:var(--cp-white);margin:0;line-height:1.5">${escaped}</pre>`;
    }

    case 'open': {
      const target = resolveTarget();
      if (!target) {
        throw new Error('open: missing filename');
      }
      const node = getNodeByPath(target);
      if (!node) {
        throw new Error(`open: ${target}: No such file or directory`);
      }
      if (openAppCallback) {
        openAppCallback(node);
      }
      return `Opening ${node.name}...`;
    }

    case 'browser':
      if (openAppCallback) {
        openAppCallback('browser');
      }
      return 'Launching phosphor Web Engine browser...';

    case 'matrix': {
      stopMatrix(false);
      window.__TERMINAL_SESSION__.write(
        'INITIALIZING MATRIX RAIN STREAM... [CTRL+C TO STOP]',
        'info',
      );
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
      const memVal = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'browser sandbox';

      return `
<div class="neofetch-output" style="display:flex;gap:20px;line-height:1.4;margin:6px 0;font-family:var(--font-mono)">
<pre style="color:var(--cp-green);margin:0;font-family:inherit;line-height:1.2;text-shadow:0 0 6px var(--cp-green-glow)">
   /\\_____/\\ 
  /  o   o  \\ 
 ( ==  ^  == )
  )         ( 
 (           )
( (  )   (  ) )
(__(__)___(__)__)
</pre>
<div>
<span style="color:var(--cp-amber);font-weight:bold">guest</span>@<span style="color:var(--cp-green);font-weight:bold">phosphor</span>
<div style="color:var(--cp-dim);margin-bottom:4px">---------------------------------</div>
<span style="color:var(--cp-cyan)">OS</span>:      PHOSPHOR_OS (x86_64)
<span style="color:var(--cp-cyan)">Host</span>:    Virtual Desktop Sandbox Rig
<span style="color:var(--cp-cyan)">Kernel</span>:  Eleventy 3.0 / V8 JS Core
<span style="color:var(--cp-cyan)">Uptime</span>:  ${uptimeStr}
<span style="color:var(--cp-cyan)">Shell</span>:   tx-sh 3.2.0-emulator
<span style="color:var(--cp-cyan)">WM</span>:      Custom Canvas Tiling Compositor
<span style="color:var(--cp-cyan)">Theme</span>:   ${curTheme.toUpperCase()}
<span style="color:var(--cp-cyan)">Memory</span>:  ${memVal} / 16.0G
<div style="margin-top:6px;display:flex;gap:4px">
  <span style="background:#000;color:var(--cp-green)">███</span>
  <span style="background:#000;color:var(--cp-amber)">███</span>
  <span style="background:#000;color:var(--cp-cyan)">███</span>
  <span style="background:#000;color:var(--cp-red)">███</span>
  <span style="background:#000;color:var(--cp-white)">███</span>
</div>
</div>
</div>
`;
    }

    case 'tree': {
      const target = args[0] || '';
      const rootNode = getNodeByPath(target);
      if (!rootNode) {
        throw new Error(`tree: ${target}: No such directory`);
      }
      if (rootNode.type === 'file') {
        throw new Error(`tree: ${target}: Is a file`);
      }

      let output = `<span style="color:var(--cp-cyan)">${rootNode.name || 'root'}/</span>\n`;

      function buildTreeString(node, prefix = '') {
        if (!node.children || node.children.length === 0) return '';

        let result = '';
        node.children.forEach((child, index) => {
          const isLast = index === node.children.length - 1;
          const connector = isLast ? '└── ' : '├── ';

          let nameStr = child.name;
          if (child.type === 'dir') {
            nameStr = `<span style="color:var(--cp-cyan)">${child.name}/</span>`;
          } else {
            let color = 'var(--cp-white)';
            if (child.fileType === 'md') color = 'var(--cp-green)';
            else if (child.fileType === 'html') color = 'var(--cp-amber)';
            else if (child.fileType === 'img') color = 'var(--cp-magenta)';
            else if (child.fileType === 'pdf') color = 'var(--cp-red)';
            nameStr = `<span style="color:${color}">${child.name}</span>`;
          }

          result += `${prefix}${connector}${nameStr}\n`;

          if (child.type === 'dir') {
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            result += buildTreeString(child, nextPrefix);
          }
        });
        return result;
      }

      output += buildTreeString(rootNode);
      return `<pre style="font-family:inherit;margin:0;line-height:1.4;">${output}</pre>`;
    }

    default:
      throw new Error(`sh: command not found: ${cmd}`);
  }
}

/**
 * terminal.js — TTY Terminal Emulator
 */

import { ls, cd, pwd, resolvePath, getFileContent, getNodeByPath } from './filesystem.js';

let historyIndex = -1;
let openAppCallback = null;

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
    this.subscribers.forEach(cb => cb({ type: 'write', text, lineType: type }));
  },
  clear() {
    this.buffer = [];
    this.subscribers.forEach(cb => cb({ type: 'clear' }));
  },
  async execute(commandLine) {
    if (!commandLine) return;
    
    // Echo command
    const currentCwd = pwd();
    const promptText = `guest@portfolio:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
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
  }
};

const BANNER = `
<div class="console-banner">
<span class="console-banner-art">██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗ 
██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗
██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║
██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║
██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝
╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝ 
</span><span class="console-banner-text">
Welcome to TX_OS v3.0 terminal emulator.
Type 'help' to list available commands.</span>
</div>`;

export function initTerminal({ openApp }) {
  openAppCallback = openApp;

  const consoleOutput = document.getElementById('console-output');
  const consoleInput = document.getElementById('console-input');
  const consolePane = document.getElementById('tty-console');
  const promptLabel = document.getElementById('console-prompt-label');

  if (!consoleInput || !consoleOutput) return;

  // Initialize banner if session buffer is empty
  if (window.__TERMINAL_SESSION__.buffer.length === 0) {
    window.__TERMINAL_SESSION__.write(BANNER, 'banner');
  }

  // Initial draw from buffer
  const renderBuffer = () => {
    consoleOutput.innerHTML = '';
    window.__TERMINAL_SESSION__.buffer.forEach(event => {
      const div = document.createElement('div');
      div.className = `console-line ${event.type}`;
      if (/<[a-z][\s\S]*>/i.test(event.text)) {
        div.innerHTML = event.text;
      } else {
        div.textContent = event.text;
      }
      consoleOutput.appendChild(div);
    });
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  };
  renderBuffer();
  updatePromptLabel(promptLabel);

  // Subscribe to changes
  window.__TERMINAL_SESSION__.subscribe(event => {
    if (event.type === 'clear') {
      consoleOutput.innerHTML = '';
    } else if (event.type === 'write') {
      const div = document.createElement('div');
      div.className = `console-line ${event.lineType}`;
      if (/<[a-z][\s\S]*>/i.test(event.text)) {
        div.innerHTML = event.text;
      } else {
        div.textContent = event.text;
      }
      consoleOutput.appendChild(div);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  });

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

  // Event handler for Enter/Arrow keys/Tab
  consoleInput.addEventListener('keydown', async (e) => {
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
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = window.__TERMINAL_SESSION__.history;
      if (history.length > 0) {
        historyIndex = Math.min(historyIndex + 1, history.length - 1);
        consoleInput.value = history[historyIndex];
      }
    } 
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.max(historyIndex - 1, -1);
      consoleInput.value = historyIndex === -1 ? '' : window.__TERMINAL_SESSION__.history[historyIndex];
    } 
    else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(consoleInput);
    }
  });
}

function updatePromptLabel(labelEl) {
  if (!labelEl) return;
  const currentCwd = pwd();
  labelEl.textContent = `guest@portfolio:${currentCwd === '/' ? '~' : '~' + currentCwd}$ `;
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

  const matches = entries.filter(e => e.name.toLowerCase().startsWith(searchPrefix.toLowerCase()));

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
    writeLine(`guest@portfolio:${pwd()}$ ${val}`, 'prompt');
    const optionStr = matches.map(e => {
      const color = e.type === 'dir' ? 'var(--cp-cyan)' : 'var(--cp-white)';
      return `<span style="color:${color}">${e.name}</span>`;
    }).join('  ');
    writeLine(optionStr, 'info');
  }
}

// Command execution
async function execCommand(commandLine) {
  const parts = commandLine.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

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
  <span style="color:var(--cp-amber)">neofetch</span>     - Show hardware configuration summary
  <span style="color:var(--cp-amber)">tree [path]</span>  - Draw file system directory tree structure
  <span style="color:var(--cp-amber)">echo &lt;text&gt;</span>  - Echo input text back to console
  <span style="color:var(--cp-amber)">whoami</span>       - Display logged in system role
  <span style="color:var(--cp-amber)">date</span>         - View UTC system hardware date
  <span style="color:var(--cp-amber)">browser</span>      - Launch portfolio Web Engine browser
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
      const target = args[0] || '';
      const entries = ls(target);
      if (entries === null) {
        throw new Error(`ls: no such file or directory: ${target}`);
      }
      if (entries.length === 0) return '<span style="color:var(--cp-dim)">(empty directory)</span>';

      // Grid layout, 3 cols max, with type-colored entries
      const items = entries.map(node => {
        if (node.type === 'dir') {
          return `<span style="color:var(--cp-cyan);font-weight:bold;min-width:150px;display:inline-block">${node.name}/</span>`;
        } else {
          let color = 'var(--cp-white)';
          if (node.fileType === 'md')   color = 'var(--cp-green)';
          else if (node.fileType === 'html') color = 'var(--cp-amber)';
          else if (node.fileType === 'img')  color = 'var(--cp-magenta)';
          else if (node.fileType === 'pdf')  color = 'var(--cp-red)';
          const size = node.size ? ` <span style="color:var(--cp-dim);font-size:10px">${node.size}</span>` : '';
          return `<span style="color:${color};min-width:150px;display:inline-block">${node.name}${size}</span>`;
        }
      });
      return `<div style="display:flex;flex-wrap:wrap;gap:2px 0">${items.join('')}</div>`;
    }

    case 'cd': {
      const target = args[0];
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
      const target = args[0];
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
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre style="font-family:var(--font-mono);font-size:11px;white-space:pre-wrap;word-break:break-all;color:var(--cp-white);margin:0;line-height:1.5">${escaped}</pre>`;
    }

    case 'open': {
      const target = args[0];
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
      return 'Launching portfolio Web Engine browser...';

    case 'neofetch': {
      // Get current uptime (simulated session uptime)
      const uptimeSec = Math.round((performance.now() || 0) / 1000);
      const uptimeStr = uptimeSec > 60 
        ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s` 
        : `${uptimeSec}s`;

      return `
<div class="neofetch-output" style="display:flex;gap:20px;line-height:1.4;">
<span style="color:var(--cp-green);font-family:monospace;white-space:pre;">
   /\\___/\\ 
  (  o o  )
  (   V   )
  /|     |\\
  U|     |U
</span>
<div>
<span style="color:var(--cp-amber)">guest</span>@<span style="color:var(--cp-green)">portfolio</span>
---------------------
<span style="color:var(--cp-cyan)">OS</span>: TX_OS v3.0 (x86_64)
<span style="color:var(--cp-cyan)">Host</span>: Virtual Desktop Portfolio Sandbox
<span style="color:var(--cp-cyan)">Kernel</span>: Eleventy static build / V8 JS Engine
<span style="color:var(--cp-cyan)">Uptime</span>: ${uptimeStr}
<span style="color:var(--cp-cyan)">Shell</span>: Custom v3-bash-emulator
<span style="color:var(--cp-cyan)">Display</span>: Dynamic browser viewport
<span style="color:var(--cp-cyan)">Theme</span>: ${document.body.dataset.theme || 'green'}
<span style="color:var(--cp-cyan)">Terminal</span>: Custom TTY Console
<span style="color:var(--cp-cyan)">CPU</span>: Virtual Browser Thread
<span style="color:var(--cp-cyan)">Memory</span>: ${document.getElementById('stat-mem')?.textContent || '4.2G'} / 16.0G
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

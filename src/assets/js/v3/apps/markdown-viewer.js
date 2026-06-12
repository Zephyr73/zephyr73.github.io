/**
 * markdown-viewer.js — Markdown Viewer App (Atom/Notepad++ style)
 */

import { getFileContent, getNodeByPath } from '../filesystem.js';

export function createMarkdownApp(filePath, fileTitle) {
  const container = document.createElement('div');
  container.className = 'app-markdown';

  const isMd = filePath.toLowerCase().endsWith('.md');
  let viewMode = isMd ? 'preview' : 'source'; // 'preview' or 'source'
  let rawText = '';

  // Tabbar
  const tabbar = document.createElement('div');
  tabbar.className = 'markdown-tabbar';

  const tab = document.createElement('div');
  tab.className = 'markdown-tab active';
  tab.textContent = fileTitle || 'Untitled.md';
  tabbar.appendChild(tab);

  // If it's a markdown file, add the Preview / Source toggle button
  let toggleBtn = null;
  if (isMd) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'markdown-toggle-btn';
    toggleBtn.textContent = '⬡ VIEW: SOURCE';
    toggleBtn.addEventListener('click', () => {
      window.playSound?.('click');
      if (viewMode === 'preview') {
        viewMode = 'source';
        toggleBtn.textContent = '⬡ VIEW: PREVIEW';
      } else {
        viewMode = 'preview';
        toggleBtn.textContent = '⬡ VIEW: SOURCE';
      }
      renderView();
    });
    tabbar.appendChild(toggleBtn);
  }

  // Body wrapping gutter + content
  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'markdown-body-wrap';

  const gutter = document.createElement('div');
  gutter.className = 'markdown-line-numbers';
  gutter.textContent = '1';

  const content = document.createElement('div');
  content.className = 'markdown-content-area md-rendered';
  content.innerHTML = '<span class="glow-amber">LOADING DATA...</span>';

  bodyWrap.appendChild(gutter);
  bodyWrap.appendChild(content);

  // Statusbar
  const statusbar = document.createElement('div');
  statusbar.className = 'markdown-statusbar';
  statusbar.innerHTML = `
    <div>UTF-8</div>
    <div class="md-stats">Lines: 0 | Size: --</div>
  `;

  container.appendChild(tabbar);
  container.appendChild(bodyWrap);
  container.appendChild(statusbar);

  function renderView() {
    const lineCount = rawText.split('\n').length;

    // Update statusbar stats
    const statsEl = statusbar.querySelector('.md-stats');
    if (statsEl) {
      const node = getNodeByPath(filePath);
      const sizeStr = node ? node.size : `${(rawText.length / 1024).toFixed(1)} KB`;
      statsEl.textContent = `Lines: ${lineCount} | Size: ${sizeStr}`;
    }

    if (viewMode === 'preview') {
      gutter.style.display = 'none';
      content.style.padding = '12px 20px';
      content.className = 'markdown-content-area md-rendered';
      content.innerHTML = parseMarkdown(rawText);
    } else {
      gutter.style.display = 'none';
      content.style.padding = '0';
      content.className = 'markdown-content-area';

      const lines = rawText.split('\n');
      const tableRows = lines.map((line, idx) => {
        const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const displayLine = escapedLine || '&nbsp;';
        return `<tr><td class="code-line-num">${idx + 1}</td><td class="code-line-content">${displayLine}</td></tr>`;
      });

      content.innerHTML = `<table class="code-table">${tableRows.join('')}</table>`;
    }
  }

  // Load and render markdown content
  async function loadContent() {
    try {
      rawText = await getFileContent(filePath);
      renderView();
    } catch (err) {
      content.innerHTML = `<span style="color:var(--cp-red)">Error loading file: ${err.message}</span>`;
    }
  }

  loadContent();

  return container;
}

/**
 * A lightweight vanilla JS Markdown Parser.
 */
function parseMarkdown(md) {
  let html = md;

  // Escape HTML tags to prevent arbitrary code execution, but preserve markdown formatting
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks: ```js ... ```
  html = html.replace(/```([\s\S]*?)```/g, (match, codeBlock) => {
    // Separate programming language if specified
    const lines = codeBlock.split('\n');
    let lang = '';
    let code = codeBlock;
    if (lines[0] && lines[0].trim().length < 15 && !lines[0].includes(' ')) {
      lang = lines[0].trim();
      code = lines.slice(1).join('\n');
    }
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers: # H1, ## H2 ...
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Blockquotes
  html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');

  // Bold / Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Lists: Unordered lists starting with - or *
  html = html.replace(/^\s*[*-]\s+(.*?)$/gm, '<li>$1</li>');
  // Wrap contiguous <li> blocks in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Tables
  // Simple check for tables: lines starting with |
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  let processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<table>';
      }

      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if it's separator row: |---|---|
      const isSep = cells.every((c) => /^:-*:?$/.test(c) || /^-+$/.test(c));
      if (isSep) continue;

      tableHtml += '<tr>';
      cells.forEach((cell) => {
        // First row is header
        if (tableHtml.match(/<tr>/g).length === 1) {
          tableHtml += `<th>${cell}</th>`;
        } else {
          tableHtml += `<td>${cell}</td>`;
        }
      });
      tableHtml += '</tr>';
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</table>';
        processedLines.push(tableHtml);
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    tableHtml += '</table>';
    processedLines.push(tableHtml);
  }
  html = processedLines.join('\n');

  // Convert empty lines to paragraphs, wrapping non-HTML lines
  const finalBlocks = html.split('\n\n').map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Skip if it's already an HTML block tag
    if (/^<(h1|h2|h3|h4|ul|ol|pre|table|blockquote|hr)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
  });

  return finalBlocks.join('\n');
}

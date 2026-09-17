/**
 * markdown-viewer.js — Markdown Viewer App (Atom/Notepad++ style)
 */

import { getFileContent, getNodeByPath } from '../filesystem.js';
import { marked } from '../vendor/marked.js';

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

function formatFrontmatter(md) {
  if (md.startsWith('---')) {
    const endIdx = md.indexOf('---', 3);
    if (endIdx > -1) {
      const frontmatter = md.substring(3, endIdx).trim();
      const content = md.substring(endIdx + 3).trim();
      return '```yaml\n# Frontmatter / Metadata\n' + frontmatter + '\n```\n\n' + content;
    }
  }
  return md;
}

/**
 * Uses marked.js for robust markdown parsing
 */
function parseMarkdown(md) {
  let cleanMd = formatFrontmatter(md);
  
  // Replace custom Eleventy/Nunjucks shortcodes (e.g. {% gimg ... %}) so they don't render raw
  cleanMd = cleanMd.replace(/\{%.*?%\}/g, '<div class="md-plugin-placeholder">[Media Element Omitted]</div>');
  
  return marked.parse(cleanMd);
}

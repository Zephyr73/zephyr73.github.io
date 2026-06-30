/**
 * filesystem.js — Eleventy global data file
 * Scans the src/ directory at build time (excluding sensitive/system folders)
 * and outputs a nested tree for Portfolio 3.0's virtual filesystem.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = './src';

// Folders completely hidden from Portfolio 3.0
const HIDDEN = new Set([
  '_data',
  '_includes',
  'assets',
  'scripts',
  'scss',
  'gallery', // injected separately from assets/img/gallery below
  'node_modules',
  '.git',
  '.github',
  '.venv',
  '__pycache__',
  'v2',
  'v3', // V3 desktop SPA — not exposed in virtual filesystem
]);

const EXT_MAP = {
  '.md': 'md',
  '.html': 'html',
  '.njk': 'html',
  '.jpg': 'img',
  '.jpeg': 'img',
  '.png': 'img',
  '.webp': 'img',
  '.gif': 'img',
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.js': 'js',
  '.json': 'json',
  '.css': 'css',
  '.scss': 'scss',
};

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EXT_MAP[ext] || 'other';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scanDir(dirPath, virtualPath = '/') {
  const children = [];

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return children;
  }

  // Folders first, then files, both alphabetical
  const dirs = entries
    .filter((e) => e.isDirectory() && !HIDDEN.has(e.name))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );
  const files = entries
    .filter((e) => e.isFile())
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );

  for (const dirent of dirs) {
    const childVirtual = virtualPath === '/' ? `/${dirent.name}` : `${virtualPath}/${dirent.name}`;
    const childReal = path.join(dirPath, dirent.name);
    children.push({
      name: dirent.name,
      type: 'dir',
      path: childVirtual,
      children: scanDir(childReal, childVirtual),
    });
  }

  for (const dirent of files) {
    // Skip hidden/system files
    if (dirent.name.startsWith('.')) continue;
    const ext = path.extname(dirent.name).toLowerCase();
    // Skip template engine intermediates that aren't the final content
    if (['.njk', '.js', '.ts', '.json', '.scss', '.css', '.xml', '.bat'].includes(ext)) continue;

    const childVirtual = virtualPath === '/' ? `/${dirent.name}` : `${virtualPath}/${dirent.name}`;
    const childReal = path.join(dirPath, dirent.name);

    let size = '?';
    try {
      size = formatSize(fs.statSync(childReal).size);
    } catch {
      /* ignore */
    }

    children.push({
      name: dirent.name,
      type: 'file',
      fileType: getFileType(dirent.name),
      path: childVirtual,
      size,
      ext: path.extname(dirent.name).toLowerCase(),
    });
  }

  return children;
}

export default function () {
  const rootChildren = scanDir(SRC_ROOT, '/');

  // Inject gallery assets from src/assets/img/gallery into the virtual filesystem
  const galleryChildren = scanDir('./src/assets/img/gallery', '/gallery');
  if (galleryChildren && galleryChildren.length > 0) {
    rootChildren.push({
      name: 'gallery',
      type: 'dir',
      path: '/gallery',
      children: galleryChildren,
    });
  }

  // Inject V2 content pages into the virtual filesystem root
  const v2ContentDirs = ['about', 'blog', 'projects'];
  for (const dir of v2ContentDirs) {
    const realPath = `./src/v2/${dir}`;
    const children = scanDir(realPath, `/${dir}`);
    rootChildren.push({
      name: dir,
      type: 'dir',
      path: `/${dir}`,
      children,
    });
  }

  // Sort root children alphabetically by name (natural order)
  rootChildren.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  );

  return {
    root: '/',
    label: 'root/',
    name: '',
    type: 'dir',
    path: '/',
    children: rootChildren,
  };
}

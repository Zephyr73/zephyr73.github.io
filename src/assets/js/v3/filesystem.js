/**
 * filesystem.js — Virtual Filesystem API for Portfolio 3.0
 * Connects to the window.__FS_TREE__ data generated at build time.
 */

let cwd = '/';

/**
 * Normalizes a path, resolving relative operators like '.' and '..'
 * @param {string} targetPath - Relative or absolute path
 * @returns {string} Normalized absolute path
 */
export function resolvePath(targetPath) {
  if (!targetPath) return cwd;
  
  let parts;
  if (targetPath.startsWith('/')) {
    parts = targetPath.split('/');
  } else {
    parts = (cwd === '/' ? '' : cwd).split('/').concat(targetPath.split('/'));
  }
  
  const stack = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  
  return '/' + stack.join('/');
}

/**
 * Traverses the window.__FS_TREE__ to find a node by its absolute path.
 * @param {string} absPath - Normalized absolute path
 * @returns {object|null} The filesystem node or null if not found
 */
export function getNodeByPath(absPath) {
  const normalized = resolvePath(absPath);
  if (normalized === '/') {
    return window.__FS_TREE__;
  }
  
  const parts = normalized.split('/').filter(Boolean);
  let curr = window.__FS_TREE__;
  
  for (const part of parts) {
    if (!curr || !curr.children) return null;
    const next = curr.children.find(child => child.name.toLowerCase() === part.toLowerCase());
    if (!next) return null;
    curr = next;
  }
  
  return curr;
}

/**
 * Returns the contents of a directory.
 * @param {string} [path] - Target directory path
 * @returns {object|null} Object containing children list or null if directory does not exist
 */
export function ls(path = '') {
  const absPath = resolvePath(path);
  const node = getNodeByPath(absPath);
  if (!node || node.type !== 'dir') {
    return null;
  }
  return node.children || [];
}

/**
 * Changes the current working directory.
 * @param {string} path - Target path
 * @returns {boolean} Success state
 */
export function cd(path) {
  const absPath = resolvePath(path);
  const node = getNodeByPath(absPath);
  if (node && node.type === 'dir') {
    cwd = absPath;
    return true;
  }
  return false;
}

/**
 * Returns current working directory.
 * @returns {string} Current working directory path
 */
export function pwd() {
  return cwd;
}

/**
 * Fetches text content of a virtual file from the public site.
 * @param {string} path - Target file path
 * @returns {Promise<string>} File content
 */
export async function getFileContent(path) {
  const absPath = resolvePath(path);
  const node = getNodeByPath(absPath);
  if (!node || node.type !== 'file') {
    throw new Error(`File not found: ${absPath}`);
  }
  
  // Fetch from the server/public URL
  try {
    const response = await fetch(absPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (err) {
    throw new Error(`Failed to read file ${absPath}: ${err.message}`);
  }
}

/**
 * gallery.js — Gallery Image Viewer App
 */

import { ls, getNodeByPath } from '../filesystem.js';

export function createGalleryApp(filePath, fileTitle) {
  const container = document.createElement('div');
  container.className = 'app-gallery';

  // Get real public URL from virtual path
  function getRealSrc(vPath) {
    if (vPath.startsWith('/gallery/')) {
      return vPath.replace('/gallery/', '/assets/img/gallery/');
    }
    return vPath;
  }

  // State
  let currentFilePath = filePath;
  let currentTitle = fileTitle;

  // Header
  const header = document.createElement('div');
  header.className = 'gallery-viewer-header';

  const headerTitle = document.createElement('div');
  headerTitle.className = 'gallery-header-info';
  headerTitle.textContent = currentTitle;

  const actions = document.createElement('div');
  actions.className = 'gallery-header-actions';

  const infoBtn = document.createElement('button');
  infoBtn.className = 'gallery-action-btn';
  infoBtn.innerHTML = 'ℹ️ INFO';
  infoBtn.title = 'Show Metadata';

  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'gallery-action-btn';
  downloadBtn.innerHTML = '⬇️ DOWNLOAD';
  downloadBtn.title = 'Download original image';
  downloadBtn.setAttribute('download', '');

  actions.appendChild(infoBtn);
  actions.appendChild(downloadBtn);
  header.appendChild(headerTitle);
  header.appendChild(actions);

  // Main Image area
  const imageArea = document.createElement('div');
  imageArea.className = 'gallery-image-area';

  const mainImg = document.createElement('img');
  mainImg.alt = 'Gallery image';
  imageArea.appendChild(mainImg);

  // Info overlay panel
  const infoPanel = document.createElement('div');
  infoPanel.className = 'gallery-info-panel';
  infoPanel.innerHTML = `
    <h4>Metadata</h4>
    <div class="gallery-info-row">
      <span class="gallery-info-label">Filename</span>
      <span class="gallery-info-value" id="meta-name">--</span>
    </div>
    <div class="gallery-info-row">
      <span class="gallery-info-label">Category</span>
      <span class="gallery-info-value" id="meta-category">--</span>
    </div>
    <div class="gallery-info-row">
      <span class="gallery-info-label">Resolution</span>
      <span class="gallery-info-value" id="meta-res">--</span>
    </div>
    <div class="gallery-info-row">
      <span class="gallery-info-label">File Size</span>
      <span class="gallery-info-value" id="meta-size">--</span>
    </div>
    <div class="gallery-info-row">
      <span class="gallery-info-label">Device / Engine</span>
      <span class="gallery-info-value" id="meta-device">--</span>
    </div>
    <div class="gallery-info-row">
      <span class="gallery-info-label">Captured Date</span>
      <span class="gallery-info-value" id="meta-date">--</span>
    </div>
  `;
  imageArea.appendChild(infoPanel);

  // Bottom Nav bar
  const navBar = document.createElement('div');
  navBar.className = 'gallery-nav-bar';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'gallery-nav-btn';
  prevBtn.innerHTML = '◀ PREV';

  const counter = document.createElement('span');
  counter.className = 'gallery-counter';
  counter.textContent = '0 / 0';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'gallery-nav-btn';
  nextBtn.innerHTML = 'NEXT ▶';

  navBar.appendChild(prevBtn);
  navBar.appendChild(counter);
  navBar.appendChild(nextBtn);

  container.appendChild(header);
  container.appendChild(imageArea);
  container.appendChild(navBar);

  // Load Image
  function loadImage(vPath) {
    currentFilePath = vPath;
    const node = getNodeByPath(vPath);
    currentTitle = node ? node.name : vPath.split('/').pop();

    headerTitle.textContent = currentTitle;
    
    const realSrc = getRealSrc(vPath);
    mainImg.src = realSrc;
    downloadBtn.href = realSrc;

    // Reset resolution and fetch dynamically
    const resVal = infoPanel.querySelector('#meta-res');
    resVal.textContent = 'Loading...';
    
    const imgObj = new Image();
    imgObj.src = realSrc;
    imgObj.onload = () => {
      resVal.textContent = `${imgObj.naturalWidth} × ${imgObj.naturalHeight}`;
    };

    // Fill metadata panel fields
    infoPanel.querySelector('#meta-name').textContent = currentTitle;
    
    // Category mapping
    let category = 'General';
    let device = 'Unknown Camera';
    let dateStr = 'Jun 2026'; // Default simulation fallback

    const parts = vPath.split('/');
    const folder = parts[2] || 'general';
    category = folder.charAt(0).toUpperCase() + folder.slice(1);

    if (folder === 'photography') {
      device = 'Samsung Galaxy S22 Ultra';
      dateStr = 'May 2024';
    } else if (folder === 'ai') {
      category = 'AI Generation';
      device = 'Stable Diffusion v1.5';
      dateStr = 'Oct 2024';
    } else if (folder === 'forza') {
      category = 'Forza Screen';
      device = 'Xbox Series X / Forza Engine';
      dateStr = 'Dec 2024';
    }

    infoPanel.querySelector('#meta-category').textContent = category;
    infoPanel.querySelector('#meta-size').textContent = node ? node.size : 'Unknown';
    infoPanel.querySelector('#meta-device').textContent = device;
    infoPanel.querySelector('#meta-date').textContent = dateStr;

    updateNavigation();
  }

  // Navigation Logic
  function getFolderImages() {
    const parentPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/')) || '/';
    const siblings = ls(parentPath) || [];
    return siblings.filter(node => node.type === 'file' && node.fileType === 'img');
  }

  function updateNavigation() {
    const images = getFolderImages();
    const idx = images.findIndex(node => node.path === currentFilePath);

    if (idx === -1 || images.length === 0) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      counter.textContent = '1 / 1';
      return;
    }

    counter.textContent = `${idx + 1} / ${images.length}`;
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === images.length - 1;

    // Save index references for clicks
    prevBtn.onclick = () => {
      if (idx > 0) loadImage(images[idx - 1].path);
    };

    nextBtn.onclick = () => {
      if (idx < images.length - 1) loadImage(images[idx + 1].path);
    };
  }

  // Info toggle
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    infoPanel.classList.toggle('visible');
    infoBtn.classList.toggle('active');
  });

  // Hide info panel when clicking on the image area
  imageArea.addEventListener('click', (e) => {
    if (e.target !== infoBtn && !infoPanel.contains(e.target)) {
      infoPanel.classList.remove('visible');
      infoBtn.classList.remove('active');
    }
  });

  // Load the initial file
  loadImage(currentFilePath);

  return container;
}

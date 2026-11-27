/**
 * pdf-viewer.js — PDF Viewer App (Chromium-style UI + PDF.js)
 */

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = PDFJS_URL;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('PDF.js loading failed'));
    document.head.appendChild(script);
  });
}

export function createPdfApp(filePath) {
  const container = document.createElement('div');
  container.className = 'app-pdf';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pdf-toolbar';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'pdf-toolbar-btn';
  prevBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="10 3 5 8 10 13"/></svg>';
  prevBtn.title = 'Previous page';
  prevBtn.disabled = true;

  const pageInput = document.createElement('input');
  pageInput.className = 'pdf-page-input';
  pageInput.type = 'text';
  pageInput.value = '1';
  pageInput.disabled = true;

  const pageCount = document.createElement('span');
  pageCount.className = 'pdf-page-count';
  pageCount.textContent = '/ --';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'pdf-toolbar-btn';
  nextBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 3 11 8 6 13"/></svg>';
  nextBtn.title = 'Next page';
  nextBtn.disabled = true;

  const sep1 = document.createElement('div');
  sep1.className = 'pdf-toolbar-sep';

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'pdf-toolbar-btn';
  zoomOutBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="8" x2="13" y2="8"/></svg>';
  zoomOutBtn.title = 'Zoom out';
  zoomOutBtn.disabled = true;

  const zoomSelect = document.createElement('select');
  zoomSelect.className = 'pdf-zoom-select';
  zoomSelect.disabled = true;
  [
    { val: '0.5', label: '50%' },
    { val: '0.75', label: '75%' },
    { val: '1.0', label: '100%' },
    { val: '1.25', label: '125%' },
    { val: '1.5', label: '150%' },
    { val: '2.0', label: '200%' },
  ].forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt.val;
    el.textContent = opt.label;
    if (opt.val === '1.0') el.selected = true;
    zoomSelect.appendChild(el);
  });

  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'pdf-toolbar-btn';
  zoomInBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>';
  zoomInBtn.title = 'Zoom in';
  zoomInBtn.disabled = true;

  const sep2 = document.createElement('div');
  sep2.className = 'pdf-toolbar-sep';

  const rotateBtn = document.createElement('button');
  rotateBtn.className = 'pdf-toolbar-btn';
  rotateBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L13.5 5.5"/><polyline points="13.5 2 13.5 5.5 10 5.5"/></svg>';
  rotateBtn.title = 'Rotate clockwise';
  rotateBtn.disabled = true;

  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'pdf-toolbar-btn';
  downloadBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 10.5v3h11v-3"/><polyline points="4.5 7 8 10.5 11.5 7"/><line x1="8" y1="2" x2="8" y2="10.5"/></svg>';
  downloadBtn.title = 'Download PDF';
  downloadBtn.href = filePath;
  downloadBtn.setAttribute('download', '');

  const printBtn = document.createElement('button');
  printBtn.className = 'pdf-toolbar-btn';
  printBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 6 4 2 12 2 12 6"/><path d="M4 12H2.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H12"/><rect x="4" y="10" width="8" height="4"/></svg>';
  printBtn.title = 'Print document';

  toolbar.appendChild(prevBtn);
  toolbar.appendChild(pageInput);
  toolbar.appendChild(pageCount);
  toolbar.appendChild(nextBtn);
  toolbar.appendChild(sep1);
  toolbar.appendChild(zoomOutBtn);
  toolbar.appendChild(zoomSelect);
  toolbar.appendChild(zoomInBtn);
  toolbar.appendChild(sep2);
  toolbar.appendChild(rotateBtn);
  toolbar.appendChild(downloadBtn);
  toolbar.appendChild(printBtn);

  // Viewport
  const viewport = document.createElement('div');
  viewport.className = 'pdf-viewport';

  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-page-canvas';
  canvas.style.display = 'none';
  viewport.appendChild(canvas);

  const statusMsg = document.createElement('div');
  statusMsg.style.cssText = 'color:#e8eaed;font-family:sans-serif;font-size:13px;';
  statusMsg.textContent = 'Loading PDF engine...';
  viewport.appendChild(statusMsg);

  container.appendChild(toolbar);
  container.appendChild(viewport);

  // PDF render state
  let pdfDoc = null;
  let pageNum = 1;
  let zoomLevel = 1.0;
  let rotation = 0;
  let pageRendering = false;
  let pageNumPending = null;

  async function initPdf() {
    try {
      const pdfjs = await loadPdfJs();
      statusMsg.textContent = 'Opening document...';

      const loadingTask = pdfjs.getDocument(filePath);
      pdfDoc = await loadingTask.promise;

      statusMsg.remove();
      canvas.style.display = 'block';

      // Enable UI
      pageInput.disabled = false;
      zoomSelect.disabled = false;
      zoomInBtn.disabled = false;
      zoomOutBtn.disabled = false;
      rotateBtn.disabled = false;

      pageCount.textContent = `/ ${pdfDoc.numPages}`;
      renderPage(pageNum);
    } catch (err) {
      console.warn('PDF.js loading failed, falling back to native embed: ', err);
      fallbackToNativeEmbed();
    }
  }

  function fallbackToNativeEmbed() {
    statusMsg.remove();
    canvas.remove();

    // Embed using <embed> tag
    const embed = document.createElement('embed');
    embed.src = filePath;
    embed.type = 'application/pdf';
    embed.style.cssText = 'width:100%;height:100%;border:none;';
    viewport.style.padding = '0';
    viewport.appendChild(embed);

    // Disable all toolbar buttons except download
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    pageInput.disabled = true;
    zoomInBtn.disabled = true;
    zoomOutBtn.disabled = true;
    zoomSelect.disabled = true;
    rotateBtn.disabled = true;
    printBtn.disabled = true;
  }

  async function renderPage(num) {
    if (!pdfDoc) return;
    pageRendering = true;

    try {
      const page = await pdfDoc.getPage(num);

      const ctx = canvas.getContext('2d');
      const pageViewport = page.getViewport({ scale: zoomLevel, rotation: rotation });

      canvas.height = pageViewport.height;
      canvas.width = pageViewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: pageViewport,
      };

      await page.render(renderContext).promise;
      pageRendering = false;

      // Update button states
      prevBtn.disabled = num <= 1;
      nextBtn.disabled = num >= pdfDoc.numPages;
      pageInput.value = num;

      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    } catch (err) {
      console.error('Error rendering page: ', err);
      pageRendering = false;
    }
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  // Events
  prevBtn.addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  });

  nextBtn.addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  });

  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(pageInput.value);
      if (!isNaN(val) && val >= 1 && val <= pdfDoc.numPages) {
        pageNum = val;
        queueRenderPage(pageNum);
      } else {
        pageInput.value = pageNum;
      }
    }
  });

  zoomSelect.addEventListener('change', (e) => {
    zoomLevel = parseFloat(e.target.value);
    queueRenderPage(pageNum);
  });

  zoomInBtn.addEventListener('click', () => {
    const options = Array.from(zoomSelect.options);
    const currentIdx = zoomSelect.selectedIndex;
    if (currentIdx < options.length - 1) {
      zoomSelect.selectedIndex = currentIdx + 1;
      zoomLevel = parseFloat(zoomSelect.value);
      queueRenderPage(pageNum);
    }
  });

  zoomOutBtn.addEventListener('click', () => {
    const currentIdx = zoomSelect.selectedIndex;
    if (currentIdx > 0) {
      zoomSelect.selectedIndex = currentIdx - 1;
      zoomLevel = parseFloat(zoomSelect.value);
      queueRenderPage(pageNum);
    }
  });

  rotateBtn.addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    queueRenderPage(pageNum);
  });

  printBtn.addEventListener('click', () => {
    // Open the PDF path in a new window and call print
    const w = window.open(filePath, '_blank', 'noopener,noreferrer');
    w?.addEventListener('load', () => {
      w.print();
    });
  });

  // Start initialization
  initPdf();

  return container;
}

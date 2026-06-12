/**
 * browser.js — Browser App (Firefox-mimicking)
 */

export function createBrowserApp(initialPath = '/v2/', initialTitle = 'Portfolio') {
  const container = document.createElement('div');
  container.className = 'app-browser';

  // State
  let tabs = [{ id: 1, title: initialTitle, path: initialPath }];
  let activeTabId = 1;
  let tabIdCounter = 1;

  // Header: Tab Bar
  const tabbar = document.createElement('div');
  tabbar.className = 'browser-tabbar';
  tabbar.setAttribute('role', 'tablist');

  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = 'display:flex;align-items:stretch;height:100%;';
  tabbar.appendChild(tabsContainer);

  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'browser-tab browser-tab--new';
  newTabBtn.textContent = '+';
  newTabBtn.title = 'Open New Tab';
  tabbar.appendChild(newTabBtn);

  // Navigation Bar
  const navbar = document.createElement('div');
  navbar.className = 'browser-navbar';

  const backBtn = document.createElement('button');
  backBtn.className = 'browser-nav-btn';
  backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><polyline points="15 18 9 12 15 6"/></svg>`;
  backBtn.title = 'Back';
  backBtn.disabled = true;

  const forwardBtn = document.createElement('button');
  forwardBtn.className = 'browser-nav-btn';
  forwardBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><polyline points="9 18 15 12 9 6"/></svg>`;
  forwardBtn.title = 'Forward';
  forwardBtn.disabled = true;

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'browser-nav-btn';
  reloadBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
  reloadBtn.title = 'Reload page';

  const homeBtn = document.createElement('button');
  homeBtn.className = 'browser-nav-btn';
  homeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  homeBtn.title = 'Home';

  const lockIcon = document.createElement('span');
  lockIcon.className = 'browser-lock-icon';
  lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  const urlInput = document.createElement('input');
  urlInput.className = 'browser-urlbar';
  urlInput.type = 'text';
  urlInput.value = initialPath;

  const connectBtn = document.createElement('button');
  connectBtn.className = 'browser-connect-btn';
  connectBtn.textContent = 'SECURE_';

  navbar.appendChild(backBtn);
  navbar.appendChild(forwardBtn);
  navbar.appendChild(reloadBtn);
  navbar.appendChild(homeBtn);
  navbar.appendChild(lockIcon);
  navbar.appendChild(urlInput);
  navbar.appendChild(connectBtn);

  // Menu Bar
  const menubar = document.createElement('div');
  menubar.className = 'browser-menubar';

  const menuItems = [
    { label: 'Home', path: '/v2/' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Projects', path: '/projects' },
    { label: 'Blog', path: '/blog' },
    { label: 'About', path: '/about' },
  ];

  const menuButtons = [];
  menuItems.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'browser-menu-item';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      navigateActiveTab(item.path);
    });
    menubar.appendChild(btn);
    menuButtons.push({ btn, path: item.path });
  });

  // Viewport Container
  const viewport = document.createElement('div');
  viewport.className = 'browser-viewport';

  const loadingBar = document.createElement('div');
  loadingBar.className = 'browser-loading-bar';
  viewport.appendChild(loadingBar);

  const iframesMap = new Map(); // tabId -> iframeEl

  container.appendChild(tabbar);
  container.appendChild(navbar);
  container.appendChild(menubar);
  container.appendChild(viewport);

  // Tab Manager Functions
  function renderTabs() {
    tabsContainer.innerHTML = '';
    tabs.forEach((t) => {
      const tabEl = document.createElement('div');
      tabEl.className = `browser-tab ${t.id === activeTabId ? 'active' : ''}`;
      tabEl.setAttribute('role', 'tab');
      tabEl.setAttribute('aria-selected', String(t.id === activeTabId));

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;max-width:120px;';
      titleSpan.textContent = t.title;
      tabEl.appendChild(titleSpan);

      if (tabs.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'browser-tab__close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeTab(t.id);
        });
        tabEl.appendChild(closeBtn);
      }

      tabEl.addEventListener('click', () => {
        switchTab(t.id);
      });

      tabsContainer.appendChild(tabEl);
    });
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    renderTabs();

    // Show active tab's iframe, hide others
    iframesMap.forEach((iframe, id) => {
      if (id === tabId) {
        iframe.style.display = 'block';
        urlInput.value = tabs.find((t) => t.id === tabId).path;
        updateNavButtons();
        updateActiveMenuHighlight(urlInput.value);
      } else {
        iframe.style.display = 'none';
      }
    });
  }

  function createTabIframe(tabId, url) {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.display = 'none';

    // Show loading bar
    iframe.addEventListener('loadstart', () => {
      loadingBar.style.width = '40%';
    });

    iframe.addEventListener('load', () => {
      loadingBar.style.width = '100%';
      setTimeout(() => {
        loadingBar.style.width = '0';
      }, 300);

      try {
        const loc = iframe.contentWindow.location;
        const relativePath = loc.pathname + loc.search + loc.hash;

        // Update tab model
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) {
          tab.path = relativePath;
          const pageTitle = iframe.contentWindow.document.title || 'Portfolio';
          tab.title = pageTitle.split('—')[0].trim() || 'Portfolio';
        }

        if (tabId === activeTabId) {
          urlInput.value = relativePath;
          updateNavButtons();
          updateActiveMenuHighlight(relativePath);
        }
        renderTabs();
      } catch (err) {
        // Fallback for cross-origin or load errors
        console.warn('Iframe load error or cross-origin access restricted: ', err);
      }
    });

    viewport.appendChild(iframe);
    iframesMap.set(tabId, iframe);
    return iframe;
  }

  function navigateActiveTab(url) {
    const activeIframe = iframesMap.get(activeTabId);
    if (activeIframe) {
      activeIframe.src = url;
      urlInput.value = url;

      const tab = tabs.find((t) => t.id === activeTabId);
      if (tab) tab.path = url;
    }
  }

  function closeTab(tabId) {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const iframe = iframesMap.get(tabId);
    if (iframe) {
      iframe.remove();
      iframesMap.delete(tabId);
    }

    tabs.splice(idx, 1);

    if (activeTabId === tabId) {
      // Switch to another tab
      const nextActive = tabs[Math.max(0, idx - 1)] || tabs[0];
      if (nextActive) {
        activeTabId = nextActive.id;
      }
    }

    renderTabs();
    if (tabs.length > 0) {
      switchTab(activeTabId);
    }
  }

  function updateNavButtons() {
    // Basic back/forward logic. Same-origin allows checking contentWindow history length,
    // but the back/forward API on iframe is just executing back/forward on contentWindow.history
    try {
      // In same-origin, we can just trigger history.back() and history.forward()
      // We can enable buttons safely.
      backBtn.disabled = false;
      forwardBtn.disabled = false;
    } catch {
      backBtn.disabled = true;
      forwardBtn.disabled = true;
    }
  }

  function updateActiveMenuHighlight(currentPath) {
    menuButtons.forEach((mb) => {
      // Check if currentPath starts with mb.path (e.g. /gallery/image/1 starts with /gallery)
      const isActive =
        mb.path === '/'
          ? currentPath === '/' || currentPath === '/index.html'
          : currentPath.startsWith(mb.path);
      mb.btn.classList.toggle('active', isActive);
    });
  }

  // Event Listeners
  newTabBtn.addEventListener('click', () => {
    tabIdCounter++;
    const newTab = { id: tabIdCounter, title: 'New Tab', path: '/v2/' };
    tabs.push(newTab);
    createTabIframe(tabIdCounter, '/v2/');
    switchTab(tabIdCounter);
  });

  backBtn.addEventListener('click', () => {
    const iframe = iframesMap.get(activeTabId);
    try {
      iframe?.contentWindow.history.back();
    } catch (e) {
      console.warn('Iframe history navigation failed', e);
    }
  });

  forwardBtn.addEventListener('click', () => {
    const iframe = iframesMap.get(activeTabId);
    try {
      iframe?.contentWindow.history.forward();
    } catch (e) {
      console.warn('Iframe history navigation failed', e);
    }
  });

  reloadBtn.addEventListener('click', () => {
    const iframe = iframesMap.get(activeTabId);
    try {
      iframe?.contentWindow.location.reload();
    } catch {
      if (iframe) {
        iframe.src = iframe.src; // eslint-disable-line no-self-assign
      }
    }
  });

  homeBtn.addEventListener('click', () => {
    navigateActiveTab('/v2/');
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let url = urlInput.value.trim();
      if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = '/' + url;
      }
      navigateActiveTab(url);
    }
  });

  connectBtn.addEventListener('click', () => {
    connectBtn.textContent = 'PINGING...';
    setTimeout(() => {
      connectBtn.textContent = 'ONLINE_';
      setTimeout(() => {
        connectBtn.textContent = 'SECURE_';
      }, 1500);
    }, 800);
  });

  // Init
  const firstIframe = createTabIframe(1, initialPath);
  firstIframe.style.display = 'block';
  renderTabs();
  updateActiveMenuHighlight(initialPath);

  return container;
}

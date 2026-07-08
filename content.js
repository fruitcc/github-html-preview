// GitHub HTML Preview content script.
// On blob pages for .html/.htm files, replaces the code view with a rendered
// preview (sandboxed iframe) and adds a Code/Preview toggle to the toolbar.
(() => {
  const PREVIEW_ID = 'ghp-preview-container';
  const TOGGLE_ID = 'ghp-toggle';

  let currentPath = null; // pathname we last set up for
  let setupToken = 0; // cancels stale async setups after navigation

  function parseBlobPath(pathname) {
    const m = pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (!m) return null;
    // Keep rest percent-encoded (it is spliced into a URL); decode only for
    // the extension test so files like "my%20report.html" match and build
    // valid raw URLs.
    let decoded;
    try {
      decoded = decodeURIComponent(m[3]);
    } catch (e) {
      decoded = m[3];
    }
    if (!/\.html?$/i.test(decoded)) return null;
    return { owner: m[1], repo: m[2], rest: m[3] };
  }

  // The Raw button href is preferred: on private repos it is a tokenized
  // raw.githubusercontent.com URL that needs no cookies. The constructed
  // fallback works for public repos.
  function getRawUrl(info) {
    const rawBtn = document.querySelector('[data-testid="raw-button"]');
    return (
      (rawBtn && rawBtn.href) ||
      `https://github.com/${info.owner}/${info.repo}/raw/${info.rest}`
    );
  }

  // The section wrapping the code view (line numbers, code, blob toolbar
  // stays outside of it). Anchored on the read-only textarea GitHub renders
  // code into, with fallbacks for UI variations.
  function findCodeSection() {
    const anchor =
      document.querySelector('#read-only-cursor-text-area') ||
      document.querySelector('[data-testid="code-view"]') ||
      document.querySelector('.react-code-view');
    if (!anchor) return null;
    return anchor.closest('section') || anchor;
  }

  function findToolbarAnchor() {
    // The button group holding Raw/Copy/Download in the file header.
    const raw = document.querySelector('[data-testid="raw-button"]');
    if (!raw) return null;
    return raw.closest('div[class*="ButtonGroup-ButtonGroup"]') || raw.closest('div');
  }

  function removeInjected() {
    const prev = document.getElementById(PREVIEW_ID);
    if (prev) {
      prev.ghpWatchdog?.disconnect();
      prev.remove();
    }
    document.getElementById(TOGGLE_ID)?.remove();
    const section = document.querySelector('[data-ghp-hidden]');
    if (section) {
      section.style.display = '';
      section.removeAttribute('data-ghp-hidden');
    }
  }

  function setMode(mode) {
    const container = document.getElementById(PREVIEW_ID);
    const toggle = document.getElementById(TOGGLE_ID);
    if (!container) return;
    const codeSection = container.ghpCodeSection;
    if (mode === 'preview') {
      container.style.display = '';
      container.ghpFailed = false; // user retry: rebuild even after a failed load
      ensureFrame(container);
      if (codeSection) {
        codeSection.style.display = 'none';
        codeSection.setAttribute('data-ghp-hidden', '1');
      }
    } else {
      container.style.display = 'none';
      if (codeSection) {
        codeSection.style.display = '';
        codeSection.removeAttribute('data-ghp-hidden');
      }
    }
    if (toggle) {
      for (const btn of toggle.querySelectorAll('button')) {
        btn.classList.toggle('ghp-active', btn.dataset.mode === mode);
      }
    }
  }

  function buildToggle() {
    const wrap = document.createElement('div');
    wrap.id = TOGGLE_ID;
    wrap.className = 'ghp-toggle';
    for (const [mode, label] of [
      ['code', 'Code'],
      ['preview', 'Preview'],
    ]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.mode = mode;
      btn.addEventListener('click', () => setMode(mode));
      wrap.appendChild(btn);
    }
    return wrap;
  }

  // Size the frame to fill the viewport below its top edge.
  function sizeFrame(container) {
    const iframe = container.querySelector('iframe');
    if (!iframe) return;
    const top = container.getBoundingClientRect().top + window.scrollY;
    const h = Math.max(500, window.innerHeight - Math.min(top, 300) - 16);
    iframe.style.height = h + 'px';
  }

  // (Re)creates the preview iframe if missing. viewer.html (extension page,
  // exempt from GitHub's CSP) frames the raw URL in a sandboxed iframe; the
  // background's DNR rules make the raw response render as HTML.
  function ensureFrame(container) {
    if (container.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'ghp-frame';
    iframe.src =
      chrome.runtime.getURL('viewer.html') +
      '#' +
      encodeURIComponent(getRawUrl(container.ghpInfo));
    container.appendChild(iframe);
    requestAnimationFrame(() => sizeFrame(container));
  }

  function buildPreview(info, codeSection) {
    const container = document.createElement('div');
    container.id = PREVIEW_ID;
    container.className = 'ghp-preview';
    container.ghpCodeSection = codeSection;
    container.ghpInfo = info;
    container.ghpRestores = [];
    ensureFrame(container);

    // Other software sharing the page (e.g. browser-automation tooling
    // periodically strips extension iframes; Turbo morphing can too) may
    // delete the iframe while leaving the container. Watch and re-create it,
    // rate-limited per minute and capped for the container's lifetime so the
    // self-heal loop always terminates.
    let lifetimeRestores = 0;
    const watchdog = new MutationObserver(() => {
      if (!container.isConnected || lifetimeRestores >= 60) {
        watchdog.disconnect();
        return;
      }
      if (
        container.style.display === 'none' ||
        container.ghpFailed ||
        container.querySelector('iframe')
      ) {
        return;
      }
      const now = Date.now();
      container.ghpRestores = container.ghpRestores.filter(
        (t) => now - t < 60000
      );
      if (container.ghpRestores.length >= 10) return; // >10 removals/min: give up until it calms down
      container.ghpRestores.push(now);
      lifetimeRestores++;
      ensureFrame(container);
    });
    watchdog.observe(container, { childList: true });
    container.ghpWatchdog = watchdog;
    return container;
  }

  async function setup(info) {
    const token = ++setupToken;

    // The code view renders asynchronously; wait for it.
    let section = null;
    for (let i = 0; i < 50 && !section; i++) {
      section = findCodeSection();
      if (!section) await new Promise((r) => setTimeout(r, 200));
      if (token !== setupToken) return;
    }
    if (!section || document.getElementById(PREVIEW_ID)) return;

    const container = buildPreview(info, section);
    section.parentElement.insertBefore(container, section);

    const toolbarAnchor = findToolbarAnchor();
    const toggle = buildToggle();
    if (toolbarAnchor && toolbarAnchor.parentElement) {
      toolbarAnchor.parentElement.insertBefore(toggle, toolbarAnchor);
    } else {
      toggle.classList.add('ghp-floating');
      document.body.appendChild(toggle);
    }

    setMode('preview');
  }

  function onNavigate() {
    const info = parseBlobPath(location.pathname);
    const path = info ? location.pathname : null;
    if (path === currentPath && document.getElementById(PREVIEW_ID)) return;
    currentPath = path;
    setupToken++;
    removeInjected();
    if (info) setup(info);
  }

  // If the viewer can't load the file (404, LFS pointer, auth), fall back to
  // GitHub's code view instead of hiding it behind a broken preview.
  window.addEventListener('message', (event) => {
    if (event.origin !== 'chrome-extension://' + chrome.runtime.id) return;
    if (!event.data || event.data.type !== 'ghp-load-failed') return;
    const container = document.getElementById(PREVIEW_ID);
    if (!container) return;
    setMode('code');
    container.ghpFailed = true; // suppress watchdog rebuilds until user retries
  });

  // GitHub is a soft-navigating SPA (Turbo); watch for URL changes via its
  // navigation events rather than polling.
  document.addEventListener('turbo:load', onNavigate);
  document.addEventListener('turbo:render', onNavigate);
  document.addEventListener('soft-nav:success', onNavigate);
  window.addEventListener('popstate', onNavigate);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const container = document.getElementById(PREVIEW_ID);
      if (container) sizeFrame(container);
    }, 150);
  });

  onNavigate();
})();

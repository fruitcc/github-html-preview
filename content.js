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
    const rest = decodeURIComponent(m[3]);
    if (!/\.html?$/i.test(rest)) return null;
    return { owner: m[1], repo: m[2], rest };
  }

  // GitHub embeds the file content in a JSON payload on blob pages. The blob
  // object's nesting varies by route version, so search for it.
  function findBlobIn(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 8) return null;
    if (Array.isArray(obj.rawLines)) return obj;
    for (const key of Object.keys(obj)) {
      const found = findBlobIn(obj[key], depth + 1);
      if (found) return found;
    }
    return null;
  }

  function getEmbeddedBlob() {
    for (const s of document.querySelectorAll(
      'script[data-target="react-app.embeddedData"]'
    )) {
      try {
        const blob = findBlobIn(JSON.parse(s.textContent)?.payload, 0);
        if (blob) return blob;
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  }

  async function getHtml(info) {
    const blob = getEmbeddedBlob();
    if (blob && !blob.truncated && blob.rawLines.length) {
      return blob.rawLines.join('\n');
    }
    // Fallback (large/truncated files): fetch raw via the background worker,
    // using the session so private repos work.
    const rawBtn = document.querySelector('[data-testid="raw-button"]');
    const url =
      (rawBtn && rawBtn.href) ||
      `https://github.com/${info.owner}/${info.repo}/raw/${info.rest}`;
    const resp = await chrome.runtime.sendMessage({ type: 'fetchRaw', url });
    if (!resp || !resp.ok) {
      throw new Error(resp ? resp.error : 'no response from background');
    }
    return resp.text;
  }

  function baseUrlFor(info) {
    const dir = info.rest.slice(0, info.rest.lastIndexOf('/') + 1);
    return `https://github.com/${info.owner}/${info.repo}/raw/${dir}`;
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
    document.getElementById(PREVIEW_ID)?.remove();
    document.getElementById(TOGGLE_ID)?.remove();
    const section = document.querySelector('[data-ghp-hidden]');
    if (section) {
      section.style.display = '';
      section.removeAttribute('data-ghp-hidden');
    }
  }

  function setMode(mode) {
    const container = document.getElementById(PREVIEW_ID);
    const section = document.querySelector('[data-ghp-hidden], section[data-ghp-code]');
    const toggle = document.getElementById(TOGGLE_ID);
    if (!container) return;
    const codeSection = container.ghpCodeSection;
    if (mode === 'preview') {
      container.style.display = '';
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

  function buildPreview(html, info, codeSection) {
    const container = document.createElement('div');
    container.id = PREVIEW_ID;
    container.className = 'ghp-preview';
    container.ghpCodeSection = codeSection;

    // viewer.html relays to the manifest-sandboxed renderer page; embedding
    // sandbox.html directly here reloads the tab (web pages can't embed
    // manifest-sandboxed extension pages). Isolation comes from the manifest
    // sandbox on the inner frame.
    const iframe = document.createElement('iframe');
    iframe.className = 'ghp-frame';
    iframe.src = chrome.runtime.getURL('viewer.html');
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage(
        { html, baseUrl: baseUrlFor(info) },
        '*'
      );
    });
    container.appendChild(iframe);
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

    let html;
    try {
      html = await getHtml(info);
    } catch (e) {
      console.warn('[GitHub HTML Preview] could not load file:', e);
      return; // leave the normal code view alone
    }
    if (token !== setupToken || document.getElementById(PREVIEW_ID)) return;

    const container = buildPreview(html, info, section);
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

    // Size the frame to fill the viewport below its top edge.
    requestAnimationFrame(() => {
      const frame = container.querySelector('iframe');
      if (!frame) return;
      const top = container.getBoundingClientRect().top + window.scrollY;
      const h = Math.max(500, window.innerHeight - Math.min(top, 300) - 16);
      frame.style.height = h + 'px';
    });
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

  // GitHub is a soft-navigating SPA (Turbo); watch for URL changes.
  document.addEventListener('turbo:load', onNavigate);
  document.addEventListener('turbo:render', onNavigate);
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      onNavigate();
    }
  }, 400);

  onNavigate();
})();

// Extension page framed into the GitHub page (extension frames are exempt
// from GitHub's CSP). It frames the file's raw URL; the background service
// worker's declarativeNetRequest rules rewrite the raw response's headers
// (Content-Type -> text/html, drop the sandboxing CSP) so the document
// renders. The sandbox attribute on the inner frame keeps the rendered
// document origin-isolated: no cookies, no GitHub access.
const frame = document.getElementById('frame');

function fail(message) {
  frame.remove();
  document.body.style.cssText =
    'margin:0;padding:16px;font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:#57606a';
  document.body.textContent = 'GitHub HTML Preview: ' + message;
  // Tell the content script to restore GitHub's code view.
  window.parent.postMessage({ type: 'ghp-load-failed' }, '*');
}

function allowedUrl(u) {
  return (
    u.protocol === 'https:' &&
    (u.hostname === 'raw.githubusercontent.com' ||
      (u.hostname === 'github.com' &&
        /^\/[^/]+\/[^/]+\/raw\//.test(u.pathname)))
  );
}

let url = null;
try {
  url = new URL(decodeURIComponent(location.hash.slice(1)));
} catch (e) {
  /* no/invalid hash */
}

if (!url || !allowedUrl(url)) {
  fail('invalid document URL.');
} else {
  (async () => {
    // Wake the service worker so the DNR rules exist even right after a
    // browser restart (session rules are cleared on restart and the lazy
    // MV3 worker may not have run yet).
    try {
      await chrome.runtime.sendMessage({ type: 'ensureRules' });
    } catch (e) {
      /* worker unavailable; rules were installed at last wake */
    }

    // Preflight with this page's credentials. This both detects failures
    // (404, LFS pointer served as error, auth) so the code view can be
    // restored, and resolves github.com/<o>/<r>/raw/... redirects to the
    // tokenized raw.githubusercontent.com URL — which the sandboxed
    // (cookieless) inner frame can then load even for private repos.
    let finalUrl;
    try {
      const resp = await fetch(url.href, {
        credentials: 'include',
        redirect: 'follow',
      });
      if (!resp.ok) {
        fail('could not load the file (HTTP ' + resp.status + ').');
        return;
      }
      const resolved = new URL(resp.url);
      finalUrl = allowedUrl(resolved) ? resolved.href : url.href;
    } catch (e) {
      fail('could not load the file (' + (e && e.message) + ').');
      return;
    }
    frame.src = finalUrl;
  })();
}

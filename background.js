// Fetches raw file content on behalf of the content script.
// Runs in the service worker so host_permissions let it follow the
// github.com/<owner>/<repo>/raw/... redirect (with session cookies)
// to raw.githubusercontent.com, which works for private repos.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'fetchRaw') {
    fetch(msg.url, { credentials: 'include', redirect: 'follow' })
      .then(async (r) => {
        if (!r.ok) {
          sendResponse({ ok: false, error: 'HTTP ' + r.status });
          return;
        }
        sendResponse({ ok: true, text: await r.text() });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async sendResponse
  }
});

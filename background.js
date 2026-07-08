// Rewrites response headers for raw HTML files loaded in the extension's
// viewer subframe: raw content is served as text/plain with a sandboxing
// CSP, so set an HTML content type and drop those headers. Scoped to
// sub_frame requests for .html/.htm raw URLs only — top-level "Raw" file
// viewing is unaffected.
const HEADER_ACTION = {
  type: 'modifyHeaders',
  responseHeaders: [
    { header: 'content-type', operation: 'set', value: 'text/html; charset=utf-8' },
    { header: 'content-security-policy', operation: 'remove' },
    { header: 'x-content-type-options', operation: 'remove' },
    { header: 'content-disposition', operation: 'remove' },
    { header: 'x-frame-options', operation: 'remove' },
  ],
};

const RULES = [
  {
    id: 1,
    priority: 1,
    action: HEADER_ACTION,
    condition: {
      regexFilter: '^https://raw\\.githubusercontent\\.com/.+\\.html?([?#].*)?$',
      resourceTypes: ['sub_frame'],
      // Only requests initiated by this extension's viewer page — other
      // sites framing raw HTML must not get the rewritten headers.
      initiatorDomains: [chrome.runtime.id],
    },
  },
  {
    id: 2,
    priority: 1,
    action: HEADER_ACTION,
    condition: {
      regexFilter: '^https://github\\.com/[^/]+/[^/]+/raw/.+\\.html?([?#].*)?$',
      resourceTypes: ['sub_frame'],
      initiatorDomains: [chrome.runtime.id],
    },
  },
];

function installRules() {
  return chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: RULES.map((r) => r.id),
    addRules: RULES,
  });
}

// Session rules are cleared on browser restart and this worker is lazy, so
// install on every wake, on install/update, and on browser startup. The
// viewer page additionally sends ensureRules before loading a document,
// which both wakes the worker and confirms the rules exist.
installRules();
chrome.runtime.onInstalled.addListener(installRules);
chrome.runtime.onStartup.addListener(installRules);
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'ensureRules') {
    installRules().then(
      () => sendResponse({ ok: true }),
      (e) => sendResponse({ ok: false, error: String(e) })
    );
    return true; // async sendResponse
  }
});

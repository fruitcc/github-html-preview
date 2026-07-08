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
    },
  },
  {
    id: 2,
    priority: 1,
    action: HEADER_ACTION,
    condition: {
      regexFilter: '^https://github\\.com/[^/]+/[^/]+/raw/.+\\.html?([?#].*)?$',
      resourceTypes: ['sub_frame'],
    },
  },
];

chrome.declarativeNetRequest.updateSessionRules({
  removeRuleIds: RULES.map((r) => r.id),
  addRules: RULES,
});

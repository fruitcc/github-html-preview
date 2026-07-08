// Sandboxed page: receives the document HTML from the content script and
// writes it into this page. The manifest's sandbox CSP allows inline and
// external scripts here, while the sandbox keeps it origin-isolated from
// GitHub (no cookies, no parent DOM access).
window.addEventListener(
  'message',
  (event) => {
    const data = event.data || {};
    if (typeof data.html !== 'string') return;

    let html = data.html;
    // Resolve relative URLs (images, css) against the file's location in the
    // repo, unless the document sets its own <base>.
    if (data.baseUrl && !/<base[\s>]/i.test(html)) {
      const baseTag = '<base href="' + data.baseUrl.replace(/"/g, '%22') + '">';
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => m + baseTag);
      } else {
        html = baseTag + html;
      }
    }

    document.open();
    document.write(html);
    document.close();
  },
  { once: true }
);

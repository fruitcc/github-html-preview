// Extension page framed into the GitHub page (extension frames are exempt
// from GitHub's CSP). It frames the file's raw URL directly; the background
// service worker's declarativeNetRequest rules rewrite the raw response's
// headers (Content-Type -> text/html, drop the sandboxing CSP) so the
// document renders. The sandbox attribute on the inner frame keeps the
// rendered document origin-isolated: no cookies, no GitHub access.
const frame = document.getElementById('frame');

let url = null;
try {
  url = new URL(decodeURIComponent(location.hash.slice(1)));
} catch (e) {
  /* no/invalid hash */
}

const allowed =
  url &&
  url.protocol === 'https:' &&
  (url.hostname === 'raw.githubusercontent.com' ||
    (url.hostname === 'github.com' &&
      /^\/[^/]+\/[^/]+\/raw\//.test(url.pathname)));

if (allowed) {
  frame.src = url.href;
} else {
  document.body.textContent = 'GitHub HTML Preview: invalid document URL.';
}

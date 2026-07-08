// Normal (non-sandboxed) extension page framed into the GitHub page. It
// exists because Chrome only supports embedding manifest-sandboxed pages
// from extension pages, not from web pages — so this page relays the HTML
// from the content script to the sandboxed renderer frame.
const frame = document.getElementById('frame');

let pending = null;
let frameReady = false;

frame.addEventListener('load', () => {
  frameReady = true;
  if (pending) {
    frame.contentWindow.postMessage(pending, '*');
    pending = null;
  }
});

window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (typeof data.html !== 'string') return;
  if (frameReady) {
    frame.contentWindow.postMessage(data, '*');
  } else {
    pending = data;
  }
});

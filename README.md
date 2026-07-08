# GitHub HTML Preview

Chrome extension that renders `.html` / `.htm` files on GitHub as actual pages
instead of source code, with a **Code / Preview** toggle in the file toolbar.
Default view is the rendered preview.

- Works on `github.com` file (blob) pages, including private repos (private
  files load via the tokenized raw URL from the Raw button).
- Scripts inside the document run, but in a sandboxed, origin-isolated frame:
  no access to GitHub cookies, the GitHub page, or your session.
- Large files that GitHub truncates in the code view render in full (the
  preview loads the raw file directly).
- How it renders: the preview frames the file's raw URL, and the extension
  rewrites that response's headers (`Content-Type: text/html`, drops the
  sandboxing CSP) via `declarativeNetRequest` — for `.html`/`.htm` sub-frame
  requests only; opening Raw directly is unaffected.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

## Files

- `manifest.json` — MV3 manifest
- `content.js` — detects HTML blob pages, injects the preview + toggle
- `content.css` — toggle and preview frame styling
- `background.js` — declarativeNetRequest header-rewrite rules for raw HTML
- `viewer.html` / `viewer.js` — extension page that frames the raw file in a
  sandboxed iframe

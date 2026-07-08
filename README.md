# GitHub HTML Preview

Chrome extension that renders `.html` / `.htm` files on GitHub as actual pages
instead of source code, with a **Code / Preview** toggle in the file toolbar.
Default view is the rendered preview.

- Works on `github.com` file (blob) pages, including private repos (uses your
  logged-in session).
- Scripts inside the document run, but in a fully sandboxed, origin-isolated
  frame: no access to GitHub cookies, the GitHub page, or your session.
- Large files that GitHub truncates in the code view are fetched raw and
  rendered in full.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

## Files

- `manifest.json` — MV3 manifest; declares the sandboxed viewer page
- `content.js` — detects HTML blob pages, injects the preview + toggle
- `content.css` — toggle and preview frame styling
- `background.js` — raw-content fetch with session credentials (fallback path)
- `sandbox.html` / `sandbox.js` — origin-isolated page that renders the document

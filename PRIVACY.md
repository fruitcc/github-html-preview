# Privacy Policy — GitHub HTML Preview

**Effective date:** July 8, 2026
**Publisher:** Fruit Cloud Co. LLC
**Extension:** GitHub HTML Preview (Chrome extension)

## Summary

GitHub HTML Preview does not collect, store, transmit, sell, or share any user
data. All processing happens locally in your browser.

## What the extension does

The extension renders `.html` and `.htm` files hosted on github.com as
formatted pages instead of source code, and adds a Code / Preview toggle to
GitHub's file view. To do this, it loads the file's raw content from GitHub
(github.com or raw.githubusercontent.com) into a sandboxed preview frame in
the same tab.

## Data collection

The extension collects **no data of any kind**. Specifically, it does not
collect or transmit:

- Personally identifiable information
- Health, financial, or authentication information
- Personal communications
- Location data
- Web browsing history or user activity (clicks, keystrokes, etc.)
- Website content

The extension has no analytics, no telemetry, no error reporting, no
accounts, and no server of its own. It makes no network requests to any host
other than GitHub's own domains (github.com and raw.githubusercontent.com),
and only to fetch the file you are already viewing.

## Permissions explained

- **Host access to github.com and raw.githubusercontent.com:** required to
  detect HTML file pages on GitHub and load the raw file content for display.
  The extension runs only on these domains.
- **declarativeNetRequest:** used to adjust response headers solely for raw
  HTML files loaded inside the extension's own preview frame, so they can
  render as pages. Specifically, the `Content-Type` header is set to
  `text/html`, and the `Content-Security-Policy`, `X-Content-Type-Options`,
  `Content-Disposition`, and `X-Frame-Options` headers are removed on those
  responses. These rules apply only to `.html`/`.htm` sub-frame requests
  initiated by the extension itself and never to your normal browsing.

## Security and isolation

Previewed documents render inside a sandboxed, origin-isolated frame. Scripts
within a previewed document cannot access your GitHub session, cookies, or
the GitHub page, and cannot open popups or dialogs or trigger downloads.
Files in private repositories are loaded using your own logged-in GitHub
session and are never sent anywhere else.

## Local storage

The extension stores no data. Your Code / Preview choice exists only for the
current page view and is not persisted.

## Changes to this policy

If a future version of the extension changes any of the above, this policy
will be updated before that version is published, and the extension's Chrome
Web Store listing will reflect the change.

## Open source

The complete source code is available for inspection at
<https://github.com/fruitcc/github-html-preview>.

## Contact

Questions about this policy: <fruitcc@gmail.com>

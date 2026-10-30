# Open in a new tab, never a popup window

Answers the comment on Order create 3c: Open that order made a new browser window where a plain link in a new tab was meant.

later.md on main was read first. It has one entry, Recently deleted, kept for later at the user's decision. This package settles no entry.

## 1. A new tab, never a popup window

**The problem.** The note on Order create 3c said Open that order and Open that draft "open in a new window". It meant a link with `target="_blank"`, but the word reads as a browser popup window, which Spendly never opens.

**What changed.** The note now says they open in a new tab, as a plain link with `target="_blank"` and `rel="noopener"`, and that Spendly never opens a popup window. The rule holds for every place in the app that opens something beside the page.

**Where.** `Order create 3c`, the note under the dialog. App: `react/src/pages/OrderRepeats.jsx` (`open`) is already a `Button` with `to`, `target="_blank"` and `rel="noopener"`, a plain link, and needs no change.

**What is still open.** Nothing.

## 2. Three places that open a popup window

**The problem.** Three calls pass `'noopener'` as the third argument of `window.open`. Some browsers read any third argument as a request for a popup, and open a separate window without the tab bar instead of a tab:

- `react/src/components/List.jsx:312`: a row with an `href`, opened by its click.
- `react/src/app/Palette.jsx:333`: a palette entry opened beside the page.
- `react/src/pages/Bookmarks.jsx:315`: Open at {site} in a bookmark's menu.

**What changed.** Each opens a new tab:

- Where the thing pressed can be a link, it is a real `<a href target="_blank" rel="noopener">`. The browser then opens a tab, and a middle click or a long press work as on any link.
- Where it has to be opened from code, the call has no third argument, and the new tab's link back to the page is cut after it opens: `const tab = window.open(url, '_blank'); if (tab) tab.opener = null`.

No `window.open` in the app passes a third argument.

**Where.** The three files above. Nothing drawn changes.

**What is still open.** Nothing.

## Files

- `CHANGES.md` - this note.
- `README.md` - the design's overview, unchanged from the project root.
- `Order create.dc.html` - section 1, the 3c note.
- `support.js`, `components.js`, `view.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/order-create.css` - loaded by the page, unchanged from main.

Every file is main's `design/` copy as of 2026-10-30T08:52Z, with only the change above. `styles/components.css` is main's, without the comment change in `handoff_language_setting_fixed`.

`styles/check.js`: 0 finding(s) across 28 pages.

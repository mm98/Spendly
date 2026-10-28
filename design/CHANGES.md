# Sums story spacing, and the go-to keys from later.md

## 1. The Sums story sits its rows high

**The problem.** In Storybook, Data/Charts and figures - Sums, each summary row has more space under its text than above it, so the rows read top-heavy. The story puts the `Sum` rows straight into `Card`. The card spaces its children 12px apart, and that gap lands above each row's divider: 8px above the text, 20px below it.

**What changed.** The rows are wrapped in `<div className="sp-stack">`, as Summary rows c21 draws them and as `react/src/pages/Order.jsx` already does. Each row now has 8px above and below its text. The component and its CSS are unchanged.

**Where.** `storybook/stories/Data.stories.jsx`, export `Sums`. The corrected export is in `storybook/stories/Data.stories.Sums.jsx` in this package; replace the existing `Sums` export with it. Reference: `Components.dc.html` c21, `.sp-sum` and `.sp-stack` in `styles/components.css`.

**What is still open.** Nothing.

## 2. later.md: The design shows no key for Budget, Bookmarks or Home

**The problem.** Navigation shell 9d listed the go-to keys as G then O, T, V, C, A, S and did not show G then B for Budget, which the app has. Bookmarks and Home had no stated key, and the row's order did not follow the sidebar.

**What changed.** The go-to row reads "Go to Orders / Vendors / Categories / Budget / Statistics / Ask / Settings", keys "G then O, V, C, B, T, A, S", in the sidebar order. Home and Bookmarks have no key, and the row says so.

**Where.** `Navigation shell.dc.html` 9d, the shortcuts table. App: `react/src/app/Shortcuts.jsx` - list the go-to rows in this order in the shortcuts sheet; no key is added for Home or Bookmarks. This settles the later.md entry "The design shows no key for Budget, Bookmarks or Home"; remove it.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `storybook/stories/Data.stories.Sums.jsx` - the corrected `Sums` story export.
- `Navigation shell.dc.html` - 9d with the go-to row.
- `support.js`, `components.js`, `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/navigation-shell.css` - what the page loads to open from the folder.

## styles/check.js

0 finding(s) across 28 pages.

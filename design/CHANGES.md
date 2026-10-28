# The size of the "What changed" dialog

## Fixed from handoff_what_changed_dialog_size

**The problem.** In the earlier package, 11d state 6 sat in one column of its grid, so the dialog was drawn about 400 wide, not 640, and at 640 its list was too short to reach the 560 cap.

**What changed.** State 6 now spans both columns (`.st-span { grid-column: 1 / -1; }` in `styles/pages/settings.css`, a drawing class, not for the app), so the dialog is drawn at 640. Versions 1.3.1, 1.2.1 and 1.2.0 have more lines, so the list overflows at 640 and the dialog stops at its cap and scrolls. The app's rule is unchanged from the earlier package.


## 1. Width

**The problem.** The "What changed" dialog on Settings > This build is 420px wide, the width of every dialog (`.sp-dialog { width: 420px; }`), so the release notes are cramped on a wide screen.

**What changed.** On desktop (640px and up), a dialog that holds a scrolling list is 640 wide, the width Settings caps its column at (`.sp-column--form`, `.st-pane`). It keeps `max-width: 100%`, so a narrower window gives it what room there is. Every other dialog stays 420. On a phone nothing changes.

**Where.** `Settings and import 11d`, state 6, and its note "The dialog scrolls, not the page". `Components c13`, the Fixed note. `styles/components.css`, a new `@media (min-width: 640px)` rule on `.sp-dialog:has(> .sp-dialog__scroll)`, after the existing rule. App: `react/src/pages/SettingsBuild.jsx` uses it as it is; only the stylesheet changes.

**What is still open.** Nothing.

## 2. Height

**The problem.** With many versions the list is long, and the dialog is as tall as the window less the scrim's padding (`calc(100dvh - var(--sp-16) * 2)`), so on desktop it always reaches the top and bottom of the window.

**What changed.** On desktop the dialog is at most 560 tall, the cap the Budget year's scrolling region already uses (`.bg-scroll`), or the window less the padding when that is shorter: `max-height: min(560px, calc(100dvh - var(--sp-16) * 2))`. A short list is still as tall as its content. The list scrolls inside it, and the heading and Close stay in view, as before. The phone keeps the current cap.

State 6 is now drawn at the desktop size: a 680px window, all seven versions (the running 1.4.2 and the four earlier ones that "Show 4 earlier versions" counts, plus the two above them), so the dialog stops at 560 and scrolls. Its label reads "6 - EARLIER VERSIONS, OPEN, DESKTOP".

**Where.** `Settings and import 11d`, state 6. `styles/components.css`, the same media rule as in 1. `styles/pages/settings.css`, `.st-window` (a drawing stand-in, 360 to 680px tall; not for the app).

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - 11d state 6 at the new size, and its note.
- `Components.dc.html` - c13's Fixed note names the wider, capped list dialog.
- `styles/components.css` - the new desktop rule for the list dialog.
- `styles/pages/settings.css` - the taller drawing window for 11d, and `.st-span` so state 6 is drawn at full width.
- `styles/tokens.css`, `styles/doc.css`, `support.js`, `components.js`, `icons.js` - what the two pages load to open from this folder.

## styles/check.js

0 finding(s) across 28 pages.

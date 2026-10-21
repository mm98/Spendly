# Ask Spendly: two faults found in building

Answers the brief "Ask Spendly: two faults found in building" (21 Oct 2026).

## 1. A table in an answer when the first column is short

- **The problem:** `.sp-chat__figures .sp-table` cut its first column with "..." (`th:first-child`, `td:first-child`: `max-width: 0`, ellipsis, nowrap). In Carsten's lamp answer (Type, Lamp, Price, Order) the short Type column was cut to "P..." while the longer text columns were not.
- **What changed:** nothing in an answer's table is cut. The number and amount columns stay as wide as their content, on one line, `--sp-12` apart; every text column shares the rest and wraps when longer, whichever column comes first. This is how a native auto-layout table behaves; it stays `sp-table`, with no second table component. No column needs marking for this, so nothing reads `sp-col-title` in an answer to decide a cut. The emailed table (`api/src/lib/assistantChat.js`) already wraps and does not change.
- **Where:** `styles/components.css`, the `.sp-chat__figures .sp-table th:first-child, td:first-child` rule removed and the comment above `.sp-chat__figures .sp-table` rewritten. `Ask Spendly.dc.html` 24a note "Answers"; `Components.dc.html` c34, the Fixed note and a new specimen answer holding the lamp table (Type first). `Mobile screens.dc.html` 7a has no markup change and draws by the new rule. In the app, `react/src/app/assistantAnswer.jsx` takes the stylesheet; remove any cut it adds of its own.
- **What is still open:** nothing.

## 2. A long saved question on the empty page is not cut

- **The problem:** `.sp-chat__examples` is centred in `.sp-chat__start` (`align-items: center`), so it took the width of its widest content and the button's `max-width: min(320px, 100%)` referred to that. In 24b state 6 a long question was 880px in a 566px column; on an iPhone 15 the page scrolled sideways by 521px.
- **What changed:** the list takes the column's width (`align-self: stretch`), its items still centred, so a saved question is cut at 320px and never wider than the column. Nothing else in the look changes.
- **Where:** `styles/components.css`, `.sp-chat__examples`. `Ask Spendly.dc.html` 24b states 1 and 6 draw by it with no markup change. In the app, `react/src/components/Chat.jsx` (`ChatExamples`, `ChatPick`) and `react/src/pages/Ask.jsx` take the stylesheet.
- **What is still open:** nothing.

## later.md: A deleted record should not be removed for good at once

- **The problem:** a deleted record can only be restored from the toast, for 6 seconds; "Recently deleted" is not drawn.
- **What changed:** nothing in this pass. It stays in `later.md`.
- **Where:** no page.
- **What is still open:** how long a copy is kept, which kinds get one, whether bulk delete keeps copies, and where Recently deleted lives. Please confirm when it is taken up.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a note (point 1); 24b draws point 2.
- `Components.dc.html` - c34 note and the lamp specimen (point 1).
- `Mobile screens.dc.html` - 7a, drawn by both points; only its stylesheet version changed.
- `styles/components.css` - points 1 and 2.
- `styles/check.js` - new assertions "figures in an answer are never cut" and "a saved question is cut at the column".
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/ask-spendly.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - loaded by the pages above, unchanged.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.

Every other page changed only in the version number on its stylesheet link (`components.css?v=v20261021s`). Those pages are not in this package.

## styles/check.js

0 finding(s) across 27 pages.

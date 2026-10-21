# Ask Spendly: three cases the drawings did not cover

Answers `Brief-ask-spendly-fit.md` (found while building Ask Spendly, 24a, Mobile screens 7a, c34). Every question in the brief was settled here; Claude Code has nothing to ask.

## 1. A table in an answer on a phone

- **The problem:** on an iPhone 15 (393 wide) the bubble's inside is about 200px. `.sp-table` is `table-layout: fixed` with `.sp-col-amount` 152px and `.sp-col-number` 90px, so the name column got no width: "VENDOR" and "ORDERS" printed on top of each other and amounts were cut at the right edge.
- **What changed:** two things, together. In an answer the table sizes its number and amount columns to their content, `--sp-12` apart, and the name column takes the rest, cut with "..." when longer (the name is the link to its record, which shows it in full). On touch, an answer that holds a table takes the full column instead of 75%. Prose answers and questions keep the 75% cap.
- **Where:** `Mobile screens.dc.html` 7a, "ASK SPENDLY" (the first answer now holds the three-vendor table); `Ask Spendly.dc.html` 24a notes "A message is a mark and a bubble" and "Answers"; `Components.dc.html` c34 Fixed note. `styles/components.css`: new rules `.sp-chat__figures .sp-table`, `.sp-chat__figures .sp-table .sp-col-number / .sp-col-amount`, `.sp-chat__figures .sp-table td:first-child`, `.sp-touch .sp-chat__msg:has(.sp-chat__figures)`. `.sp-table` itself is unchanged. App: `react/src/app/assistantAnswer.jsx`, on `react/src/pages/Ask.jsx`; the touch rule needs the `sp-touch` class the phone layout already sets.
- **What is still open:** nothing.

## 2. A long saved question

- **The problem:** a saved question is kept as typed, up to 2000 characters, and `.sp-chat__saved > * { flex: none; }` let one button grow wider than the column: the desktop page scrolled sideways (1708px extra at 1440 wide), and on a phone one button could be wider than the screen.
- **What changed:** a saved question is one line, at most 320px wide and never wider than the row; a longer one is cut with "..." and shows the whole question as its tooltip. It still sends in full. The same cap applies to the static chip in Edit (state 7), whose remove button always stays in view. On a phone the row still scrolls sideways, each question under the same cap.
- **Where:** `Ask Spendly.dc.html` 24b states 6 and 7 (a long question added to both) and the notes "The saved row" and "7 - Edit"; `Mobile screens.dc.html` 7a (a long question first in the row); `Components.dc.html` c34. Markup: every saved question's text is `<span class="sp-truncate">` inside its button or chip, with `title` holding the full question. `styles/components.css`: new rules `.sp-chat__saved > .sp-btn--outline, .sp-chat__saved > .sp-chip { max-width: min(320px, 100%); }`, `.sp-chat__saved > .sp-btn--outline > .sp-truncate`, `.sp-chat__saved > .sp-chip > .sp-icon-btn`. App: the saved row on `react/src/pages/Ask.jsx`.
- **What is still open:** nothing.

## 3. Ask Spendly on a window under 560px tall

- **The problem:** Navigation shell 9g moves Settings and Dark mode into the account menu under 560px tall. Ask Spendly left the sidebar with them but was drawn nowhere, so it was reachable only by G then A and search.
- **What changed:** Ask Spendly moves into the account menu with them. The rows sit after Shortcuts and above Sign out, in the order they had in the sidebar: Ask Spendly, Settings, then the Dark mode switch. When the server has no assistant set up, the row is absent here too.
- **Where:** `Navigation shell.dc.html` 9c (note "Under 560px tall"), 9g (caption under the short sidebar, and the "< 560px" row of the heights table); `Ask Spendly.dc.html` 24a note "Route and entry". App: the account menu and the short-window sidebar in `react/src/components/Shell.jsx`.
- **What is still open:** the order of the three moved rows inside the menu was not drawn before; please confirm Ask Spendly, Settings, Dark mode after Shortcuts.

## 4. Calls made in the build, now in the design

- **The problem:** four behaviours were decided in the build and lived only in the brief.
- **What changed:** all four are kept as built: on a phone the hint line has no keys and shows only "2 questions left today" when 3 or fewer are left, at the right under the field; on a phone the field does not take focus when the page opens, on a desktop it does; Email this chat is absent when the server cannot send email; on a phone the placeholder reads "Ask a follow-up" once something is asked, while the desktop keeps "Ask about your orders, vendors and budget".
- **Where:** `Ask Spendly.dc.html` 24a note "The field", 24b note "3 - The day's limit", 24c note "Email this chat".
- **What is still open:** nothing.

## later.md: "A deleted record should not be removed for good at once"

- **The problem:** the entry's open questions include where "Recently deleted" lives, which needs a new place in the design.
- **What changed:** nothing in this pass. It was asked about here and left for later; the entry stays in `later.md`.
- **Where:** no page.
- **What is still open:** how long a copy is kept, which kinds get one, whether bulk delete keeps copies, and where Recently deleted lives. Please confirm when it is taken up.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a and 24b notes, the long saved question in states 6 and 7.
- `Mobile screens.dc.html` - 7a, the answer with a table and the long saved question.
- `Components.dc.html` - c34 notes and saved row markup.
- `Navigation shell.dc.html` - 9c note, 9g caption and table row.
- `styles/components.css` - the figures and saved row rules above.
- `styles/check.js` - two new assertions: "figures in an answer fit a phone" and "a saved question is capped".
- `styles/tokens.css`, `styles/doc.css` - loaded by every page, unchanged.
- `styles/pages/ask-spendly.css`, `budget.css`, `mobile-screens.css`, `navigation-shell.css` - loaded by the pages above, unchanged.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.

Every other page changed only in the version number on its stylesheet link (`components.css?v=v20261021p`); those pages are not in this package.

## styles/check.js

0 finding(s) across 27 pages.

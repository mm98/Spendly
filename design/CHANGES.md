# What Ask can do, shown to the reader (Brief-ask-help)

After review: the help is only what Ask can make. It has two parts, Files and Charts, each its formats on one comma-separated line and one example question. "Files are kept for 30 days" is a footnote at the left of Close (above Close on the phone), absent when the server makes no files. Answers, Also and Today are removed, and the charts read "Bar chart" and "Donut chart".

## 1. Where the help lives

**The problem.** Nothing on any Ask screen said that Ask can also make a file or draw a chart. A reader found it only by chance or in the README.

**What changed.**
- The empty page's line now reads: "Answers come from your orders, vendors, categories, budget and statistics, and can be a file or a chart. Asking never changes anything."
- The chat field has one icon button at its right edge, `circle-help`, with the tooltip and label "What Ask can do". It sits on the field's last line, level with Send, while the field grows. It is never disabled, also when the field is.
- No key is bound to it. "?" stays the keyboard shortcuts everywhere, and typing "?" in the field just types it.
- The button is part of the field, so it appears everywhere the field does: the empty page, a conversation, Chats, Files and the phone.
- On a computer it opens a Dialog with the heading "What Ask can do", the parts below and one action, Close. Escape, Close and a click on the scrim close it, and focus returns to the button. A dialog taller than the window scrolls its parts.

**Where.**
- `Ask Spendly 24b` 1, 6 and 7 (the empty page's line, and the note on 1).
- `Ask Spendly 24c`: the specimens "What Ask can do - the button in the field" and "What Ask can do - open", plus the notes.
- Every chat field on `Ask Spendly 24a-24f`, `Components` (the chat specimen) and `Mobile screens 7a`.
- `styles/components.css`: `.sp-chat__wrap`, and `.sp-chat__wrap > .sp-field__trail` (with its `.sp-touch` variant). These are new variant rules at the end of the file; no existing rule changed.
- `Icon legend`: a new row for `circle-help`.
- App: `react/src/components/Chat.jsx` `ChatDock` (the field and the button), `ChatStart` (the line), and `react/src/app/askListFrame.jsx` (Chats and Files show the button too, since it belongs to the field).

**What is still open.** Nothing.

## 2. What the help says, and how a long list looks

**The problem.** The list of what Ask makes grows on the server. The help has to follow that list without a design change.

**What changed.**
- Two parts, Files then Charts. Nothing else is in the help: what Ask reads stays on the empty page's line, and the limits stay under the field.
- The help states no limits. The questions left still show under the field (`Ask Spendly 24b` 3, 4), as before.
- Each part (`.sp-chat__help-part`) is built the same way: the section label, then its formats on one line, comma separated (`.sp-chat__formats`), then one example question.
- Files and Charts are filled from the server's list in `GET /api/assistant`. There is one part per kind, in the server's order, with the kind's name as its label and its formats joined with ", " on one line, using the names the server gives them. A new format is one more name in the line; a new kind is a new part. A kind with no formats is not shown.
- Copy:
  - Files: "Excel, CSV, Word, PDF", example "Make an Excel file of my orders in October".
  - Charts: "Bar chart, Donut chart", example "Show my spending per month as a chart".

**Where.** `Ask Spendly 24c` (the specimens and notes). `styles/components.css`: `.sp-chat__help`, `.sp-chat__help-part`, `.sp-chat__formats`. The `GET /api/assistant` payload gains the list of kinds; that is the build's part.

**What is still open.** The chart names are the names the server sends. The design uses "Bar chart" and "Donut chart" in place of "bars over time" and "shares of a whole" from the brief, so the server's list should send those names. Please confirm.

## 3. Pressing an example question

**The problem.** The brief left it to the design whether an example can be pressed.

**What changed.**
- An example is a saved question's button without its remove button (`.sp-chat__pick`): one line, at most 320px wide, cut with ... and showing the whole question as its tooltip.
- Pressing it closes the help and puts the question in the field, with the cursor at the end, replacing whatever was typed. It is not sent, so the reader can change "October" first.
- Saved questions on the empty page still send at once.

**Where.** `Ask Spendly 24c` notes. App: `ChatExamples` / `ChatPick` in `react/src/components/Chat.jsx`. The help reuses `ChatPick` without its remove button.

**What is still open.** Nothing.

## 4. On the phone

**What changed.**
- The phone has the same button at the field's right edge. It opens the same parts in the bottom sheet, with Close as a block button under them.
- A tap on the scrim or a drag down also closes the sheet.
- An example question closes the sheet and puts the question in the field, not sent. The keyboard opens only when the reader taps the field.

**Where.** `Mobile screens 7a`: the frame "ASK - WHAT ASK CAN DO" and its note. App: the phone's Ask in `react/src/pages/Ask.jsx`.

**What is still open.** Nothing.

## 5. When Ask is used up, or a server makes no files

**What changed.**
- Each part stays in place with a short note. Nothing is hidden without saying why.
- No questions left today: the example buttons are disabled, since the field is.
- No files on this server:
  - Files keeps its label, with the line "Ask cannot make files on this Spendly." and no list or example.

**Where.** `Ask Spendly 24c`: the specimens "No questions left today" and "This server makes no files", and the last note.

**What is still open.** Nothing.

## later.md: "For Claude Design: a file's row shows the format's name it is given"

This settles that entry, so it can be removed from `later.md`.

**The problem.** The handoff's `ChatFile` took a `type` and kept its own list of four format names, so a new format on the server would also need a change in the design.

**What changed.**
- `ChatFile` takes `kind`, the format's name as the server sends it ("Excel", "CSV"), instead of `type`. It no longer keeps a list of formats.
- The row reads as before: "Excel · 4 KB".

**Where.**
- `react_handoff/Chat.jsx` (`ChatFile`; the `TYPE` list is removed).
- `react_handoff/README.md` (the `ChatFile` paragraph).
- `React components` (the specimens pass `kind`).

**What is still open.** Nothing.

## later.md: "A deleted record should not be removed for good at once"

Not done in this pass, at the user's choice. Drawing "Recently deleted" is left for later, and the entry stays in `later.md`.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - the button in the field, the help dialog and its states (24c), the empty page's line (24b).
- `Mobile screens.dc.html` - the button on the phone and the help sheet (7a).
- `Components.dc.html` - the chat specimen's field with the button.
- `Icon legend.dc.html` - the `circle-help` row.
- `React components.dc.html` - `ChatFile` specimens with `kind`.
- `react_handoff/` - `Chat.jsx` and `README.md` changed; the other files are there so React components opens.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets. `components.css` gains the help and field rules at its end.
- `styles/pages/ask-spendly.css`, `mobile-screens.css`, `icon-legend.css`, `budget.css` - the page stylesheets these pages link.

## styles/check.js

0 finding(s) across 27 pages.

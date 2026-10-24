# Ask: a file row shows the file's name (fixed)

## Fixed from design_handoff_ask_file_row_name

- **The problem:** two decisions confirmed in chat after the package was presented lived only in chat: what a file that could not be made is called, and whether the second line still names the type now that the name has an ending.
- **What changed:** a file that could not be made keeps the name it would have had (drawn as "All orders.xlsx"), so its row reads like the others. The second line still names the type, Excel, Word, PDF or CSV, beside the name's ending. Both are notes; no markup or style changes.
- **Where:** `Ask Spendly 24d`, the note "A file row". In the app, `react/src/components/Chat.jsx` (ChatFile) already draws both.
- **What is still open:** nothing.

Answers the brief "a file row on Ask shows the file's name" (24 Oct 2026), and settles one entry in the repo's `later.md`.

Every page's stylesheet link is now `components.css?v=v20261024a`.

## 1. The file row's title is the file's name

- **The problem:** Ask 24d, the React components note and `emails/README.md` said a file row's title is the question as it was sent ("Make a spreadsheet of my orders at Bilka this year"). The app now shows the file's name, so the design and the app disagreed.
- **What changed:** the title is the name the file downloads as, without the time it was made: "Orders at Bilka in 2026.xlsx". The downloaded file is unchanged: "Orders at Bilka in 2026 (2026-10-22 14.05.33).xlsx". Two files from one question each have their own name. The tooltip, and the labels "Download", "Delete" and "Open the chat of" plus the title, follow the title. Truncation, the second line and every state are unchanged.
  - The drawn rows now carry file names: "Orders at Bilka in 2026.xlsx", "Orders in September 2026.xlsx", "September 2026 in summary.docx", "All orders.xlsx", "Orders at Bauhaus.csv", "Orders in October 2026.xlsx", "Budget for August 2026.pdf", "Orders in 2026.xlsx". The questions in the thread and the saved questions are unchanged.
- **Where:**
  - `Ask Spendly 24d`: the note "A file row" and the rows in states 1 to 5. `Ask Spendly 24e`: the rows and their labels.
  - `Components c34`: the file row specimens. `Mobile screens 7a`: the answer's row and the Files rows.
  - `React components`: the note "A file row is one component in two places" and the `ChatFile` specimens. `react_handoff/Chat.jsx`: the `title` prop's comment. `react_handoff/README.md`: the `ChatFile` paragraph.
  - `emails/README.md`: the files line. `emails/ask-chat-sample.json`: the two file titles, so `Auth and first run 20f` shows names.
  - In the app: `react/src/components/Chat.jsx` (ChatFile), `react/src/app/askAnswer.jsx`, `react/src/pages/AskFiles.jsx` and the answer email, as the brief names. No markup or style changes.
- **What is still open:** nothing.

## 2. later.md: a long conversation's bar is wider than 8px in Chrome

Settles the later.md entry "For Claude Design: a long conversation's bar is wider than 8px in Chrome". Remove the entry, and the rule at the end of `react/src/styles/app.css`.

- **The problem:** `scrollbar-width: thin` draws a 10px bar in Blink, which then ignores the 8px `::-webkit-scrollbar`. The thread's right inset counts on 8px, so in Chrome and Edge the thread was 2px narrower than the field under it.
- **What changed:** where `::-webkit-scrollbar` is supported, the long conversation's scroll takes `scrollbar-width: auto; scrollbar-color: auto`, so Blink and Safari draw the 8px bar the stylesheet already gives. Firefox keeps thin, which it draws at 8px. A phone still shows no bar.
- **Where:** `styles/components.css`, `@supports selector(::-webkit-scrollbar) { .sp-shell__body .sp-chat__scroll }`, after `.sp-shell--touch .sp-shell__body .sp-chat__scroll`. `Ask Spendly 24a` draws by it.
- **What is still open:** nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24d and 24e rows and note.
- `Components.dc.html` - c34 rows.
- `Mobile screens.dc.html` - 7a rows.
- `React components.dc.html` - the note and the `ChatFile` specimens.
- `Auth and first run.dc.html` - 20f, which draws the answer email from `emails/`.
- `react_handoff/` - `Chat.jsx` and `README.md` changed; the rest so React components opens.
- `emails/` - `README.md` and `ask-chat-sample.json` changed; the rest so 20f opens.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets; `components.css` carries fix 2.
- `styles/pages/ask-spendly.css`, `budget.css`, `mobile-screens.css`, `auth-and-first-run.css` - linked by the pages above.

`styles/check.js`: 0 finding(s) across 27 pages.

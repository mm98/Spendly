# Ask Spendly: files and charts in answers

Answers the brief "Files and charts in Ask Spendly answers" (22 Oct 2026). Decisions taken in the chat before drawing: the file card is a new part in Chat, several files share one frame, a chart reuses Bars and the Donut at their own sizes, a chart on a phone takes the full column and fits, a chart has no Download, a file in the email is named and not linked, a chart in the email is an image, one empty-page example becomes a file request, files are listed on a new Files page opened by a paperclip button after Email this chat, and the shown title is the question only, with the date and time going only into the downloaded file's name.

Every page's stylesheet link is now `components.css?v=v20261022b`.

## 1. The file card in an answer

- **The problem:** an answer could hold only text, lists, tables and links. The app had nothing to draw a file the reader can download.
- **What changed:** a new part, `.sp-chat__file`, one row per file inside one frame per answer, `.sp-chat__files`, with a `--line` rule between rows. The row is the document mark (`file-text` on `sp-mark--medium sp-mark--none`), the title, a second line in `sp-meta`, then Download (outline icon button, `download`, tooltip "Download", label "Download" plus the title).
  - The title is the question as it was sent, and nothing else: "Make a spreadsheet of my orders at Bilka this year". It is never followed by a date or time on screen. It is one line, cut with ..., the whole title as its tooltip. On touch it takes two lines before it is cut (`.sp-touch .sp-chat__file-name`).
  - The downloaded file is named the question, then the time it was asked in brackets, ISO 8601 to the minute in the account's time zone, the colon written as a hyphen: `Make a spreadsheet of my orders at Bilka this year (2026-10-22T14-05).xlsx`.
  - The second line is the type (Excel, Word, PDF, CSV) and the size (KB under 1 MB, MB with one decimal above).
  - States: ready; being made (the spinner in Download's place, disabled, "Excel · Being made"); could not be made (the reason in `--red-ink` via `.sp-chat__failed`, no action): "Could not be made: too many orders for one file. Ask for one year at a time." or "Could not be made: today's files are used up. Ask again tomorrow."; gone (`[data-state="gone"]`, title in `--ink-4`, no action, "Removed after 30 days" or "Deleted").
  - Two files from one question share the title and are told apart by their type.
  - The waiting bubble while a file is made reads "Making your spreadsheet" (or "your document", "your PDF", "your CSV"); Stop ends the answer and the file.
  - Download on a signed-out tab opens sign-in, then the download.
  - On touch, an answer holding files takes the full column.
- **Where:** `Ask Spendly 24d` (full column, states 1 to 5), `Mobile screens 7a` (ASK - A FILE AND A CHART), `Components c34`. `styles/components.css`: `.sp-chat__files`, `.sp-chat__file`, `.sp-chat__file-name`, `.sp-chat__file[data-state="gone"]`, `.sp-touch .sp-chat__file-name`, `.sp-touch .sp-chat__msg:has(.sp-chat__files)`. `react_handoff/Chat.jsx`: `ChatFiles`, `ChatFile`. In the app: `react/src/components/Chat.jsx` (inside `ChatReply`), `react/src/app/assistantAnswer.jsx` (draws the files block), `react/src/pages/Ask.jsx` (the working label). It is a new part, not a variant of `Attachment` (17): an attachment is a tile with its name under it, a file in an answer is a row with a title, a second line and actions.
- **What is still open:** nothing.

## 2. A chart in an answer

- **The problem:** there was no chart in an answer, and no rule for how one fits a 290px phone bubble.
- **What changed:** a chart is the library's own Bars, or the Donut with its Shares, at their own sizes, inside the figure frame a table uses (`.sp-chat__figures` holding `.sp-chat__chart`). No smaller chart was needed, so there is no compact variant.
  - Above the chart: its name in `sp-section-label`, then the period or total in `sp-meta` (`.sp-chat__chart-name`). The legend sits under the chart only when there is more than one series, at most four on the four keys.
  - Bars over time take up to 12 columns at the default 140 height, no axis. A column drills into nothing, so it is a span with no hand and no lit bar, labelled for a screen reader ("August 2026, 9.840,00 kr., 31 orders").
  - Hover, keyboard focus or a tap shows the column's readout, the chart tooltip (`sp-tip--panel`): the step's full name and amount, then the order count, or one row per series with its key. It hangs above its column, centred; the first and last line up with their edge. A tap elsewhere closes it. `[data-open]` marks the tapped column.
  - Shares of a whole: the Donut (128) beside the Shares list, wrapping above it when the bubble is narrower (`.sp-chat__shares`). The five biggest of something show as the top three and Other, on the four keys, as Statistics does. Each row is key, name, amount, share, and a link to its category; Other opens Categories.
  - An answer holding a chart takes its full three quarters of the column, on touch the full column. On a phone 12 bars at the 8 gap are about 14px wide and fit; every second tick is left empty where two would touch, the existing chart rule.
  - A chart has no Download. The numbers are a file the reader can ask for.
  - Being made: the bubble reads "Drawing your chart". Could not be made: the frame and name stay, with one line in `--red-ink`: "This chart could not be made: a year is too many days to draw. Ask for it by month instead."
  - The frame does not scroll when it holds a chart, so the readout may hang over its edge.
- **Where:** `Ask Spendly 24d` (full column, states 6 to 10), `Mobile screens 7a`, `Components c34`. `styles/components.css`: `.sp-chat__figures:has(> .sp-chat__chart)`, `.sp-chat__msg:has(.sp-chat__chart)`, `.sp-chat__chart`, `.sp-chat__chart-name`, `.sp-chat__chart .sp-bars__col` and its `.sp-tip--panel` rules, `.sp-chat__shares`. `react_handoff/Chat.jsx`: `ChatChart`, `ChatShares`; `react_handoff/Data.jsx`: `Bars` takes a column's `label` and `readout`, and `open`. In the app: `react/src/components/Data.jsx` - `Bars`, `Donut`, `Shares`, `Legend` and `ChartTip` are reused at their sizes; `Plot` is not used in an answer. A Shares row in an answer is a link, not a filter button. `react/src/components/Chat.jsx` (`ChatFigures` holds the chart and does not scroll then), `react/src/app/assistantAnswer.jsx`, `react/src/pages/Ask.jsx` ("Drawing your chart").
- **What is still open:** nothing.

## 3. Files: the page that keeps them

- **The problem:** a conversation is kept for the visit only, while a file is kept for 30 days, so after the visit there was nowhere to download it.
- **What changed:** a Files page, `/ask/files`, opened by a third outline icon button after Email this chat (`paperclip`, tooltip and label "Files"). It is a link, so it is never disabled. On a phone it is a row in the Ask top bar's menu, after Email this chat and Clear. The list is the same file rows in the same frame, newest first, with Delete after Download (`trash`, tooltip "Delete"), and the second line adds "Kept until 2026-11-21". The controls bar has Back to Ask and "5 files, each kept for 30 days". Delete acts at once with the toast "File deleted" and Undo; after that the row in a conversation reads "Deleted". Empty: "No files yet", "Ask Spendly for a spreadsheet or a document, and it is kept here for 30 days." The conversation itself is still kept for the visit only.
- **Where:** `Ask Spendly 24e` (full page, the toast, the empty state), `Ask Spendly 24a` (every composer now carries Files; notes "Answers" and "Kept for the visit"), `Ask Spendly 24b` and `24c` (Files in every composer; 24c title, lede and notes), `Mobile screens 7a` (ASK - FILES, and the menu note). In the app: `react/src/pages/Ask.jsx` (the button), a new route for the Files page, and the API for listing and deleting a user's files.
- **What is still open:** nothing.

## 4. The email of the conversation (20f)

- **The problem:** the emailed chat had no way to show a file or a chart, and a file needs a sign-in to download.
- **What changed:** a file shows as its title, type and size in a frame like the app's, never linked, with one line under the frame: "Download it from Files in Ask until 2026-11-21." ("them" for more than one), Files in Ask linked to `/ask/files`. A file that could not be made reads "Could not be made:" and its reason. A chart shows as an image under its name and period: the server draws it as a PNG at twice its width (1040 for 520) and attaches it inline (`cid:`), so it shows without a sign-in and no address leads to it. Its alt text is the name and every value; the text version lists the values. Outlook for Windows takes the `width` attribute. The bars are #4f7f63 and the ticks the meta grey on a transparent ground, so it reads on the light and the dark card.
- **Where:** `emails/ask-chat.html` (the `files` and `chart` blocks, `.sp-bad` for the dark failed line), `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, `emails/ask-chart-sample.png`, `emails/README.md`, `Auth and first run 20f` (two notes under the Ask specimen). In the app: `api/src/emails/ask-chat.html` and `ask-chat.txt`, and the chart drawing on the server.
- **What is still open:** nothing.

## 5. The empty page examples (24b state 1)

- **The problem:** none of the three starting questions showed that an answer can be a file.
- **What changed:** "Am I over budget on transport?" is replaced by "Make a spreadsheet of my orders this month". The other two stay. A new account starts with these three; existing accounts get the new one once, by the existing rule.
- **Where:** `Ask Spendly 24b` state 1 and its note. In the app: the default saved questions in the API.
- **What is still open:** nothing.

## later.md: the last control in the chat field opens its tip to the left

- **The problem:** the tip of the last control at the right of the chat field was centred and reached past the window. The fix lived in `react/src/styles/app.css`.
- **What changed:** the tip of the last control in the chat field lines up with the control's right side. That control is now Files.
- **Where:** `styles/components.css`, beside the tooltip rules: `.sp-chat__composer > [data-tip]:last-child::after`. `Ask Spendly 24c` note. Remove the rule from `app.css` and this entry from `later.md`.
- **What is still open:** nothing.

## later.md: the confirm banner keeps the phone gutter on Ask

- **The problem:** Ask's body has no padding on a phone, so the confirm banner ran past the screen. The fix lived in `app.css` on `.au-banner`.
- **What changed:** on a page that fills the column, the banner keeps `--phone-gutter` at the sides and above.
- **Where:** `styles/components.css`, `.sp-touch .sp-shell__body--fill > .sp-list-item[data-color="warning"]` (the banner is drawn as the warning row, `Auth and first run 20e`). Notes in `Auth and first run 20e` (Level 2) and `Mobile screens 7a`. Remove the rule from `app.css` and this entry from `later.md`; if the app's banner keeps its own `.au-banner` class, give it this rule.
- **What is still open:** nothing.

## later.md: the vendor's alias hint names the matching rule

- **The problem:** the drawing's hint said "A receipt with one of these is filed here." and drew no refusal, while the app had moved on.
- **What changed:** the hint reads "Other names this vendor uses on receipts. Capitals, punctuation and endings like Inc or ApS do not count." An alias the name already matches is refused as it is added, the typed text stays, and the message in the danger help reads: "Nabu Casa, Inc." already matches Nabu Casa. Capitals, punctuation and endings like Inc or ApS do not count.
- **Where:** `Vendors and categories.dc.html`, the vendor form hint (two places) and a new specimen "THE FIELD - A SPELLING THE NAME ALREADY MATCHES" beside "THE FIELD". The scan-filled hint in the new-vendor form is unchanged. Remove this entry from `later.md`.
- **What is still open:** nothing.

## later.md: a deleted record should not be removed for good at once

- **The problem:** a deleted record can be restored only from the toast, and "Recently deleted" is not drawn.
- **What changed:** nothing in this pass, as decided in the chat. It stays in `later.md`.
- **Where:** no page.
- **What is still open:** how long a copy is kept, which kinds get one, whether bulk delete keeps copies, and where Recently deleted lives. Please confirm when it is taken up.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a, 24b, 24c changed; 24d and 24e new (points 1, 2, 3, 5, tip).
- `Mobile screens.dc.html` - 7a: two new phones and two notes (points 1, 2, 3, banner).
- `Components.dc.html` - c34: four specimens and notes for the file row and the chart.
- `Auth and first run.dc.html` - 20f email notes (point 4); 20e banner note.
- `Vendors and categories.dc.html` - the alias hint and refusal.
- `React components.dc.html` - loads `Chat.jsx` and renders its specimens.
- `index.html` - Ask lists 24d and 24e; 104 screens.
- `styles/components.css` - every rule named above.
- `styles/pages/ask-spendly.css` - `.as-thread` and `.as-page`, the frames 24d and 24e are drawn in.
- `styles/check.js` - unchanged, the run below.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/auth-and-first-run.css` - loaded by the pages above, unchanged.
- `emails/` - `ask-chat.html`, `ask-chat.txt`, `ask-chat-sample.json`, `README.md` and the new `ask-chart-sample.png` changed; the other emails unchanged, loaded by 20f.
- `react_handoff/` - `Chat.jsx` new, `Data.jsx` (Bars) and `README.md` changed; the rest unchanged, loaded by React components.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.

Every other page changed only in the version number on its stylesheet link. Those pages are not in this package.

## styles/check.js

0 finding(s) across 27 pages

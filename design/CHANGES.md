# Saved questions on the empty chat, the chat email in Outlook, and the chat field's placeholder

Answers three review points from 21 Oct 2026, after `design_handoff_ask_spendly_fit`. This package replaces that one's saved row: the row above the field, its 320px cap and the Edit state are not to be built. Its other points (answer tables on a phone, Ask Spendly in the short-window account menu, the build's four calls) stand as they are.

## 1. Saved questions and the examples

- **The problem:** the examples showed only while nothing was saved, so the reader could not remove them. Saved questions showed as a row above the field, and that row stayed above an active conversation too.
- **What changed:**
  - The examples are saved questions every account starts with: "How much did I spend on food in August?", "Which shop did I use most this year?" and "Am I over budget on transport?". They count toward the 8 and are removed like any other, and a removed one does not come back. Accounts that exist already get them once, skipping any wording already saved, and only as many as fit under 8.
  - On the empty page the saved questions sit under the empty state, oldest first. Each is the small outline button, which sends it at once, with a small remove icon button beside it that is always shown (`.sp-chat__pick`). Removing takes effect at once, with no undo and no confirm. There is no Edit and no Done. A question is one line, at most 320px wide and never wider than the column, cut with "..." and showing the whole question as its tooltip.
  - With nothing saved, the empty state shows one line under it: "Save a question with the bookmark beside it, and it shows here."
  - In a conversation nothing sits above the field. On a desktop the saved questions are a select at the left of the controls bar, **Saved questions**: the action select, the same as Set status in the bulk bar. Its panel is 320px wide and each question is cut as on the empty page. Choosing one sends it and closes the panel. It is absent with nothing saved and disabled with no questions left today. A phone has no select (`.sp-touch .sp-chat__saved-menu { display: none; }`): saved questions are on the empty page only, and Clear returns to it.
- **Where:** `Ask Spendly.dc.html` 24a (the select in the controls bar, no row above the field), 24b states 1 to 5 (the select in each conversation), state 6 "Opened with saved questions", state 7 "Nothing saved" (was "Editing the saved questions"), the new state 8 "A saved question in a conversation" and their notes. `Mobile screens.dc.html` 7a (no row in the dock). `Components.dc.html` c34 (no row in the dock, notes). `styles/components.css`: `.sp-chat__saved` and its rules are removed; new `.sp-chat__pick`, `.sp-chat__saved-menu .sp-combobox__panel`, `.sp-chat__saved-menu .sp-combobox__option > .sp-truncate`, `.sp-touch .sp-chat__saved-menu`. `.sp-chat__examples` is unchanged. App: `react/src/pages/Ask.jsx`; the server seeds the three examples for a new account, and for existing accounts once.
- **What is still open:** nothing.

## 2. The conversation email in Outlook for Windows

- **The problem:** in Outlook (the Word engine) the reader's initials mark was drawn as a wide green bar with the initials at the top, and the S mark had its letter at the bottom. Outlook ignores width, height and line-height on a div. Amounts broke across two lines ("46.300,88" / "kr.") because Outlook ignores `white-space: nowrap`. Text after a figures table touched the table because Outlook drops table margins and div padding. Every table row was about twice as tall as drawn because of the separated-border table.
- **What changed:**
  - Both marks are VML shapes in an Outlook-only block, as the header mark and the button already are: a 24px rounded square for S and a 24px circle for the initials. Other clients get a 24px table cell with the same fill, radius and type.
  - Every gap is a spacer or cell padding: 12px after each message, each part of an answer in its own cell with 6px below, 6px above a figures table and 4px above a list. These are the same gaps as before, except 2px more below a list (6, was 4).
  - A figures table is a bordered cell with an 8px radius holding a table of rows with `border-collapse: collapse`. Border colour, padding and type are unchanged.
  - Amounts are written by the server with a no-break space (U+00A0) between the number and the currency. `ask-chat-sample.json` does the same.
- **Where:** `emails/ask-chat.html`, `emails/ask-chat-sample.json`, `emails/README.md` ("Built for mail clients" and the ask-chat runs[] line). Drawn in `Auth and first run.dc.html` 20f item 11. App: the server code that renders `ask-chat.html`. Each amount run's text uses U+00A0 between the number and the currency.
- **What is still open:** nothing.

## 3. The chat field's placeholder on a phone

- **The problem:** the field uses `field-sizing: content` so it can grow from one line to six. When the field is empty the browser sizes it to the placeholder, so on a phone "Ask about your orders, vendors and budget" wrapped and the empty field opened two lines high.
- **What changed:** an empty field is one line, and a longer placeholder is cut with "...". Once something is typed it wraps and grows as before.
- **Where:** `styles/components.css`, new `.sp-textarea.sp-chat__field:placeholder-shown` and `.sp-textarea.sp-chat__field::placeholder`. `Ask Spendly.dc.html` 24a note "The field"; `Components.dc.html` c34. App: the field on `react/src/pages/Ask.jsx`. No other textarea sizes itself to its content.
- **What is still open:** nothing.

## later.md: "A deleted record should not be removed for good at once"

- **The problem:** its open questions include where "Recently deleted" lives, which needs a new place in the design.
- **What changed:** nothing in this pass. It stays in `later.md`.
- **Where:** no page.
- **What is still open:** how long a copy is kept, which kinds get one, whether bulk delete keeps copies, and where Recently deleted lives. Please confirm when it is taken up.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a and 24b, point 1 and the field note.
- `Mobile screens.dc.html` - 7a, the dock without the row.
- `Components.dc.html` - c34.
- `Auth and first run.dc.html` - 20f, where the email is drawn; only its stylesheet version changed.
- `emails/ask-chat.html`, `emails/ask-chat-sample.json`, `emails/README.md` - point 2. The other files in `emails/` are unchanged and are here because 20f loads them.
- `styles/components.css` - points 1 and 3.
- `styles/check.js` - assertions "a saved question is capped" (now on `.sp-chat__pick` and the select's options), "no saved row above the field", and "the chat placeholder is one line".
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/ask-spendly.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/auth-and-first-run.css` - loaded by the pages above, unchanged.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.

Every other page changed only in the version number on its stylesheet link (`components.css?v=v20261021r`). Those pages are not in this package.

## styles/check.js

0 finding(s) across 27 pages.

# Ask, the navigation, and later.md

Answers the brief of 21 Oct 2026 in chat: the Ask page's field, top and font sizes; Budget and Ask in the navigation; the sidebar's theme switch; Budget's count; and the entries in `later.md`. It follows `design_handoff_ask_answer_table_fixed` and holds everything since.

## 1. The field's placeholder sat high

- **The problem:** in the Ask field the placeholder sat 1-2px above centre. It is a step smaller than the field's text and took its own, shorter line height.
- **What changed:** the placeholder takes the field's line height, so it is centred. Its size and colour do not change.
- **Where:** `styles/components.css`, `.sp-textarea.sp-chat__field::placeholder` and its `.sp-touch` rule. `Ask Spendly.dc.html` 24a, 24b; `Mobile screens.dc.html` 7a. App: `react/src/components/Chat.jsx`.
- **What is still open:** nothing.

## 2. Ask has no controls bar; Email this chat and Clear sit beside Send

- **The problem:** the controls bar above the conversation (Saved questions, Email this chat, Clear) took a row of its own and left little under it.
- **What changed:** the page has no controls bar; the conversation starts directly under the top bar, which keeps only search. Clear and Email this chat are outline icon buttons to the right of Send, in that order (`trash`, `mail`), square at the field's height, each with its name as the tooltip (`data-tip`) and the aria-label. While sending, Email this chat shows the spinner with the tooltip "Sending"; once sent, the check with "Emailed", disabled until the conversation changes. Clear is disabled while an answer is coming. The Saved questions select is gone: saved questions are offered on the empty page only, and Clear returns to it.
- **Where:** `Ask Spendly.dc.html` 24a, 24b (state 8 removed), 24c; `Components.dc.html` c34 note. `styles/components.css`, `.sp-chat__composer > .sp-icon-btn`. App: `react/src/pages/Ask.jsx`, `react/src/components/Chat.jsx` (remove the saved-questions select).
- **What is still open:** the icon buttons are the field's height (42px, 48px on touch), not the 30px outline icon button, so the row is one height. Please confirm.

## 3. The conversation is the body size

- **The problem:** an answer mixed sizes: 14px text, 12px table cells and 14px amounts in the same row.
- **What changed:** questions, answers and every cell of an answer's table are the page's body size, `--t-13`, as running text and table rows are elsewhere. An amount in an answer takes that size and keeps its weight. The table head keeps its 11px label.
- **Where:** `styles/components.css`, `.sp-chat__msg`, `.sp-chat__question`, `.sp-chat__reply`, `.sp-chat__figures .sp-table td`, `.sp-chat__reply .sp-amount`. `Ask Spendly.dc.html` 24a note "Answers".
- **What is still open:** the emailed conversation keeps its own sizes (14px text, 13px cells). Please confirm.

## 4. Ask Spendly is called Ask

- **The problem:** the destination's name was longer than the others.
- **What changed:** "Ask Spendly" reads "Ask" everywhere it is a name: the sidebar and rail row, tooltips, the field's aria-label, Go to Ask in the palette, More on a phone, the page's titles and notes. The conversation email's label reads "Ask", its button "Ask something else", its footer "from Ask"; its subject is "Your Spendly conversation, 21 Oct 2026". The page's file stays `Ask Spendly.dc.html`, and the route stays `/ask`.
- **Where:** every page with the sidebar, `Navigation shell.dc.html`, `Mobile screens.dc.html` 7a, `Icon legend.dc.html`, `Auth and first run.dc.html` 20f (11), `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, `emails/README.md`. App: `react/src/components/Shell.jsx`, `react/src/pages/Ask.jsx`, `api/src/lib/assistantChat.js` (subject), `api/src/emails/ask-chat.*`.
- **What is still open:** the subject wording. Please confirm.

## 5. Budget is one row, above Statistics, with a count

- **The problem:** Budget was a group of its own with one row, "This year".
- **What changed:** Budget is a row named "Budget" in the Library group, directly above Statistics, on every sidebar and rail; the Budget group heading is gone. Its count is every budget payment due in the current calendar month, paid or not (14 in the drawings), from the same counts request as the other rows; it changes on the 1st, and with none due the row shows no count. The rail shows no count, as with every row; its tooltip is "Budget".
- **Where:** `Navigation shell.dc.html` 9a to 9i and its count note; the sidebars in `Ask Spendly.dc.html`, `Bookmarks.dc.html`, `Dark mode and image viewer.dc.html`, `Home.dc.html`, `Settings and import.dc.html`. App: `react/src/components/Shell.jsx`, the sidebar counts endpoint.
- **What is still open:** nothing. Also fixed in 9h: a stray second "All orders" row that opened Budget is removed.

## 6. No theme switch in the sidebar

- **The problem:** the sidebar's Dark mode switch repeated the theme setting in Settings, Appearance, and took a row.
- **What changed:** the switch is gone from the sidebar and the rail; the theme is set in Settings, Appearance, only, at every width. On a short window the account menu holds Ask and Settings. The palette command "Switch to dark mode" stays.
- **Where:** every sidebar as in 5; `Navigation shell.dc.html` 9c, 9g and notes; `Actions inventory.dc.html` (row removed); `Icon legend.dc.html` (moon, sun). App: `react/src/components/Shell.jsx`.
- **What is still open:** nothing.

## later.md: The phone's tab bar is 3px wider than the screen

- **The problem:** the tab bar ended at 396px on a 393px screen, so the page moved sideways by 3px.
- **What changed:** its columns may shrink below their label: `grid-auto-columns: minmax(0, 1fr)`. It looks the same.
- **Where:** `styles/components.css`, `.sp-tabbar`. App: `react/src/components/Shell.jsx` takes the stylesheet. This entry can be removed.
- **What is still open:** nothing.

## later.md: For Claude Design: a wide table in an answer scrolls sideways

- **What changed:** approved as made. `.sp-chat__figures` is `overflow-x: auto` in `components.css`, in place of `overflow: hidden`.
- **Where:** `styles/components.css`, `.sp-chat__figures`. Remove the rule from `react/src/styles/app.css` and this entry.
- **What is still open:** nothing.

## later.md: For Claude Design: a saved question's cap is a fixed 320px

- **What changed:** approved as made. `.sp-chat__pick > .sp-btn { max-width: 320px; }` replaces the `min(320px, 100%)` cap.
- **Where:** `styles/components.css`. Remove the rule from `react/src/styles/app.css` and this entry.
- **What is still open:** nothing.

## later.md: For Claude Design: the conversation email is almost full width

- **What changed:** approved as made. `emails/ask-chat.html` is now `api/src/emails/ask-chat.html` from main, with the rename in 4.
- **Where:** `emails/ask-chat.html`; `Auth and first run.dc.html` 20f (11) draws it. Copy it back to `api/src/emails/ask-chat.html`, take `ask-chat.html` out of `EMAIL_FIXES` and remove this entry.
- **What is still open:** nothing.

## later.md: For Claude Design: a comma no longer ends a value in a token field

- **What changed:** approved as made. TokenField commits on Enter only; a comma is part of the value; a pasted list adds one value per line.
- **Where:** `Components.dc.html`, the field actions note. Remove this entry.
- **What is still open:** nothing.

## later.md: A deleted record should not be removed for good at once

- **What changed:** nothing; it stays in `later.md`.
- **What is still open:** how long a copy is kept, which kinds get one, whether bulk delete keeps copies, and where Recently deleted lives. Please confirm when it is taken up.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 1, 2, 3, 4, 5, 6.
- `Components.dc.html` - c34 note (2), the token field note (later.md).
- `Mobile screens.dc.html` - 7a, the rename (4).
- `Navigation shell.dc.html` - 4, 5, 6.
- `Bookmarks.dc.html`, `Dark mode and image viewer.dc.html`, `Home.dc.html`, `Settings and import.dc.html` - their sidebars (4, 5, 6).
- `Auth and first run.dc.html` and `emails/` - the conversation email (4, later.md); the other emails are there so 20f opens.
- `Icon legend.dc.html`, `Actions inventory.dc.html` - 4, 6.
- `styles/components.css` - 1, 2, 3, the tab bar and the two approved rules.
- `styles/check.js` - new assertions: nothing but search in the top bar; an answer is one text size; the conversation is the body size; the theme is set in Settings only; a wide answer table scrolls in its frame; the tab bar fits the screen; the 320px cap.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/*.css` loaded by the pages above - unchanged, needed to open them.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.

Every page's stylesheet link is `components.css?v=v20261022a`. `index.html` also reads "Ask"; it is not in this package.

## styles/check.js

0 finding(s) across 27 pages.

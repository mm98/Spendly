# Assistant chat: asking about your money in the command palette

Answers `Brief-assistant-chat.md` ("an assistant chat inside Spendly"). The chat is a state of the existing command palette, not a new panel or window.

## 1. Where the chat opens from

- **The problem:** nothing for a chat was drawn. The brief offered a top bar button, a line in the palette, or a sidebar row.
- **What changed:** the palette is the only way in, on every device. With text typed, an **Ask** group is always the last group, holding one row: "Ask about your money: <typed text>". Choosing it sends the text as the first question. With nothing typed, the Actions group has a row **Ask about your money**, with no key cap, that opens the ask state empty. There is no top bar button, no sidebar row and no shortcut of its own; ⌘K and the search field open it. When the server has no assistant set up, neither row appears and the palette is exactly as before.
- **Where:** `Navigation shell.dc.html` 9d (Empty query, the Actions row; Typing, Ask comes last; the actions table; notes). App: `react/src/app/Palette.jsx`. `react/src/app/AppShell.jsx`, `react/src/components/Shell.jsx` and `react/src/app/Shortcuts.jsx` do not change.
- **What is still open:** nothing.

## 2. The shape of the chat

- **The problem:** the brief asked whether the chat is a side panel or a window over the page.
- **What changed:** the same palette, with the new variant `.sp-palette--ask`. It has the same 520px panel, scrim and 60vh cap; the body scrolls, and the query line and the foot stay put. The query line becomes a textarea, one line growing to four, then scrolling. It is led by a Back to search button and ended by Send (disabled while empty). Enter sends, Shift Enter makes a new line, Esc closes. The foot reads "↵ send · ⇧↵ new line · esc close" and ends with **New conversation**. On a phone it is the full-screen palette (`.sp-palette--screen.sp-palette--ask`) with no keyboard line in the foot.
- **Where:** `Navigation shell.dc.html` 9d, the second row of specimens. `Mobile screens.dc.html` 7b, "SEARCH · ASKING ABOUT YOUR MONEY" and its note. `Components.dc.html` c24, the specimen "Asking" and the note "Asking - variant". `styles/components.css`: `.sp-palette--ask`, `textarea.sp-palette__term`, `.sp-palette__term:disabled`, `.sp-palette__thread`, `.sp-palette__question`, `.sp-palette__reply`, `.sp-palette__figures`, `.sp-palette__working`, `.sp-palette__failed`, unlayered, beside `.sp-palette`. App: `react/src/app/Palette.jsx`; the overlay itself is unchanged.
- **What is still open:** nothing.

## 3. Reading the answer

- **The problem:** answers are text, short lists or a small table of amounts, and can name records.
- **What changed:** a question is `.sp-palette__question`, right-aligned on `--surface-2`. An answer is the record head row (`.sp-record__head`) holding the Spendly mark (the sidebar brand's `sp-mark--small sp-mark--solid` "S") and `.sp-palette__reply`. A reply holds paragraphs, a short list, and a compact static table framed in `.sp-palette__figures`. Every amount is `.sp-amount` (the Money component), in a sentence as in a cell. A named order, vendor or category is a link; following it closes the palette and opens the record. The assistant has no name of its own and is just Spendly.
- **Where:** `Navigation shell.dc.html` 9d, "An answer, then a follow-up"; `Components.dc.html` c24. App: `Palette.jsx`, using the existing `Money` component and record links.
- **What is still open:** nothing.

## 4. While the answer comes

- **The problem:** an answer takes a few seconds and must be stoppable.
- **What changed:** the question shows at once. The answer slot shows the spinner and "Reading your orders", and Send becomes **Stop** in the same place. Stop ends the request, drops the answer slot and keeps the question. The field stays typable, but Enter does nothing until the answer is in or stopped.
- **Where:** `Navigation shell.dc.html` 9d, "The answer coming"; `Mobile screens.dc.html` 7b.
- **What is still open:** nothing.

## 5. The conversation, and starting from an example

- **The problem:** a follow-up must use the earlier questions, and the conversation lasts for the visit.
- **What changed:** follow-ups are sent with the earlier questions and answers. Reopening the palette while a conversation exists opens it in the ask state at the latest answer, with the field focused; Back is one press from search. New conversation clears the thread and returns to the empty ask state, which lists three examples under **Try asking**: "How much did I spend on food in August?", "Which shop did I use most this year?" and "Am I over budget on transport?". Choosing one sends it. A reload ends the conversation.
- **Where:** `Navigation shell.dc.html` 9d, "Asking · nothing typed yet" and notes.
- **What is still open:** nothing.

## 6. The daily limit

- **The problem:** the chat must say when the day's questions are nearly gone or gone, and when asking opens again.
- **What changed:** the limit shows only near its end. With 3 or fewer left, the foot states the count ("2 questions left today") in `sp-meta--over`, before New conversation. At none, the amber inline alert closes the thread: "No questions left today" / "You can ask again tomorrow from 00:00. Search works as usual." The field is then disabled with the placeholder "No questions left today", and the Ask row and the Ask action are hidden from search.
- **Where:** `Navigation shell.dc.html` 9d, "An answer, then a follow-up · near the day's limit" and "No questions left today".
- **What is still open:** the time in the alert comes from the server's reset time. 00:00 local time is drawn; please confirm.

## 7. A failed answer

- **The problem:** a failure must show in the conversation and offer to try again.
- **What changed:** the failed answer stays where it would have been: "Spendly could not answer that just now." in `--red-ink`, and Try again (small outline button), which sends the same question again in place. A failed answer does not count against the day's limit.
- **Where:** `Navigation shell.dc.html` 9d, "An answer that failed".
- **What is still open:** whether the server counts a failed answer against the limit; the design assumes it does not. Please confirm.

## Not settled in this pass

- **later.md, "A deleted record should not be removed for good at once":** not done here. Its open questions (how long a copy is kept, which kinds get one, whether bulk delete keeps copies, where "Recently deleted" lives) were left for a later task. The entry stays in later.md.
- **The palette's rows are drawn two ways:** `Navigation shell.dc.html` 9d and `Mobile screens.dc.html` 7b lead each row with a small mark (`sp-mark--small`) and write group labels in sentence case. `Components.dc.html` c24 leads with a bare icon (`sp-palette__icon`) and writes them in capitals. The new states follow each page's own rows and do not resolve this. Please confirm which one is right.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Navigation shell.dc.html` - 9d: the Ask row, the Ask action, every ask state, and the notes.
- `Mobile screens.dc.html` - 7b: the asking phone and its note.
- `Components.dc.html` - c24: the ask variant specimen and its note.
- `styles/components.css` - the `.sp-palette--ask` variant and its parts.
- `styles/tokens.css`, `styles/doc.css` - loaded by every page.
- `styles/pages/navigation-shell.css` - loaded by Navigation shell.
- `styles/pages/mobile-screens.css`, `styles/pages/budget.css` - loaded by Mobile screens.
- `support.js`, `components.js`, `icons.js` - needed to open the pages from the folder.

## styles/check.js

0 finding(s) across 26 pages.

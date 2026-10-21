# Ask Spendly: a page for asking about your money, and folding facets in the design

Answers `Brief-assistant-chat.md` ("an assistant chat inside Spendly") and the review that followed it, in which the chat moved out of the command palette onto its own page. It replaces `design_handoff_assistant_chat_fixed`: nothing in that package is to be built. It also brings the facet groups' folding into the design (Order list 2b, c12), which production already does.

## 1. Where Ask Spendly opens from

- **The problem:** the brief asked where the chat opens. The earlier package answered with an ask state inside the command palette; review asked for its own sidebar row and a full page instead.
- **What changed:** a sidebar row **Ask Spendly**, icon `message-circle`, below the divider and directly above Settings, on every sidebar, the rail included (tooltip "Ask Spendly"). The route is `/ask`. The shortcut is **G then A**, in the shortcuts sheet and as a Go to destination in the palette. The palette has no ask state, no Ask row and no Ask action. On a phone it is a row in More, above Settings. When the server has no assistant set up, the row, the More row, the shortcut and the route are absent.
- **Where:** `Navigation shell.dc.html` 9a, 9b, 9g, 9h (sidebars), 9d (the shortcuts table row "Go to ... / Ask Spendly / Settings, G then O, T, V, C, A, S", and the note "Ask Spendly is not in the palette"). The same sidebar row in `Home.dc.html`, `Bookmarks.dc.html`, `Dark mode and image viewer.dc.html`, `Settings and import.dc.html`. `Mobile screens.dc.html` 7a (More row). `icons.js` gains `message-circle` from Tabler, registered in `Icon legend.dc.html` 19a. App: `react/src/components/Shell.jsx` (`Sidebar`, `NavItem`), `react/src/app/AppShell.jsx` (the row, the G then A key), `react/src/app/Shortcuts.jsx`, `react/src/app/Palette.jsx` (the Go to entry only), `react/src/pages/More.jsx`, a new page for `/ask`.
- **What is still open:** nothing.

## 2. The page and the conversation

- **The problem:** a full page for the chat, with Send and Clear.
- **What changed:** the page body is the controls bar (Email this chat, Clear, at the right) and the conversation filling the content column (`.sp-shell__body--fill`). Messages are bubbles, each at most 75% of the column. The reader's questions are at the right, on `--green-tint`, with their own account mark (initials on its swatch, or the profile photo) outside the bubble. Spendly's answers are at the left, on `--surface` with the `--line` border, with the solid "S" mark outside. Bubbles are 12 by `--card-pad` inside, and an answer's parts are 12 apart. Answers are text, short lists and small tables of amounts. Every amount uses the Money component, and every named order, vendor or category links to its record. The field under the thread is one control high and grows to six lines. Enter sends and Shift Enter makes a new line; Send is disabled while the field is empty. While an answer comes, its bubble holds the spinner and "Reading your orders", and Send becomes Stop. The conversation is kept for the visit only; a reload or signing out ends it. Follow-ups are sent with the earlier questions and answers.
- **Where:** `Ask Spendly.dc.html` 24a (the page), 24b states 1, 2, 5. New component **Chat**, `Components.dc.html` c34; `styles/components.css` `.sp-chat`, `.sp-chat__scroll`, `__thread`, `__msg`, `__msg--mine`, `__question`, `__reply`, `__figures`, `__working`, `__failed`, `__start`, `__examples`, `__dock`, `__dock--bar`, `__composer`, `__field`, `__hint`, and `.sp-shell__body--fill`, all unlayered and new. Page layout scaffolding only in `styles/pages/ask-spendly.css`.
- **What is still open:** nothing.

## 3. Empty page and examples

- **The problem:** the empty chat shows example questions.
- **What changed:** with nothing asked and nothing saved, the empty state ("Ask about your money" / "Answers come from your orders, vendors, categories and budget. Asking never changes anything.") shows three example questions as small outline buttons. Choosing one sends it.
- **Where:** `Ask Spendly.dc.html` 24b state 1.
- **What is still open:** nothing.

## 4. Saved questions

- **The problem:** asked in review: questions a reader asks often should be one press away on the next visit.
- **What changed:** each sent question has a small bookmark button beside its bubble (`.sp-chat__save`, `aria-pressed`); the bookmark fills green once saved, and pressing it again removes the question. Saved questions are kept on the server for the account, at most 8, newest last. At 8 the bookmark is disabled, with the tooltip "8 saved. Remove one to save another." The same wording cannot be saved twice. Saved questions sit in a row above the field whenever any exist (`.sp-chat__saved`), as small outline buttons, followed by Edit. Choosing one sends it. Once anything is saved, the empty page shows no examples. Edit turns them into removable static chips and Edit into Done; a removal applies at once. There is no reorder and no rename. On a phone the row is one line that scrolls sideways.
- **Where:** `Ask Spendly.dc.html` 24a and 24b states 6 and 7; `Mobile screens.dc.html` 7a; `Components.dc.html` c34. App: the new page, and a small saved-questions store on the server (list, add, remove, at most 8 per account).
- **What is still open:** nothing.

## 5. The daily limit, and a failed answer

- **The problem:** the chat must say when the day's questions run out, and handle a failed answer.
- **What changed:** with 3 or fewer questions left, the hint line under the field states the count ("2 questions left today") in `sp-meta--over`. At none, the amber alert closes the thread: "No questions left today" / "You can ask again tomorrow from 00:00. This conversation stays until you leave." The field is disabled; the conversation can still be read, emailed and cleared. The time comes from the server's reset time. A failed answer stays in its place in `--red-ink` ("Spendly could not answer that just now.") with Try again, which sends the same question again. It does not count against the limit.
- **Where:** `Ask Spendly.dc.html` 24b states 3, 4, 5.
- **What is still open:** nothing.

## 6. Clear, and Email this chat

- **The problem:** asked in review: Clear, and a way to mail the chat with a proper template, which cannot be pressed again and again.
- **What changed:** both act at once, with no dialog. **Clear** empties the conversation, shows the toast "Conversation cleared" with Undo, and returns the page to its empty state. It is disabled while nothing has been asked and while an answer is coming. **Email this chat** sends the whole conversation to the account's own address only, and the toast names it: "Sent to mikkel@example.net". It is disabled while nothing has been answered, while an answer is coming, and when the last answer failed. While sending it reads "Sending" with the spinner and is disabled. Once sent it reads **Emailed** and stays disabled until the conversation changes: a new answer, Clear or Undo. The server takes at most one conversation email per account per minute; a refused send shows the problem toast "Wait a minute before emailing this chat again." On a phone both sit in the top bar's menu.
- **Where:** `Ask Spendly.dc.html` 24c. The email: `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, documented in `emails/README.md` ("Ask Spendly conversation") and drawn in `Auth and first run.dc.html` 20f item 11. It is built on the status email's template: the same header, card, dark mode and Outlook handling. The questions are at the right on the green tint with the reader's initials, the answers at the left on white with the S mark, tables as tables, amounts in bold and never broken, and links back into the app. The subject is "Your Ask Spendly conversation, 21 Oct 2026". App: the new page, and a server endpoint that renders and sends it with the throttle.
- **What is still open:** nothing.

## 7. On a phone

- **What changed:** a page opened from More: the touch top bar with Back, "Ask Spendly" and a menu (Email this chat, Clear); the conversation; and the dock pinned above the tab bar (`.sp-chat__dock--bar`), holding the saved questions, the field and Send (Stop while an answer comes). The frame is drawn inside `.sp-touch`, so every control shows at 48px.
- **Where:** `Mobile screens.dc.html` 7a, "ASK SPENDLY".
- **What is still open:** nothing.

## 8. Removed: the ask state in the command palette

- **The problem:** the earlier packages (`design_handoff_assistant_chat`, `_fixed`) drew the chat as a state of the palette. Review replaced that with the page.
- **What changed:** removed from the design: the palette's Ask row and Ask action, `.sp-palette--ask` and its parts (`__thread`, `__question`, `__reply`, `__figures`, `__working`, `__failed`, the phone foot rules), the 9d and 7b ask specimens, and the c24 ask note. The palette is as it was before, apart from the Go to entry in section 1.
- **Where:** `Navigation shell.dc.html` 9d, `Mobile screens.dc.html` 7b, `Components.dc.html` c24, `styles/components.css`. App: `react/src/components/Shell.jsx` `PaletteAsk`, if it was started, goes.
- **What is still open:** nothing.

## 9. Facet groups fold, now in the design

- **The problem:** the app's order list draws a chevron on every facet group and folds them. The design drew every group open with no chevron, and its stylesheet had no rule for it: the app carries one in `react/src/styles/app.css` ("a facet group collapses from its heading"). The Vendor count also sat beside the label instead of at the right edge, because a legend shrinks to its text.
- **What changed:** the design now draws what production does, with production's values. The head is one button (`.sp-field-group__fold`, `aria-expanded`) holding the label, the count or range at the right, and `.sp-card__chevron`, which points down while open and turns right when folded. A folded group shows its head only, count included, and nothing more. A range facet has the same head in `div.sp-field-group__head`. A long list of values scrolls inside the group at 240px (`.sp-field-group__values`). Folded groups are remembered for the next visit on the device, by group name. `.sp-field-group__head` takes the full width. The switches under the groups do not fold.
- **Where:** `Order list.dc.html` 2b (Status and Kind drawn folded, and a note), `Components.dc.html` c12 (a folded group, and a States note), `Responsive reference.dc.html` (the same head markup). `styles/components.css`: `.sp-field-group__head` width, `.sp-field-group__fold`, `.sp-field-group__fold[aria-expanded="false"] .sp-card__chevron`, `.sp-field-group__values`, copied unchanged from `react/src/styles/app.css`. App: delete those rules, and `.sp-field-group__head { width: 100%; }`, from `react/src/styles/app.css`, now that the design's stylesheet has them. `react/src/components/Choice.jsx` `FieldGroup` is unchanged.
- **What is still open:** nothing.

## Not settled in this pass

- **later.md, "A deleted record should not be removed for good at once":** left for a later task, as asked. Nothing here settles it, and the entry stays in later.md.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - new page: 24a the page, 24b its states, 24c Clear and Email this chat.
- `Navigation shell.dc.html` - the sidebar row on every sidebar; 9d without the ask state, with the G then A shortcut and a note.
- `Mobile screens.dc.html` - 7a the More row and the Ask Spendly phone; 7b without the ask phone.
- `Components.dc.html` - c34 Chat, new; c24 without the ask variant; c12 folding facets.
- `Icon legend.dc.html` - `message-circle` registered.
- `Auth and first run.dc.html` - 20f item 11, the conversation email.
- `Home.dc.html`, `Bookmarks.dc.html`, `Dark mode and image viewer.dc.html`, `Settings and import.dc.html` - the sidebar row.
- `Order list.dc.html` - 2b facet groups folding, and the note.
- `Responsive reference.dc.html` - the facet head markup.
- `index.html` - the Ask Spendly card, and the page count.
- `checks.html` - Ask Spendly added to PAGES.
- `styles/components.css` - the Chat component, `.sp-shell__body--fill`, the facet fold; the palette ask rules removed.
- `styles/check.js` - the sidebar foot assertion now reads: the divider, then Ask Spendly, then Settings.
- `styles/tokens.css`, `styles/doc.css` - loaded by every page, unchanged.
- `styles/pages/ask-spendly.css` - new, Ask Spendly's frames.
- `styles/pages/navigation-shell.css`, `budget.css`, `mobile-screens.css`, `icon-legend.css`, `auth-and-first-run.css`, `home.css`, `dark-mode.css`, `settings.css`, `order-list.css`, `responsive-reference.css` - loaded by the pages above, unchanged.
- `icons.js` - `message-circle` added. `support.js`, `components.js` - needed to open the pages.
- `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json` - new, the conversation email. `emails/README.md` - its section added. The other files in `emails/` are unchanged and are here because 20f loads them.

Every other page changed only in the version number on its stylesheet links, so a browser loads the new stylesheet; those pages are not in this package.

## styles/check.js

0 finding(s) across 27 pages.

# Brief: chats are kept and can be opened again, and one menu beside Send

Answers the ask that a chat be stored and reopened later, as Ask's files already are, and the follow-up that the buttons beside Send were too many. Settles the four design entries in the repo's `later.md`.

## 1. Every chat is kept, for 30 days after its last message

**The problem** - A conversation was kept only for the visit: a reload or signing out ended it, and nothing of it was stored. Files it made were kept for 30 days, but the chat that made them was gone.

**What changed** - Every chat is kept on the server for the account, automatically, for 30 days after its last message. A chat is created with its first question and has its own address, `/ask/:chatId`, so Back, a reload and the emailed chat's button open it again. A reopened chat can be continued: a follow-up is sent with the whole chat before it, and asking starts its 30 days again. `/ask` shows the chat open last in this visit; a new visit, and New chat, open the empty page. Only the signed-in owner can open a chat.

**Where** - Ask Spendly 24a (lede and the note "Every chat is kept", replacing "Kept for the visit"), 24b (the alert in state 4 now reads "You can ask again tomorrow from 00:00. This chat stays on Chats.", and notes 1, 4, 5 and "In a conversation"). App: `react/src/pages/Ask*`, `api/src/lib/assistantChat.js`.

**What is still open** - Nothing. A new visit opens the empty page with the saved questions, as drawn; decided 22 Oct 2026.

## 2. Chats: the list of kept chats

**The problem** - There was no place to find an earlier chat.

**What changed** - A Chats page at `/ask/chats`, beside Files, built from the same row and frame as Files. Each row is the `message-circle` mark, the chat's heading as the link that opens it, a second line ("2 questions · 1 file · Kept until 2026-11-21") and Delete. Latest asked first. The controls bar holds Back to Ask, a search over headings and the text of every question and answer, and the count ("5 chats", "1 of 5 chats" while searching).

- **Heading** - written by Spendly once the first answer is in, a few words naming what was asked ("Orders at Bilka in 2026"). It does not count toward the day's questions, does not change later, and cannot be edited. Until it is written, or when the first answer failed, the row shows the first question.
- **Delete** - at once, no dialog. It deletes the chat and every file its answers made. Toast "Chat deleted" or "Chat and its 2 files deleted", with Undo bringing back both. Deleting the chat open in Ask returns Ask to its empty page.
- **Gone** - an address of a deleted or expired chat opens Ask's empty page with the problem toast "That chat is no longer kept."
- **Empty** - "No chats yet" / "Ask Spendly something, and the chat is kept here for 30 days after its last message." No match: "No chats found" / "Try another word, or clear the search."

**Where** - Ask Spendly 24f (new screen, asked for and agreed in chat). Mobile screens 7a, the new ASK - CHATS frame. `styles/components.css`: `a.sp-chat__file-name` and its hover, the heading as a link. `index.html` lists 24f.

**What is still open** - Nothing.

## 3. A file on Files opens the chat that made it

**The problem** - A file on Files had no way back to the chat it came from.

**What changed** - Each file row on Files has Open chat before Download: the outline icon link with `message-circle`, tooltip "Open chat", label "Open the chat of" and the title. A file is never kept longer than its chat, so it is always there. Rows inside an answer do not have it.

**Where** - Ask Spendly 24e (the list and its notes); Mobile screens 7a, ASK - FILES.

**What is still open** - Nothing.

## 4. One menu beside Send

**The problem** - Clear, Email this chat and Files sat beside Send as three icon buttons, and Chats would have made four.

**What changed** - Send is followed by one outline icon button, `dots-vertical`, tooltip "More", label "Conversation menu" (`.sp-chat__more`). It opens the Menu (c9) upward, its right side on the button's right side. Items in order: Chats, Files, Email this chat, a rule, New chat. Clear is gone: New chat opens the empty page with no toast and no undo, since the chat stays on Chats; it is disabled while nothing has been asked and while an answer is coming. Email this chat keeps its rules, shown in the item: "Sending" with the spinner, then "Emailed" with the check, disabled until the chat changes. The phone's top bar menu holds the same four in the same order.

**Where** - Ask Spendly 24c (rewritten: the menu open, nothing asked, sending, sent), and every dock in 24a, 24b and 24d. Mobile screens 7a, the Ask note. `styles/components.css`: `.sp-chat__more` and its button, tooltip and menu rules. `styles/pages/ask-spendly.css`: `.as-bar--menu`, room for the open menu in 24c.

**What is still open** - Nothing.

## 5. The emailed chat opens this chat

**The problem** - The email's last button, Ask something else, opened Ask's empty page, not the chat that was emailed.

**What changed** - The button reads **Open this chat** and opens `/ask/:chatId` (`chat_url`). Signed out, it opens sign-in first. A chat that was deleted or is past its 30 days opens the empty page with the toast "That chat is no longer kept." `ask_url` is replaced by `chat_url`.

**Where** - `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, `emails/README.md`; Auth and first run 20f, the note "Open this chat". App: `api/src/lib/assistantChat.js`, `emailConversation`.

**What is still open** - Nothing.

## 6. later.md: the bars in an answer measure their height above the ticks

**The problem** - In an answer's chart a bar's height was a share of its whole column, the tick under it included, so bars above about four fifths were cut to one height.

**What changed** - In an answer's chart the tick sits in the column's padding, so a bar's height is a share of the space above the ticks.

**Where** - `styles/components.css`: `.sp-chat__chart .sp-bars__col` (padding-bottom) and `.sp-chat__chart .sp-bars__tick` (placed in it). Ask Spendly 24d. Settles the later.md entry "For Claude Design: the bars in an answer measure their height above the ticks"; the override in `react/src/styles/app.css` goes with it.

**What is still open** - Nothing.

## 7. later.md: Ask's empty page scrolls in its own box

**The problem** - On a phone with the confirm banner, the empty page did not shrink and pushed the field under the tab bar.

**What changed** - `.sp-chat__start` gets `min-height: 0; overflow-y: auto; justify-content: safe center`.

**Where** - `styles/components.css`, `.sp-chat__start`. Ask Spendly 24b 1, 6 and 7. Settles the later.md entry "For Claude Design: Ask's empty page scrolls in its own box"; the override in `react/src/styles/app.css` goes with it.

**What is still open** - Nothing.

## 8. later.md: a downloaded file is named after its heading

**The problem** - Ask 24d said a downloaded file is named after the question.

**What changed** - The note names the heading at the top of the file, then the time it was made: "Orders at Bilka in 2026 (2026-10-22 14.05.33).xlsx". The row keeps the question as its title.

**Where** - Ask Spendly 24d, the note on a file row; `emails/README.md`, files. Settles the later.md entry "For Claude Design: a downloaded file is named after its heading, not the question".

**What is still open** - Nothing.

## 9. later.md: the emailed conversation attaches its files

**The problem** - The files are attached to the email, up to 15 MB in all, but the email still said "Download them from Files in Ask until ...".

**What changed** - Each file's line ends "Attached". One that would take the email past 15 MB is not attached, and its line reads "Too big to attach. Download it from Files in Ask until 2026-11-21.", linked to Files. The line under the frame, and the `ready` and `many` fields, are gone; each item has `attached`. The sample shows both.

**Where** - `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, `emails/README.md`; Auth and first run 20f, the note on a file. Settles the later.md entry "For Claude Design: the emailed conversation attaches its files".

**What is still open** - Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a to 24e changed, 24f new.
- `Mobile screens.dc.html` - 7a: the Ask note, Open chat on Files, the new Chats frame.
- `Auth and first run.dc.html` - 20f: the email's notes, and the drawn email.
- `index.html` - lists 24f, 105 screens.
- `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/ask-chat-sample.json`, `emails/README.md`, `emails/ask-chart-sample.png` - the email and what 20f draws it from.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the shared styles; `components.css` changed.
- `styles/pages/ask-spendly.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css`, `styles/pages/auth-and-first-run.css` - the page styles the pages link; `ask-spendly.css` changed.

## styles/check.js

0 findings across 27 pages.

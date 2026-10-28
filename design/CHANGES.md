# Delete account, and earlier release notes in a dialog

Brief: Settings has no way to delete the account; and on This build, "Show N earlier versions" should open a scrollable popup instead of growing the card.

## 1. Delete account

**The problem.** There is no way to delete an account, in the design or in the app. `api/src/routes` on main has no route that removes a user, and Settings has no control for it.

**What changed.**
- A Delete account card is the last card in Account and profile, after Two-step sign-in. It has one line, "Your orders, receipts, vendors, categories, budget, bookmarks and chats are removed for good. This can't be undone.", and Delete account in the footer as the outline danger button.
- It opens one dialog, "Delete your account?". The dialog asks for the password and, when two-step sign-in is on, a code from the app or a recovery code, in the field Turn off uses. A wrong password says "That password isn't right."; a wrong pair says "That password and code do not match. Check both and try again." Too many tries shows the warning row and disables the fields and Delete account, counting down, as in 11f.
- The account goes at once and for good: the account and everything it owns (orders, receipts and photos, vendors, categories, statuses, budget, bookmarks, saved views, Ask chats and files, passkeys, two-step keys and recovery codes, AI assistant tokens). Every session on every device ends. Nothing is kept to restore.
- The dialog offers a copy of the data first, optional, above the password: "A copy of your data", "Orders, receipts and lists, in one .zip file.", and Download. The file is `spendly-export-YYYY-MM-DD.zip`, holding `orders.json` in the JSON export shape Import reads (11b) plus every receipt and photo as its own file. While it is made the button reads "Preparing..." with the spinner and is disabled; the password and Delete account stay usable. On failure, the danger toast "The copy could not be made. Try again."
- After it is deleted: the account-deleted email goes to the account's address, the app opens sign-in, and the toast says "Your account was deleted." The address can be used for a new account at once.
- The account-deleted email: subject "Your Spendly account was deleted", heading "Your account was deleted", the line naming the address and the time, "If this was not you, ask the person who runs this Spendly server.", and the footer "This is the last email this account gets from Spendly." No button and no link.

**Where.**
- `Settings and import 11a` (the card, and a note), `Settings and import 11g` (new: the card and dialog states D1 to D6).
- `Auth and first run 20f`, email 15; `emails/account-deleted.html` and `.txt`; `emails/README.md`.
- App: `react/src/pages/Settings.jsx` (Account and profile pane), a new dialog beside `react/src/pages/SettingsTwoStep.jsx`, `react/src/api/client.js`. Server: a route that deletes the signed-in user and everything that cascades from it, a route that builds the export .zip, and the email in `api/src/emails/`.
- No new component: the card, Dialog (c13), password field, warning row and danger button are the existing ones.

**What is still open.**
- The phone is described in the 11g notes (the same card at the end of the Settings account page; the dialog at the phone's inset with 48px buttons) and not drawn in Mobile screens 7a.

## 2. Earlier release notes open in a dialog

**The problem.** On This build, "Show N earlier versions" listed up to 19 more versions inside the card, so the card, and the Settings pane with it, grew by the whole history.

**What changed.**
- The card keeps its three versions and the button. Pressed, it opens a dialog, "What changed", listing every listed version, the running one first, newest first, in the card's markup (`.sp-toast__changes`). The list scrolls inside the dialog; the heading and Close stay in view. Close, Escape and the scrim close it, and focus returns to the button.
- The dialog is at most the window's height less the scrim's padding (`100dvh - 2 x --sp-16`), and as tall as its list in a tall window.
- The cap of 20 versions and the count in the button are unchanged.

**Where.**
- `Settings and import 11d`, state 6 (was "All versions shown", now "Earlier versions, open"), and its notes.
- `styles/components.css`: new `.sp-dialog__scroll` (the scrolling region) and `.sp-dialog:has(> .sp-dialog__scroll)` (the height cap), beside the Dialog rules; `.sp-dialog__scroll` joins the shared thin scrollbar rules. No existing rule changed.
- `styles/pages/settings.css`: `.st-window`, a 360px stand-in for a short window, for the drawing only.
- App: `react/src/pages/SettingsBuild.jsx`. The button opens the dialog in place of `setAllShown(true)`; the in-card expanded state goes.
- `react/src/components/` Dialog: a scrolling region for its body, using `.sp-dialog__scroll`.

**What is still open.**
- What Ask can do (Ask 24c) scrolls with its own `.sp-chat__help`. It is left as it is; it can take `.sp-dialog__scroll` later if that is wanted.

## later.md

Read on main before both tasks. Two entries, Recently deleted and the go-to keys for Budget, Bookmarks and Home. Neither is a design fix for these tasks; both stay. Recently deleted covers records, not the account, so account delete does not touch it.

## Files

- `CHANGES.md` - this note.
- `README.md` - the design's overview, unchanged from the project root.
- `Settings and import.dc.html` - 11a, 11d and 11g.
- `Auth and first run.dc.html` - 20f, email 15.
- `index.html` - lists 11g and counts 108 screens.
- `emails/account-deleted.html`, `emails/account-deleted.txt` - the new email.
- `emails/README.md` - the new email in the list and merge fields.
- `emails/*` (the rest) - loaded by 20f to draw the other emails; unchanged.
- `styles/components.css` - `.sp-dialog__scroll`.
- `styles/pages/settings.css` - `.st-window`.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/auth-and-first-run.css` - linked by the pages; unchanged.
- `support.js`, `components.js`, `icons.js` - needed to open the pages from this folder.
- `assets/two-step-qr.svg` - loaded by 11f on the Settings page.

## styles/check.js

0 finding(s) across 27 pages.

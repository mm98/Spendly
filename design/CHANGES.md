# Two-step sign-in (codes from an authenticator app)

## Fixed from handoff_two_step_sign_in

- **Auth and first run 20g, 7 (signing in again over the page):** the drawing's frame was too short for the dialog with the code field, so the dialog's title and its Back, Later and Sign in buttons were cut off. The frame now uses `.au-frame--tall` (min-height 160px) in `styles/pages/auth-and-first-run.css`; `.au-frame` itself and 20e are unchanged. This is a fault in the drawing only; nothing changes in the app.

Answers `Brief-two-step-sign-in.md`. Light and dark come from each page's theme switch (View, theme); every screen is drawn for a computer and, where it differs, for a phone.

## 1. Settings: the two-step sign-in card

- **The problem:** nothing for two-step sign-in was drawn. The brief asked whether the card sits beside Passkeys or under a shared "Signing in" heading.
- **What changed:** two-step sign-in has its own card right under Passkeys in Account and profile, built like the Passkeys card: the same head, line and 42px fact row (`.st-pk-row`). There is no new heading. The line reads "After your password, Spendly also asks for a code from an app on your phone."
  - Off: the line and Turn on (lock icon) in the head, where Add a passkey sits.
  - On: "On since 14 Oct 2026" over "7 of 10 recovery codes left". New recovery codes and Turn off sit in the card's footer, so they keep to one line on a phone.
  - 3 or fewer left: the count line takes the warning ink and adds "Make new ones before they run out."; at 0 it reads "Make new ones now." Warning, not danger.
  - The server cannot offer it: the line stays, Turn on is absent, and "Two-step sign-in is not available on this server." takes its place.
  - On a phone the card is a page of its own, opened from a new "Two-step sign-in" row under Passkeys in the Settings list. The row reads On, Off or Not available.
- **Where:** `Settings and import.dc.html` 11a (the card, drawn On) and 11f (every state). `Mobile screens.dc.html` 7a (the Settings row and the Two-step sign-in page). App: `react/src/pages/Settings.jsx` (Account and profile cards, phone index row), a new card beside `react/src/pages/SettingsPasskeys.jsx`.
- **What is still open:** nothing.

## 2. Turning it on

- **The problem:** the brief asked whether this is a dialog, a page of its own on a phone, or steps inside the card.
- **What changed:** one dialog in three steps, shaped like the Add a passkey dialog, and the same dialog on a phone. The heading "Turn on two-step sign-in" has "1 of 3" on its line. Cancel, Escape and the scrim close it at steps 1 to 3, and nothing is turned on until step 3 is right.
  - T1 Password: "Enter your password first." Wrong password and the lock-out are the Add a passkey errors: the field message, or the warning row "Too many attempts / Try again in 4 minutes." with the field and Continue disabled.
  - T2 Scan: "Scan this with your authenticator app. Google Authenticator, Microsoft Authenticator and 1Password all work, and 1Password can read it straight from this screen." Then the QR code, 168px, dark on white in both themes, drawn from `otpauth://totp/Spendly:<email>?secret=<key>&issuer=Spendly`. It is a real image on the page (`<img>` or inline `<svg>`), never behind a click or a blur, so 1Password on a computer can scan it off the screen. Under it: "Can't scan it? Type this key into the app instead." and the key in groups of 4 in the snippet well (`.sp-well--snippet`), with a Copy button that copies it without spaces. The order is the same on a phone.
  - T3 Confirm: "Type the 6-digit code the app now shows." One Code field (`inputmode="numeric"`, `autocomplete="one-time-code"`). Actions: Back, Cancel, Turn on. Empty submit: "Enter the code." Wrong code: "That code is not right. Check the time on your phone, and try the newest code." Too many tries: the warning row "Too many tries / Wait 4 minutes, then type the newest code.", field and Turn on disabled.
  - T4 Recovery codes, shown once: heading "Two-step sign-in is on". A warning well: "Save these codes now. They won't be shown again." / "Each code works once, in place of a code from the app." 10 codes (`K7QM-3XRA`) in two columns in a well, then Copy all and Download (`spendly-recovery-codes.txt`). Only "I have saved them" closes this step; Escape and the scrim do not. After it the toast reads "Two-step sign-in is on."
- **Where:** `Settings and import.dc.html` 11f, T1 to T4, with T2 and T4 also on a phone. `styles/pages/settings.css`: `.st-qr` (the QR's size and border) and `.st-codes` (the two-column grid). The QR sample is `assets/two-step-qr.svg`, which scans to the sample key.
- **What is still open:** nothing.

## 3. New recovery codes

- **The problem:** no drawing.
- **What changed:** "New recovery codes" from the card opens a dialog: "Type a code from your authenticator app, or one of your recovery codes." One field, labelled "Code from the app or a recovery code", takes either: 6 digits, or 8 letters and digits with or without the hyphen. Then "Your new recovery codes", the T4 screen with the line "Your old recovery codes no longer work." The count goes back to 10 of 10.
- **Where:** `Settings and import.dc.html` 11f, N1 and N2.
- **What is still open:** nothing.

## 4. Turning it off

- **The problem:** no drawing.
- **What changed:** "Turn off two-step sign-in?" with "The app's key and your recovery codes are removed, and signing in asks only for your password." Fields: Password, and "Code from the app or a recovery code". Actions: Cancel, then Turn off in the danger style. A wrong pair is answered vaguely, as sign-in does: "That password and code do not match. Check both and try again." After it the toast reads "Two-step sign-in is off." and the turned-off email is sent.
- **Where:** `Settings and import.dc.html` 11f, O1.
- **What is still open:** nothing.

## 5. The code step at sign-in

- **The problem:** the brief asked for one field or 6 boxes, and whether the step looks the same when signing in again over the page.
- **What changed:** one field. After a right email and password the same auth card goes on to "Two-step sign-in" / "Type the 6-digit code from your authenticator app." Code field (`type="text"`, `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="[0-9]*"`), Sign in, then the links "Use a recovery code instead" and "Back", then "Lost your phone and your recovery codes? Ask the person who runs this Spendly server."
  - Recovery code: the field becomes "Recovery code", the line "Type one of your recovery codes.", and the link "Use a code from the app instead" switches back.
  - Wrong code: the brief's line under the field. Wrong recovery code: "That recovery code is not right, or it was used already."
  - Too many tries: the amber row "Too many tries / Sign in is paused for 4 minutes. Then sign in again from the start.", field disabled, primary "Back to sign in".
  - Timed out after 5 minutes: the amber row with the clock, "This step timed out / The code has to be typed within 5 minutes of the password. Sign in again from the start.", primary "Start again". The email is kept.
  - Signing in: the button disabled with the spinner, "Signing in…".
  - Back returns to the email and password with the email kept.
  - A passkey sign-in does not ask for a code.
- **Signing in again over the page:** the same step, inside the 20e level 3 dialog. The title stays "You've been signed out", the line becomes the code step's, and the code field takes the password's place, with "Use a recovery code instead" under it. Actions: Back, Later, Sign in. The states are the same and show as the dialog's alert row. The lost-phone line is left out of the dialog.
- **Where:** `Auth and first run.dc.html` 20g (new section, 1 to 7, with a phone specimen), and a note in 20a. App: `react/src/pages/SignIn.jsx`, `react/src/pages/AuthParts.jsx`, `react/src/app/SessionDialog.jsx`.
- **What is still open:** nothing.

## 6. Three emails

- **The problem:** no emails for two-step sign-in.
- **What changed:** three emails built from the passkey-added template (mark, heading, line, button to `/settings/account`, the link written out, footer):
  - `two-step-on`: "Two-step sign-in is on". Footer: "We write to you whenever two-step sign-in is turned on or off."
  - `two-step-off`: "Two-step sign-in is off". The same email whether the person or the server's owner turned it off.
  - `recovery-code-used`: "A recovery code was used", with "{{codes_left}} of 10 recovery codes are left." Button: Make new codes. Sent when a recovery code signs in, not when one confirms New recovery codes or Turn off.
  - All three carry "If this was not you, reset your password and ask the person who runs this Spendly server."
  - New merge field: `{{codes_left}}`.
- **Where:** `emails/two-step-on.*`, `emails/two-step-off.*`, `emails/recovery-code-used.*`, `emails/README.md`. Specimens in `Auth and first run.dc.html` 20f, 12 to 14.
- **What is still open:** nothing.

## later.md

- **A deleted record should not be removed for good at once:** its "Recently deleted" place is still not drawn, and its open questions are unanswered. Kept for a later task, at the user's choice in this pass. Not settled; leave the entry in place.
- The other two entries are not design work.

## Files

- `README.md`: the design's overview, unchanged from the project root.
- `CHANGES.md`: this note.
- `Settings and import.dc.html`: 11a card, 11f every state and dialog.
- `Mobile screens.dc.html`: 7a Settings row and the Two-step sign-in page.
- `Auth and first run.dc.html`: 20g code step, 20a note, 20f specimens 12 to 14.
- `emails/`: the three new emails (.html and .txt) and `README.md`, plus every email the 20f specimens load, so the page opens from this folder.
- `assets/two-step-qr.svg`: the sample QR code drawn in 11f; `assets/shop-logo.svg`: loaded by Mobile screens.
- `support.js`, `components.js`, `icons.js`: loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`: unchanged, loaded by the pages.
- `styles/pages/settings.css`: `.st-qr` and `.st-codes` added. `styles/pages/auth-and-first-run.css`: `.au-frame--tall` added for the 20g drawing. `styles/pages/mobile-screens.css`, `styles/pages/budget.css`: unchanged, loaded by the pages.

## styles/check.js

0 findings across 27 pages.

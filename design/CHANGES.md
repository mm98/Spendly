# Two-step sign-in: the later.md questions for Claude Design

The brief: settle the later.md entry "Two-step sign-in: questions for Claude Design", which asks three things: whether Copy all is drawn beside Download, whether the code field gets an even-width digits variant, and what the wait after too many wrong codes looks like in New recovery codes and Turn off. Remove the entry from later.md in the change that builds this.

## 1. Copy all beside Download

- **The problem:** the recovery codes could only be downloaded in the app. The design notes named Copy all, but the app was built from a drawing that showed only Download.
- **What changed:** nothing in the design; Copy all is already drawn beside Download, an outline small button with the copy icon, then Download. It sits under the codes in step 4 of Turn on and in New recovery codes. Copy all copies the 10 codes one per line; Download saves `spendly-recovery-codes.txt` as before.
- **Where:** Settings and import 11f (step 4, New recovery codes). App: react/src/pages/SettingsTwoStep.jsx.
- **What is still open:** nothing.

## 2. Even-width digits in the code field

- **The problem:** the 6-digit code field shows its digits in the normal text style, so the code shifts sideways as it is typed. The field could not take a style of its own.
- **What changed:** a new variant of the field, `.sp-input--code` (`font-variant-numeric: tabular-nums`), so every digit is the same width. Nothing else about the field changes: same height, padding, border and type size. It is on every field that takes a sign-in code or a recovery code.
- **Where:** styles/components.css (`.sp-input--code`, beside `.sp-input--readonly`); Settings and import 11f (Turn on step 3, New recovery codes, Turn off); Auth and first run 20g (the code step and the recovery code at sign-in). App: the Input component needs a way to take the variant (a `variant="code"` or equivalent), then react/src/pages/SettingsTwoStep.jsx, react/src/pages/SignIn.jsx and react/src/app/SessionDialog.jsx use it.
- **What is still open:** nothing.

## 3. The wait after too many wrong codes, in New recovery codes and Turn off

- **The problem:** the wait was drawn only for Turn on and for the code step at sign-in; the app built New recovery codes and Turn off with the warning row from the code step without a drawing.
- **What changed:** that is the design: too many wrong codes in New recovery codes, and in Turn off, shows the code step's warning row ("Too many tries", "Wait 4 minutes, then type the newest code.") above the field, with the field and the dialog's main button disabled, counting down, as Turn on's T3 does. No new state is drawn, since it is the same row.
- **Where:** Settings and import 11f (implementation note on New recovery codes; T3 - TOO MANY TRIES is the drawn state). App: react/src/pages/SettingsTwoStep.jsx.
- **What is still open:** nothing.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Settings and import.dc.html: 11f with the code field variant and the note on the wait.
- Auth and first run.dc.html: 20g with the code field variant.
- support.js, components.js, icons.js: what the pages load to open.
- styles/tokens.css, styles/components.css, styles/doc.css: shared styles; components.css has `.sp-input--code`. It also carries the xsmall radius change already in the app.
- styles/pages/settings.css, styles/pages/auth-and-first-run.css: the two pages' own styles.
- assets/two-step-qr.svg: the QR code in 11f.

## styles/check.js

0 finding(s) across 27 pages

# Fixed in this package

- 20a: Forgot it? was the small button (34px) beside the 12px Password label, so the password field sat lower than the email field. It is now the xsmall outline button, the size a label-line action takes (as Views - Save in the Components page).
- check.js: a button on a field label's line that is not xsmall is a finding.

Auth and first run now draws every part from components.css:
- Password fields (20a): the one-time-code style (15px, wide spacing) is gone; they are plain sp-input. .au-code is removed.
- Text actions are links or buttons. Inline in a sentence they are links (Create an account, Sign in, terms, privacy notice, Sign in instead?, Change it). Standing alone they are outline buttons: Back to sign in (small, block), Skip (beside Next, same size), Enter one by hand (was "Or enter one by hand"), Add another (small). The unconfirmed banner's Resend is the xsmall outline warning button and its close is an sp-icon-btn labelled Dismiss.
- Stay signed in is the checkbox component: label.sp-choice with input.sp-check.
- First run: Currency and Number format take sp-field__label, labelling the combobox by aria-labelledby, as in Settings.
- The strength meter and the step indicator are the thin sp-gauge: Strong 75, Very strong 100, Step 1 of 2 at 50, Step 2 of 2 at 100. .au-strength, .au-fill and .au-seg are removed.
- check.js: a drawn checkbox, and green bold text standing in for an action, are findings.

Answers to Claude Code's three questions:
- **Email cannot be changed in the app.** Settings keeps it read-only. Removed: "Wrong address? Change it" from the three 20b cards, "changing your email" from Still available, the 20b note on changing the email, and the email-changed email (20f, emails/email-changed.*). 20b's banner notes no longer give "fix the address in Settings" as the reason the banner is not a modal.
- **No email for limit alerts.** The Also by email switch is gone from 8b; the notes in 8b, Settings (11a) and Mobile screens now say alerts arrive in the app only.
- **Forgot it? on a phone.** Below 640px it leaves the Password label's line and is a full-width outline button under the field, so the label sits as close to its field as Email's does. 20a gains a "Sign in, on a phone" specimen showing it.

Copy these files over handoff_2026_10_08t_changes_fixed (this replaces handoff_2026_10_09_changes), and delete emails/email-changed.html and .txt if an earlier copy left them.

---

# Spendly - the auth emails

**New: 20f, The emails** in Auth and first run. Two send-ready transactional emails, each an HTML file with a plain-text version:
- **confirm-email** - the 20b link. Subject "Confirm your email for Spendly". 24 hours, single use.
- **reset-password** - the 20c link. Subject "Reset your Spendly password". 1 hour, single use. Nothing is sent to an address with no account.

Sender, merge fields and the client notes are in emails/README.md. The card keeps the auth panel's values (400 wide, 16 padding, 64 mark, small button); no style value changed.

## Checks
- check.js: 0 findings across 26 pages.

## Files
- Auth and first run.dc.html
- styles/pages/auth-and-first-run.css
- index.html (20f listed, 98 screens)
- Duplicate and alerts.dc.html, Settings and import.dc.html, Mobile screens.dc.html
- emails/ (5 files)
- styles/check.js

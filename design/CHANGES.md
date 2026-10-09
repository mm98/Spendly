# Spendly - the auth emails

Copy these files over handoff_2026_10_08t_changes_fixed.

**New: 20f, The emails** in Auth and first run. Three send-ready transactional emails, each an HTML file with a plain-text version:
- **confirm-email** - the 20b link. Subject "Confirm your email for Spendly". 24 hours, single use.
- **reset-password** - the 20c link. Subject "Reset your Spendly password". 1 hour, single use. Nothing is sent to an address with no account.
- **email-changed** - to the old address when a new email is saved. Subject "The email on your Spendly account is changing". Its button opens /reset with the address filled in. Resetting the password cancels a pending email change.

Sender, merge fields and the client notes are in emails/README.md. The card keeps the auth panel's values (400 wide, 16 padding, 64 mark, small button); no style value changed.

## Checks
- check.js: 0 findings across 26 pages.

## Files
- Auth and first run.dc.html
- styles/pages/auth-and-first-run.css
- index.html (20f listed, 98 screens)
- emails/ (7 files)

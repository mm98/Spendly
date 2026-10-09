# Spendly - password changed email, and passkeys

Copy these files over handoff_2026_10_09_changes_fixed.

## Password changed email (20f)
- emails/password-changed.html and .txt. Subject "Your Spendly password was changed".
- Sent whenever a password is saved: Change password in Settings, or Save and sign in on 20c.
- Its button opens /reset with the address filled in, so it never expires. Merge field {{changed_at}}.

## Passkeys - beside the password, never instead of it
- **Sign in (20a, desktop and phone):** the email field carries autocomplete="username webauthn", so the browser offers a saved passkey from it. Under Sign in, an "or" divider (sp-divider) and an outline "Sign in with a passkey" button for browsers that do not offer it in the field. A cancelled prompt says nothing; an unknown passkey gets the vague sign-in error; lockout pauses passwords only.
- **Email confirmed (20b):** offers Add a passkey or Not now, both then going to first run. A device without passkey support shows one Continue button.
- **Settings, Account:** a Passkeys card under Account and profile. Head: Add a passkey. Each row: the name the device reported, added and last used, Rename and Remove. Remove asks first; the password always keeps working. On the phone (Mobile screens, Settings) a Passkeys row with its count.
- **Passkey added email (20f):** emails/passkey-added.html and .txt. Subject "A passkey was added to your Spendly account". Button opens /settings/account. Merge fields {{passkey_name}}, {{changed_at}}. Removing a passkey sends nothing; resetting the password leaves passkeys alone.
- **Icon:** key, from Tabler, added to icons.js and registered in Icon legend 19a.

## Also
- 20f's previews now size to their content, without console errors.

## Checks
- check.js: 0 findings across 26 pages.

## Files
- Auth and first run.dc.html
- Settings and import.dc.html
- Mobile screens.dc.html
- Icon legend.dc.html
- index.html
- icons.js
- styles/check.js
- styles/pages/auth-and-first-run.css
- emails/README.md
- emails/confirm-email.html
- emails/confirm-email.txt
- emails/passkey-added.html
- emails/passkey-added.txt
- emails/password-changed.html
- emails/password-changed.txt
- emails/reset-password.html
- emails/reset-password.txt

# Auth emails

Two transactional emails, drawn in Auth and first run (20f). Send each as multipart/alternative: the .html file and the .txt file beside it.

From: Spendly <offtopic74@gmail.com>

| File | Subject | Sent when |
|---|---|---|
| confirm-email | Confirm your email for Spendly | An account is created, or Send it again on 20b |
| reset-password | Reset your Spendly password | Send the link on 20c, whether or not the address has an account (nothing is sent when it has none) |

## Merge fields

- {{name}} - the account's name (confirm-email only)
- {{email}} - the account's address
- {{action_url}} - confirm-email: /confirm/:token (24 hours, single use). reset-password: /reset/:token (1 hour, single use).

Every value is HTML-escaped before it is merged. The subject line is in the first line of each .txt file.

## Built for mail clients

Tables and inline styles only; no web fonts (Poppins where installed, then Helvetica, Arial); a VML button for Outlook; a prefers-color-scheme block that maps to the dark tokens; the link is also written out as text under the button. Each file is under 10 KB.

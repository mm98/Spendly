# Auth emails

Four transactional emails, drawn in Auth and first run (20f). Send each as multipart/alternative: the .html file and the .txt file beside it.

From: Spendly <offtopic74@gmail.com>

| File | Subject | Sent when |
|---|---|---|
| confirm-email | Confirm your email for Spendly | An account is created, or Send it again on 20b |
| reset-password | Reset your Spendly password | Send the link on 20c, whether or not the address has an account (nothing is sent when it has none) |
| password-changed | Your Spendly password was changed | A password is saved: Change password in Settings, or Save and sign in on 20c |
| passkey-added | A passkey was added to your Spendly account | A passkey is added: Add a passkey on 20b or in Settings |

## Merge fields

- {{name}} - the account's name (confirm-email only)
- {{email}} - the account's address
- {{changed_at}} - password-changed and passkey-added: date and time of the change, in the account's own format, e.g. 9 Oct 2026, 14.26
- {{passkey_name}} - passkey-added only: the name the device reported, e.g. iPhone, 1Password
- {{action_url}} - confirm-email: /confirm/:token (24 hours, single use). reset-password: /reset/:token (1 hour, single use). password-changed: /reset?email={{email}}, the ask step with the address filled in, so it never expires. passkey-added: /settings/account.

Every value is HTML-escaped before it is merged. The subject line is in the first line of each .txt file.

## Built for mail clients

Tables and inline styles only; no web fonts (Poppins where installed, then Helvetica, Arial); a VML button for Outlook; a prefers-color-scheme block that maps to the dark tokens; the link is also written out as text under the button.

Outlook for Windows (the Word engine) does not draw rounded corners on boxes, so in Outlook the card sits inside a VML rounded rectangle that grows to its content (mso-fit-shape-to-text), and an Outlook-only style drops the table's own square border and fill. The button's cell carries no fill: the colour sits on the link for other clients and on the VML shape for Outlook, so no square fill shows behind the rounded shape. The mark and the button are VML rounded rectangles in an Outlook-only block, so they round everywhere. The address in the body sits in a span inside an anchor with no href, both inked and undecorated, so Outlook does not turn it into an underlined mailto link; format-detection asks Apple Mail and iOS not to either. Each file is under 10 KB.

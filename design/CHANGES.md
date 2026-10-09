# Spendly - emails rounded in Outlook

Copy these files over handoff_2026_10_09d_changes. All four templates change the same way.

## Button
- The button's cell no longer carries a fill. In Outlook its square fill showed behind the VML rounded button.
- Other clients: the fill (#1d4d33) and the 9px radius sit on the link itself.

## Card
- Outlook for Windows: the card sits inside a VML rounded rectangle, white fill and a 1px #e6e4dc stroke. It grows to its content (mso-fit-shape-to-text).
- An Outlook-only style in the head drops the table's own square border and fill.
- Other clients are unchanged: the table's 12px border-radius.

## Address
- The address in the body is a span inside an anchor with no href. Both are inked (#1b1a17) and undecorated, so Outlook does not show it as an underlined link.

## Docs
- emails/README.md says so.

## Checks
- 0 finding(s) across 26 pages.
- Not verified in Outlook from here. Send one to Outlook for Windows before shipping.

## Files
- emails/README.md
- emails/confirm-email.html
- emails/confirm-email.txt
- emails/passkey-added.html
- emails/passkey-added.txt
- emails/password-changed.html
- emails/password-changed.txt
- emails/reset-password.html
- emails/reset-password.txt

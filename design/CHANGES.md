# Spendly - emails rounded in Outlook (fixed)

**Fixed:** in handoff_2026_10_09e_changes the card was wrapped in a VML rounded rectangle for Outlook. Outlook cannot nest the mark and button shapes inside it, so the card collapsed to the top-left corner and the S and button label vanished. That wrapper and its Outlook-only style are removed. In Outlook the card is square again, with its border and white fill. Everything else in 09e stands.

Copy these files over handoff_2026_10_09d_changes (or over 09e).

## Button
- The button's cell carries no fill; the fill (#1d4d33) and 9px radius sit on the link, and Outlook draws the VML rounded button. No square fill behind it.

## Card
- Rounded (12px) everywhere except Outlook for Windows, where it is square. That engine draws no rounded box, and a VML wrapper breaks the shapes inside.

## Address
- A span inside an anchor with no href, both inked (#1b1a17) and undecorated.

## Checks
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

# Spendly - long emails and names, and the emails in Outlook

Copy these files over handoff_2026_10_09b_changes.

## Long emails and names - one rule everywhere
- **On one line, an email keeps its domain.** The part before the @ shortens with an ellipsis; the @domain never does. This is now one general component, `.sp-email-line` with `__local` and `__domain`, renamed from the sidebar-only `.sp-nav-item__sub--email` / `__local` / `__domain`. The sidebar looks the same.
  - Pages renamed: Bookmarks, Dark mode and image viewer, Home, Navigation shell, Settings and import.
  - Now also used by the phone's account card (Mobile screens, Navigation shell), which used to cut the domain with plain truncation.
  - Settings, Email (read-only) is now a div.sp-input.sp-input--readonly holding `.sp-email-line`, labelled by aria-labelledby, centred by `.sp-input:has(> .sp-email-line)`. It used to clip the domain.
- **On one line, a name** shortens from the right with `.sp-truncate`, unchanged.
- **Inside a sentence, an email or a name is `.sp-break`** (overflow-wrap: anywhere), so a long one wraps instead of running past its card: 20b and 20c addresses, the unconfirmed banner, "Good morning, Mikkel" on 20d.
- 20b gains "Link sent, a long address" with mikkel.mortensen.receipts@verylongcompany.example.net. Navigation shell 9c's note states the rule.

## Emails (all four)
- The body cell wraps a long address or name (overflow-wrap: anywhere; word-break: break-word).
- Outlook for Windows: the mark and the button are VML rounded rectangles, so they round there and the S is centred; the Word namespace their anchorlock needs is declared. The card stays square there - that engine draws no rounded box.
- The address in the body sits in an anchor with no href, so Outlook does not make it a mailto link; format-detection asks Apple Mail and iOS the same.
- emails/README.md says so.

## Checks
- check.js: an email in .sp-truncate, an email or name in a sentence without .sp-break, and the old nav-only class names are findings.
- 0 finding(s) across 26 pages.

## Files
- styles/components.css
- styles/check.js
- Auth and first run.dc.html
- Settings and import.dc.html
- Navigation shell.dc.html
- Mobile screens.dc.html
- Bookmarks.dc.html
- Dark mode and image viewer.dc.html
- Home.dc.html
- emails/README.md
- emails/confirm-email.html
- emails/confirm-email.txt
- emails/passkey-added.html
- emails/passkey-added.txt
- emails/password-changed.html
- emails/password-changed.txt
- emails/reset-password.html
- emails/reset-password.txt

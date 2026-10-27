# Settings in five groups, one at a time, as a wide form

The brief: the Settings page has grown too big. Thirteen panes sit in one long scroll beside a second menu, and the cards are capped at 640px however wide the window is. This package replaces that with five groups, one shown at a time, each setting one row of a wide form, and settles the four later.md entries that touch Settings.

## 1. Five groups instead of thirteen panes

- **The problem:** thirteen panes in one scroll, with a section menu that follows the scroll position and a sticky save bar so the dirty card can be found again.
- **What changed:** Settings has five groups, each its own page and address:
  - Account (/settings/account): photo, name, email, password.
  - Sign-in and security (/settings/security): passkeys, two-step sign-in, AI assistants.
  - Preferences (/settings/preferences): appearance, money, dates and times, defaults for a new order, lists.
  - Notifications (/settings/notifications): status email, limit alerts, needs a look.
  - Data (/settings/data): statuses, import, this build, recently deleted, demo data.
  - /settings opens Account. Only the open group's cards are on the page, so no group scrolls on a laptop.
- **Where:** Settings structure options 25g (working example), 25a to 25e (one screen per group). App: react/src/pages/Settings.jsx and the pane pages under react/src/pages/Settings*.jsx, react/src/styles/pages/settings.css.
- **What is still open:** nothing.

## 2. Moving between groups: the first card

- **The problem:** a menu beside the cards takes width and was the source of the "menu line under a notice" fault; a dropdown hides which groups exist.
- **What changed:** the first card on every group page has the head SETTINGS and the five groups on the Segmented in its fill variant (.sp-segmented--fill, c5). The open group is the selected one; picking another opens its address. There is no page name above the cards. The section menu (.st-subnav) and its sliding ground are removed from Settings.
- **Where:** Settings structure options 25g, 25a to 25e.
- **What is still open:** nothing.

## 3. A setting is one row of a wide form

- **The problem:** fields stacked in a 640px column, with most of a wide screen empty.
- **What changed:** each setting is one row: its name and help at the left, the control at the right, in a two-column grid (left 1fr, right 1.2fr, gap 16). The columns line up down the whole group. A row holding a list (passkeys, tokens, statuses, recently deleted) starts both columns at the top. Rows in a card are separated by the card's rule. The content column uses the full width beside the 248px sidebar, padded by --card-pad. Below 900px a row stacks, label over control, gap 8.
- **Where:** Settings structure options 25a to 25e; styles/pages/settings.css (.st-wide, .st-form-row, .st-form-row.sp-top, .sp-touch .st-form-row). In the app this is a new component (a settings row), since every group uses it.
- **What is still open:** nothing.

## 4. Saving

- **The problem:** with thirteen panes the save bar had to name which card was dirty.
- **What changed:** the save bar reads "Unsaved changes in Preferences" (the group's name) and sits at the foot of the column, only with unsaved changes. Picking another group, or leaving Settings, with unsaved changes asks first with the confirm dialog. Rows that act at once (passkeys, tokens, status email, Restore, the buttons) do not touch the bar, as today.
- **Where:** Settings structure options 25c (drawn with Row density changed), 25g.
- **What is still open:** nothing.

## 5. Recently deleted, in Data

- **The problem:** later.md "A deleted record should not be removed for good at once" asks where Recently deleted lives, how long a copy is kept, which kinds get it and whether bulk delete keeps copies.
- **What changed:** Recently deleted is a card in Data. Orders, vendors, categories and bookmarks are kept for 30 days, bulk delete included, then removed for good. Each row reads the kind and name ("Order · Zalando"), "Deleted 25 Oct 2026 · removed on 24 Nov", and Restore, which brings back the record and what went with it.
- **Where:** Settings structure options 25e.
  - A restore that conflicts still restores, and the toast says what changed: "Order restored. Its vendor Proshop is gone, so it has no vendor." or "Category restored as Garden (2), since Garden is taken."
- **What is still open:** nothing. Remove this entry from later.md.

## 6. Phone

- **The problem:** five groups do not fit across a phone.
- **What changed:** on a phone Settings (from More, as today) is a SETTINGS card listing the five groups as rows, each with what is set ("Dark, Danish krone, 10 rows"). A row opens its group; the first card's head carries the group's name before its own (PREFERENCES · APPEARANCE) and All settings to go back. Rows stack, label over control. The save bar takes the tab bar's place while a group has unsaved changes, as on the order edit screen.
- **Where:** Settings structure options 25f.
- **What is still open:** nothing.

## later.md: Settings menu line under a notice

- **The problem:** the Settings menu's divider started under the confirm-email notice instead of at the top bar.
- **What changed:** settled by section 2: Settings has no menu beside the cards any more, so there is no divider to place. Remove this entry from later.md.
- **Where:** Settings structure options 25a to 25e.
- **What is still open:** nothing.

## later.md: Two-step sign-in questions (Copy all, even-width digits, the wait)

- **The problem:** the recovery codes had only Download in the app; the code field showed its digits in the normal text style; the wait after too many wrong codes was not drawn for New recovery codes and Turn off.
- **What changed:**
  - Copy all sits beside Download under the recovery codes, as drawn in 11f step 4 and New recovery codes. Copy all copies the codes one per line.
  - The code field takes a new variant, .sp-input--code (font-variant-numeric: tabular-nums), so every digit is the same width and the code does not shift as it is typed. It is on every code field: sign-in's code step and recovery code (Auth and first run 20g), and Turn on, New recovery codes and Turn off (Settings and import 11f).
  - Too many wrong codes in New recovery codes and in Turn off shows the code step's warning row, with the field and the button disabled, counting down, as T3 does.
- **Where:** Settings and import 11f; Auth and first run 20g; styles/components.css (.sp-input--code). App: react/src/pages/SettingsTwoStep.jsx, react/src/pages/SignIn.jsx, react/src/app/SessionDialog.jsx, and the Input component, which needs a way to take the variant. Remove this entry from later.md.
- **What is still open:** nothing.

## Extra small button radius

- **The problem:** the 22px extra small button had the 42px field's radius (9px), so it read rounder than the controls beside it. The 22px extra small icon button, which sits beside it, had the same fault: it kept the 32px icon button's 8px.
- **What changed:**
  - .sp-btn--xsmall and .sp-icon-btn--xsmall take `border-radius: calc(var(--r-field) / 1.5)` (6px), so the two match where they sit together.
  - On touch, where both grow to their larger sizes (the 34px small button, the 32px icon button), they take those sizes' radii back: `var(--r-field)` and `var(--r-tile)`. The touch look is unchanged.
  - Nothing else in the system has an xsmall size.
- **Where:** styles/components.css (.sp-btn--xsmall, .sp-icon-btn--xsmall, and their .sp-touch rules); drawn in Order list 2b and 2d (rail heads) and Auth and first run. App: the xsmall size in react/src/components/Button.jsx and the IconButton, react/src/styles/app.css, and CardHeader actionSize="xsmall" in react/src/components/Card.jsx, which uses it.
- **What is still open:** nothing.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Settings structure options.dc.html: the new Settings, 25g working example, 25a to 25f.
- Settings and import.dc.html: 11f with the code field variant and the wait in New recovery codes and Turn off. 11a is kept as it was.
- Auth and first run.dc.html: 20g with the code field variant.
- support.js, components.js, icons.js: what the pages load to open.
- styles/tokens.css, styles/components.css, styles/doc.css: shared styles; components.css adds .sp-input--code and the xsmall radius.
- styles/pages/settings.css: the Settings pages, with .st-wide and .st-form-row.
- styles/pages/auth-and-first-run.css: the Auth page.
- assets/two-step-qr.svg: the QR code in 11f.

## styles/check.js

0 findings across 28 pages. The "Status and Kind are selects" rule now also accepts a field label followed by its help line before the select, as a settings row has.

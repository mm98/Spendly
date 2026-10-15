# Handoff: Households, invites and the Settings regroup

## Overview

Spendly was one person per account. It now supports a household: several people with their own logins who see and add to the same orders, receipts and limits. The first person registers as today and becomes the owner; they invite others by email.

Four pieces:

1. **Data model**: data belongs to a household, people belong to it through a membership.
2. **Invites**: a People with access card in Settings, an invite email, and an Accept an invite screen.
3. **Attribution**: who added an order, shown only when the household has two or more people.
4. **Settings regroup**: the section nav splits into You, Shared and App, and the Money, dates and times pane splits in two. Plus a fix to the section nav's divider.

## About the design files

The `.dc.html` files are design references built in HTML. They show the intended layout and behaviour; they are not production code. Recreate the changes in the existing React app using its existing components. Every element used here is an existing library component (card, list row, mark, field, button, facet, sum row, confirm dialog); nothing new is drawn. The implementation notes beside each frame are part of the spec.

## Fidelity

High fidelity. Values below are the existing tokens in `styles/tokens.css`.

## 1. Data model

- **Household**: owns orders, item lines, attachments, vendors, categories, limits, lists, statuses, saved views, imports, and the shared settings (below). Every such row gets `household_id` where it had `user_id`.
- **User**: a login (email, password, passkeys) and the personal settings.
- **Membership**: `user_id`, `household_id`, `role`, `joined_at`. One user belongs to one household.
- **Invite**: `household_id`, `email`, `invited_by`, `token`, `expires_at` (7 days), `accepted_at`, `cancelled_at`.
- **Attribution**: orders keep `created_by` (user id). It is for display and filtering, never for ownership or access. Removing a person keeps their orders and their name on them.
- **Registering** creates a household with that user as owner. A single-person account is a household of one; nothing in the UI names it.

### Roles as permissions

The membership stores a role; the role maps to a set of named permissions. Code checks a permission, never the role name: `can('manage_people')`, not `role === 'owner'`. This is so more roles can be added later without touching call sites.

Today:
- **owner**: every permission.
- **member**: every permission except `manage_people` (remove a person).

Both can invite. An action the user lacks is absent, not disabled.

The owner cannot leave or be removed. Deleting the account deletes the household for everyone.

## 2. Settings (`Settings and import.dc.html`, frame 11a; phone: `Mobile screens.dc.html`, Settings frame)

### Section nav regroup

The section nav (208px, left of the pane) becomes three groups. Each group head is the existing `sp-section-label` head used for SETTINGS today; groups are separated by the existing menu separator.

- **YOU**: Account and profile, Appearance, Dates, times and numbers, Limit alerts, Needs a look
- **SHARED**: People with access, Currency, Defaults, Lists, Statuses, Import, Demo data
- **APP**: This build

Cards in the pane follow the same order. Below roughly 900px the section nav is a select; the three group names become its option groups. The profile row at the foot of the sidebar opens Settings on Account and profile.

On the phone, the Settings list follows the same groups: the profile card head reads YOU, then Passkeys, Appearance, Dates, times and numbers, Limit alerts; a SHARED label, then People with access (count 2), Currency, Defaults, Lists, Statuses, Import, Demo data; an APP label, then This build.

### Personal and shared settings

- **Personal (per user)**: profile, password, passkeys, theme, row density, compare this month with, date/time/number format, limit alerts, Needs a look switches.
- **Shared (per household)**: currency, defaults for a new order, lists, statuses, imports, demo data. A change applies to everyone at once, with the card's existing save.

### Money, dates and times splits in two

- **DATES, TIMES AND NUMBERS** (You): the Date and time format combobox and the PREVIEW row, unchanged.
- **CURRENCY** (Shared): the Currency combobox alone. Help text: "The currency all amounts are shown in, for everyone. This renames your figures. It does not convert them."

### People with access card (Shared, first pane)

Existing card. Head: `PEOPLE WITH ACCESS`. Then:

- Line (`sp-data`): "Everyone here sees and adds to the same orders, vendors, categories and limits. Appearance, formats and alerts stay your own."
- One row per person, separated by the card's rule, in the Passkeys row layout (row gap 12):
  - Mark: medium (36px), round, solid, initials. Mikkel `green-3`, Anna `amber-2`.
  - Name (`sp-strong`, truncates); under it the email in `sp-email-line` on `sp-meta`.
  - Right side: `sp-meta` text and/or small outline buttons (34px).
  - You: "Mikkel M. (you)", right side "Owner", no buttons.
  - Member: "Anna M.", right side "Joined 3 Oct 2026", button **Remove** (only for whoever has `manage_people`).
  - Pending: plain round mark with the first letter, the address as the name (`sp-strong sp-email-line`), meta "Invited 12 Oct 2026 · not accepted yet", buttons **Send again** and **Cancel invite**.
- Footer (`sp-card__footer`, row, gap 8): email input (42px, grows, placeholder "Their email address", `aria-label` "Invite someone by email") and **Send invite**, an outline button at the standard 42px height so it matches the field.

Behaviour:
- **Send invite** validates the address on submit, adds a pending row at the end and sends the invite email. An address that is already a member or pending shows the field error "Already in your list".
- **Send again** issues a new token, resets the 7 days and resends; the old link stops working.
- **Cancel invite** removes the row; the link stops working.
- **Expired invite** stays as a row reading "Invite expired" with Send again and Cancel invite.
- **Remove** (owner) and **Leave** (a member's own row, in place of the right-side text) ask first with the existing confirm dialog (States and confirmations 6d). A removed person loses access at once.
- With only you, the card shows your row and the invite field.

Future: assigning a role becomes a picker on each row, shown to whoever has `manage_people`. If custom roles ever come, a **Roles** pane goes directly after People with access, each role a list of permission switches in the Needs a look switch pattern. Not built now.

### Divider beside the section nav

Fix for a bug in production: when the pane is scrolled to its end, the divider stops at the last card while the menu continues below it.

The nav column does not scroll with the pane. It is exactly the height of the window below the top bar (sticky at top 0 with full height of the scroll area, or a fixed column beside it) and carries the 1px `--line-3` (#dedcd4; dark #463f37) divider on its right edge. Only the pane scrolls. If the menu is taller than the window, the nav column scrolls on its own and the divider still runs its full height.

## 3. Accept an invite (`Auth and first run.dc.html`, 20a, last specimen)

Route `/invite/:token`. The existing auth card (400px, centred, outside the shell):

- Mark S, heading "Join Mikkel M. on Spendly", line "You'll see and add to the same orders, receipts and limits."
- Name field (prefilled if known), Email as a read-only field showing the invited address, Password with reveal and the help "At least 12 characters. Longer beats complicated."
- Primary block button **Create account and join**, then the terms line as on Create an account.

Behaviour:
- Creates the user, joins them to the household as `member`, signs in, opens Home showing the household's data.
- **Skips email confirmation** (the link proves the address) and **skips first run** (currency and categories are the household's). Personal settings start at defaults.
- **Expired, cancelled or used link**: the sign-in card with a warning above the fields: "This invite no longer works. Ask Mikkel M. to send a new one."
- **Signed in as someone else**: nobody is signed out; the same card with "This invite is for anna@example.net".
- **The address already has an account**: the card is the sign-in card with the same heading. After signing in, if that account has orders, the confirm dialog asks: "Your 12 orders move to Mikkel M.'s. Vendors and categories with the same name become one." Buttons **Join and move them** / **Cancel**. Then:
  - Orders, items and attachments move to the household; `created_by` stays.
  - Vendors and categories with the same name (case- and accent-insensitive, as elsewhere) merge into the household's.
  - Where both have a limit on the same category, the household's limit stays.
  - The joining account's shared settings (statuses, lists, defaults, currency) are dropped; the household's apply.
  - Personal settings, password and passkeys are kept.
  - The old household is deleted.
  - An account with no orders joins without the dialog.

## 4. Invite email (`emails/invite.html`, `emails/invite.txt`)

Send-ready, multipart/alternative, same build as the other auth emails (see `emails/README.md`). Rendered as specimen 5 in Auth 20f.

- Subject: `{{inviter_name}} invited you to Spendly`
- Heading: `{{inviter_name}} invited you to Spendly`
- Body: "{{inviter_name}} invited {{email}} to see and add to the same orders, receipts and monthly limits."
- Button: **Accept the invite** → `{{action_url}}` = `/invite/:token`
- Line: "The invite works for 7 days. If you weren't expecting it, you can ignore this email."
- Footer: "Sent because {{inviter_name}} invited this address."
- `{{email}}` is the invited address. Every merged value is HTML-escaped.

## 5. Who added an order, only with two or more people

None of the following renders in a household of one. They appear when a second person joins and stay while there are two or more. A pending invite does not count.

- **Order list facet** (`Order list.dc.html`, 2b): an **Added by** group after Receipt, in the Status/Receipt checkbox pattern with counts: "Mikkel M. 142", "Anna M. 106". You first, then by name. A removed person stays listed while their orders exist. Applied, it is a filter chip "Added by Anna M."; saved views can carry it.
- **Order read view** (`Order editing layouts.dc.html`, 1a): an **Added by** sum row in Order details, after Reference and before Note, value "Anna M.". Read only; not a field in the edit screen; editing does not change it.
- **Scanned before** (`Order create.dc.html`, 3c): the scan line reads "Scanned 12 Aug, 14:32 by Anna M. · kvittering-indbo-12082026.pdf". With one person it stays "Scanned 12 Aug, 14:32 · file name". Your own scans show your name.

Out of scope: splitting Statistics by person (maybe later).

## Design tokens used

- Field and standard button height `--control-h` 42px (touch 48px); small button `--btn-h-small` 34px
- Radius: field and button `--r-field` 9px, card `--r-card` 12px
- Card padding `--card-pad` 16px; cards 12px apart
- Divider `--line-3` #dedcd4 (dark #463f37)
- Marks: `--green-3` #4f7f63, `--amber-2` #d3b98a
- Type: Poppins; button text 13px / 600

## Files

- `Settings and import.dc.html`: 11a, section nav groups, People with access, the split cards, notes
- `Auth and first run.dc.html`: 20a Accept an invite and notes; 20f the five emails
- `Order list.dc.html`: 2b Added by facet and note
- `Order editing layouts.dc.html`: 1a Added by row and note
- `Order create.dc.html`: 3c scan line and note
- `Mobile screens.dc.html`: phone Settings list
- `emails/`: send-ready emails, new `invite.html` / `invite.txt`, updated `README.md`
- `styles/`, `support.js`, `components.js`, `icons.js`: needed only to open the pages in a browser

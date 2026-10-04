# Spendly - changes since handoff_2026_10_04b_changes

Copy these files over handoff_2026_10_04b_changes. Decisions are in `Brief 14 answers.md`.

## 1. No monthly summary on a phone

Home on a phone does not show the monthly summary, and nothing replaces it. Needs a look covers this month's limits; the summary still goes out by email when that switch is on.

- Mobile screens 7a (Home frame, 10a): note added. The frame itself is unchanged apart from point 3.
- Duplicate and alerts 8b, 3: note says the summary is desktop only.
- Actions inventory: Monthly summary row updated.

**What the app changes**
- Remove the summary card from phone Home.

## 2. The summary hides as a whole, never per row

- Duplicate and alerts 8b, 3: a close button (`sp-icon-btn`, aria-label "Hide the August summary") at the right of the card head. It hides the summary for that month on every device, and it does not come back.
- Rows have no close button. Adjust stays on the over-limit row.

**What the app changes**
- Keep the head close button; remember the hide per month across devices.
- Remove the per-row close button and its Undo message.

## 3. Recent orders on a phone links to the full list

Mobile screens 7a (Home frame): the card head reads "RECENT ORDERS", muted "newest 3", then "All 248" (`sp-btn sp-btn--text sp-btn--small`, the desktop link) opening the order list.

**What the app changes**
- Add the link with the true total, as on desktop.

## 4. Categories: two URL filters

Vendors and categories 5d, new specimens under the row action popovers.

- `flag=over-limit` cuts the list to the categories over their limit.
- `month=YYYY-MM` measures every row against that month. The column reads the month (AUGUST) instead of THIS MONTH, and the pace marker goes.
- Both exist only in the URL; the page has no control for either. Each applied filter shows as a removable `sp-crumb` in `sp-filters` above the list, the order list's component. Removing a crumb drops that parameter. With nothing matching, the empty state shows and the crumbs stay.
- Needs a look's "N over their limit" opens `/categories?flag=over-limit`, on Home and on a phone (Mobile screens note added).

**What the app changes**
- Support both parameters on `/categories`, with the crumbs.
- Point "N over their limit" at `/categories?flag=over-limit`.

## Files

- `Mobile screens.dc.html`
- `Duplicate and alerts.dc.html`
- `Vendors and categories.dc.html`
- `Actions inventory.dc.html`
- `Brief 14 answers.md`

No CSS changed. `styles/check.js` reports 84 findings, the same known set as handoff_2026_10_04b_changes.

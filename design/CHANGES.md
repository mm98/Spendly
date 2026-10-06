# Spendly - changes since handoff_2026_10_05j_changes

Replaces handoff_2026_10_06_changes. Copy these files over handoff_2026_10_05j_changes.

## Fixed since handoff_2026_10_06_changes
- An order without a receipt is no longer treated as a problem. A receipt is optional, and most orders have none. Home's Needs a look card no longer counts them, and the sidebar's Missing receipt count is no longer amber.
- What Needs a look shows can now be switched on and off in Settings.

## 1. Home, Needs a look (Home 10a, Mobile screens 10a)

### Rows, in order
- Categories over their limit, categories near it, orders not delivered after two weeks, vendors that look like duplicates.
- Orders without a receipt is no longer a row by default. The 10a row "12 orders without a receipt attached" (phone: "3 missing a receipt") is replaced by "2 vendors that look like duplicates" (phone: "2 vendors look like duplicates"), the existing plain `.sp-list-item` count row, opening `/vendors?flag=possible-duplicate`.
- The cap of three rows stays. A row type that is switched off is skipped and the next one moves up. With every type off, the card is absent.
- The route `/orders?view=missing-receipt` is removed from Home's routes note.

### Orders not delivered
- Counts orders with status Ordered dated 14 or more days ago. A count of zero is no row.
- The existing `.sp-list-item` count row, no `data-color`. Desktop: "4 orders ordered over 2 weeks ago and not delivered" ("order ordered ..." for one). Phone: "not delivered after 2 weeks".
- Opens `/orders?status=Ordered&to=<day>`, the cutoff day 14 days before today (`to=2026-08-07` on 21 August).

## 2. Settings, Needs a look pane (Settings and import 11a)
- New pane in the settings navigation, after Limit alerts. Settings now has eleven panes.
- One card, NEEDS A LOOK, with one described switch per row type, in Home's order. The switches sit in `fieldset.sp-field-group` (c5), the same as other stacked described options:
  - Categories over their limit - on
  - Categories near their limit - on (the point is set in Limit alerts)
  - Orders not delivered after 2 weeks - on
  - Vendors that look like duplicates - on
  - Orders without a receipt - off
- Saves with the card's own save, like every card on the page. Applies to Home on desktop and on the phone.

## 3. Sidebar, Missing receipt view
- The count is the plain `.sp-nav-item__count`, no `data-color="warning"`, on every page that draws the sidebar: Home, Settings and import, Bookmarks, Dark mode and image viewer, Navigation shell.
- The attention flag on a view stays as a feature (Navigation shell note), but no starting view carries it.

## 4. Product link on an order line (Order editing layouts 1b notes)
- Saving: the address is cleaned as a bookmark's is. Tracking parts such as `utm_` and `fbclid` are removed, and a missing `https://` is added.
- Copies: a copy of an order keeps each line's link, however it is copied.

## 5. Not changed
- No CSS, tokens or components. Every component is used as it already is.

## 6. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- Home.dc.html
- Mobile screens.dc.html
- Settings and import.dc.html
- Navigation shell.dc.html
- Bookmarks.dc.html
- Dark mode and image viewer.dc.html
- Order editing layouts.dc.html
- Brief 29 answers.md

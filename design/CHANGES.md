# Spendly - brief 9 answers (the full sweep)

Copy these files over the previous package (handoff_2026_10_03j_changes).

`Brief 9 answers.md` answers every item, numbered as the brief. Each answer is already in the pages and stylesheets listed below.

**Stylesheet changes the app takes**
- `.sp-table tbody tr[data-void="true"] > td:not(.sp-col-status) { opacity: 0.6 }` - the cancelled row's pill keeps full contrast (4).
- `.sp-table--all-selected thead` tint removed; the class is gone from the design (5). Remove it at List.jsx.
- `.sp-record:has(input:checked)`: green border plus an inset 1px green ring, no fill (6).
- Sidebar literals: `--shell-action`, `--shell-action-hover`, `--shell-mark`, `--shell-warning` in tokens; the action, brand tile, account mark and warning count use them (72).
- Mobile screens' page inset is `--phone-gutter` (26).

**What the app changes (summary)**
- Submenu delay stays 500ms. Week starts Monday. Kind is a dropdown over five kinds.
- Icons: order `receipt`, vendor `building-store`, everywhere. Register rows added for wallet, keyboard, power, sun, tag, archive, arrows-join, alert-circle, eye, minus, refresh, star, device-desktop, wifi; `keyboard` was already in icons.js.
- The account avatar is round, initials on `--green-3`, everywhere; in Settings it takes a drop.
- Statistics: six presets; a single select on a phone; side cards show the current month; Expenses only is Ordered and Delivered; the Showing card carries Reset and Open in orders; no strip at rest; one Top vendors card; "ahead of pace" above pace by more than 10 points.
- No phone notifications. A tenth Settings pane, Limit alerts. The locale sets number format too.
- Vendors may not share a name. Archive from a row applies at once with Undo. No Favourite vendors card.
- Only scanning and importing wait for email confirmation.
- No `capture` attribute anywhere.

## Files

- `Order list.dc.html`
- `Input types.dc.html`
- `Layout rules.dc.html`
- `Mobile screens.dc.html`
- `Navigation shell.dc.html`
- `Responsive reference.dc.html`
- `Dark mode and image viewer.dc.html`
- `Images and files.dc.html`
- `Order create.dc.html`
- `Duplicate and alerts.dc.html`
- `Settings and import.dc.html`
- `Vendors and categories.dc.html`
- `Order statistics.dc.html`
- `Home.dc.html`
- `Components.dc.html`
- `Actions inventory.dc.html`
- `Order editing layouts.dc.html`
- `Auth and first run.dc.html`
- `Bookmarks.dc.html`
- `Icon legend.dc.html`
- `States and confirmations.dc.html`
- `styles/components.css`
- `styles/tokens.css`
- `styles/pages/mobile-screens.css`
- `Brief 9 answers.md`

`styles/check.js` reports 82 known findings.

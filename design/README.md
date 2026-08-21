# Design mockups — Spendly order flows

Static HTML mockups, one file per area. Open `index.html` for a linked overview; `Home.dc.html` is the app start page. Open any file directly in a browser; `support.js` must sit beside them.

Each screen carries a visible id badge (`1a`, `2b`, …) so it can be referred to in review. Ids are unique across the whole folder.

| File | Screens | Covers |
| --- | --- | --- |
| `Home.dc.html` | 10a | The start page: this month against the limits, receipt capture, what needs a look, recent orders |
| `Navigation shell.dc.html` | 9a, 9b | The frame every page sits in: sidebar areas, locked top bar, collapsed rail, ⌘K search palette |
| `Order editing layouts.dc.html` | 1a–1d | Order read view; editing an item in place incl. its photo; mobile edit screens and the item sheet; the edit screen itself (details in the right rail, attachments under the items, drag to reorder) |
| `Order list.dc.html` | 2a–2c | Bulk actions (set status, add category); rows list with facet rail, search and filter chips; cards view |
| `Order create.dc.html` | 3a | New order from a receipt: how to start, reading, check what was read, created |
| `Order statistics.dc.html` | 4a | KPIs, spend by month, category and status breakdowns, monthly limits, drill path down to the matching orders |
| `Vendors and categories.dc.html` | 5a–5c | Vendor list and panel with merge; category list and form carrying icon, colour and the monthly limit; roll-up panel for when nothing is selected |
| `States and confirmations.dc.html` | 6a–6e | Empty states, loading skeletons, validation, confirmations and toasts, scan failure |
| `Mobile screens.dc.html` | 7a | Phone: orders list, filter sheet, scan check, statistics |
| `Duplicate and alerts.dc.html` | 8a, 8b | Duplicating an order; budget alerts as you cross a limit, on the category, and monthly |

## Rules the mockups follow

- The top shell holds no page actions — it is locked. Page actions live in the page.
- A monthly limit never blocks a save. Red blocks, amber informs.
- Nothing is saved until an explicit Save or Create; scans never overwrite silently.
- Numbers shown against a filter reflect that filter, not the whole account.
- Single user, personal receipts. There is no item catalogue and no shared editing.

These are design references, not production code: layout and states only, no data or behaviour. Where a mockup and the code disagree, the code is the current truth — the mockup is the proposal.

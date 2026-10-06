# Spendly - changes since handoff_2026_10_06g_changes

Copy these files over handoff_2026_10_06g_changes. No CSS or check changes.

## 1. Vendor and category link to their orders (Order editing layouts, read view)
- In Order details, the Vendor value and each Categories value are plain links (`<a>` inside `.sp-sum__value`), in the app's existing link colour (`.sp a`). No new style.
- Vendor opens `/orders?vendor=indbo-mobler`: the order list filtered to that vendor.
- A category opens `/orders?category=decor`: the order list filtered to that category.
- These are the same routes as "Open in the order list" on Vendors and categories, with the filter chip visible and removable.
- With several categories, each name is its own link, separated by commas.
- They are ordinary links, so middle-click and new tab work.
- Read view only. In edit, the same rows are fields.

## Check
- styles/check.js: 0 findings across 26 pages.

## Files
- Order editing layouts.dc.html

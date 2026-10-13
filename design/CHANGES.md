# Spendly - changes since handoff_2026_10_13_full

Copy these files over handoff_2026_10_13_full. This answers the search shortcut brief (the ⌘K badge on the list searches). No component's look changed.

## 1. No shortcut badge on a list's own search (Layout rules 15e)
- ⌘K (Ctrl K on Windows) belongs only to the top bar's search, which opens the search window over the page (Components c11, Navigation shell). The top bar keeps its badge.
- The search in a list toolbar carries no badge at any width: no `.sp-input--search-kbd`, no `.sp-field__kbd` / `.sp-kbd` chip. The badge was removed from all eight toolbar drawings (four combinations, four widths).
- A list's own search is reached from the keyboard with G then the page's letter (G V for Vendors, G C for Categories), as listed in the keyboard shortcuts sheet. This is unchanged.
- "As the column narrows" no longer starts with the badge leaving at 720px. The order is now: search shrinks to its 160px floor, the long placeholder is swapped for a shorter one, the sort value drops, and below 640px the row splits in two.
- The 560 - 720px drawing is relabelled "SHORTER PLACEHOLDER".

## 2. In the app
- Remove the badge from the list search in `react/src/pages/Orders.jsx` (`OrderSearch`), `react/src/pages/Vendors.jsx`, `react/src/pages/Categories.jsx` and `react/src/pages/Bookmarks.jsx`.
- Keep the badge on the top bar search in `react/src/app/AppShell.jsx`.
- Remove any container-query rule that hid the toolbar badge at 720px.

## 3. Check (styles/check.js)
- New assertion: no `.sp-controls` toolbar may contain `.sp-field__kbd` or `.sp-input--search-kbd`.
- Clean: 0 findings across 26 pages.

## Files
- Layout rules.dc.html
- styles/check.js

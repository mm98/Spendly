# Handoff: one very large order no longer distorts filters and statistics

## Overview

One unusual order (a car bought once in five years) stretched the Amount facet so every everyday order sat in its first few pixels, and pulled the average order up. Three changes fix this. Each one is a state or a rule on something that already exists; no new screen.

## About the design files

The `.dc.html` files are design references built in HTML, not production code. Recreate the changes in the existing React app with its components. Open the pages in a browser from this folder; they load `support.js` and `styles/`. No CSS changed in this handoff; `styles/` is included only so the pages open.

## Fidelity

High fidelity. Every control is an existing component (`.sp-track`, `.sp-bounds`, `.sp-switch`, `.sp-field__help`). No token, size or colour changed.

## Changes

### 1. Amount facet uses a percentile scale (Order list, 2b)

- The track is spaced by order count, not by kroner. Each step covers the same share of the orders in the current set; the handle position is a percentile and the From and To fields show the amount at that percentile.
- The right end is the 99th percentile of the set, rounded to a clean figure. While the To handle sits there, the meta and the To field append `+` (`0 - 25.000+ kr.`) and the upper bound is open, so the largest orders stay in the result.
- Typing an amount above the end into To is accepted and parks the handle at the end.
- A set of fewer than 20 orders uses a straight scale from 0 to its largest order, with no `+`.
- Orders left out of statistics (change 2) still count in this facet, since it filters the list.

### 2. Leave out of statistics, per order (Order editing layouts, 1d)

- New switch at the end of Order details: **Leave out of statistics**, with help text under it. Off by default. Stored as `excludeFromStats`.
- When on, the order is skipped by every figure, chart, breakdown and limit on Statistics and Home, and by the Amount facet's percentile ends. It is still listed, searchable, filterable, exported and counted in the order list's toolbar total. Status is unaffected.
- Read view (1a): a **Statistics** row reading **Left out** appears only when the flag is on. Not drawn; described in the 1d notes.
- Statistics (4a): a second switch in the period row, **Include N left-out orders**, beside Compare with 2025. Shown only when the period holds at least one such order; absent otherwise. Off by default, in the URL as `excluded=include`, not remembered.

### 3. Median order replaces average order

- The order figure and its sparkline on Statistics (4a, 4b, 4c, 4g) are the median of the set, labelled **Median order**. The comparison pill compares median with median.
- The same label change on the vendor panel (Vendors and categories) and the summary specimen in Components.
- Total spend and breakdowns remain sums.

## Files

- `Order list.dc.html` - 2b Amount facet meta and notes
- `Order editing layouts.dc.html` - 1d switch, help text and note
- `Order statistics.dc.html` - Median order labels, Include switch in 4a, notes in 4a and 4e
- `Vendors and categories.dc.html`, `Components.dc.html` - Median order label
- `styles/`, `support.js`, `icons.js` - needed to open the pages

# Spendly - changes since handoff_2026_10_14e_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes, handoff_2026_10_14_changes, handoff_2026_10_14b_changes, handoff_2026_10_14c_changes, handoff_2026_10_14d_changes and handoff_2026_10_14e_changes applied. No stylesheet changes.

## 1. Categories this month on Home: a category with no limit
- It is ranked by its spend like the others, in the top 4.
- Its line shows the amount alone, "3.180", with no "/ limit".
- Its bar is the untargeted gauge already used on Vendors and categories: `sp-gauge sp-gauge--untargeted` with `<meter value="0" aria-label="No limit set">`. An empty track, no fill, no marker.
- The track stays so every row is the same height and the card keeps its resting height for the skeleton.
- A limit of zero is a limit; any spend against it is over.

## 2. In the design
- Home: the Textiles row is drawn with no limit, and a note on the case is added.

## 3. Check (styles/check.js)
- Clean: 0 findings across 26 pages.

## Files
- Home.dc.html

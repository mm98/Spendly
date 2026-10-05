# Spendly - changes since handoff_2026_10_05e_changes

Copy these files over handoff_2026_10_05e_changes.

## 1. The file drop has a row variant (c4)

- `.sp-filedrop--row` is a new variant beside `.sp-filedrop`. The stacked drop is unchanged.
- The mark sits at the left and spans two rows; the title and subtitle stand beside it, left-aligned.
- Grid: `auto minmax(0, 1fr)`, column gap `var(--sp-12)`, row gap `var(--sp-2)`.
- The title aligns to the bottom of its row and the subtitle to the top, so the two lines sit together in the middle of the mark.

## 2. Home, Add an order

- The drop uses `sp-filedrop sp-filedrop--row` and no longer carries `sp-grow`, so it is only as tall as its content.
- "Choose file" is removed: clicking the drop opens the same file picker.
- "Duplicate last order" moves up beside "Empty order", as `sp-btn--outline sp-btn--small`. It was a text button in the card footer.
- The card footer and its line "Bought from Indbo Møbler again?" are removed.

## 3. Check

- `styles/check.js` is unchanged. Clean run: 0 findings across 26 pages.

## Files
- Home.dc.html - Add an order card
- styles/components.css - `.sp-filedrop--row`
- styles/COMPONENT-STATUS.md - change log entry

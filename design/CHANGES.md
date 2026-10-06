# Spendly - changes since handoff_2026_10_06_changes_fixed

Copy these files over handoff_2026_10_06_changes_fixed. Answers brief 30.

## 1. The panel in one column (styles/components.css, Responsive reference 18b)

### Cause
- The cards in the main column have no width of their own, so they stretch to the column. `.sp-panel` states `width: 360px`, and a grid stretches only items whose width is auto, so in one column the panel kept 360 and Totals inside it stayed narrow.

### Rule
- The stylesheet had no 900px rule for `.sp-shell__body--split`. It is added in full, after the `.sp-shell__body--split > *` rule:

      @container (max-width: 900px) {
        .sp-shell__body--split { grid-template-columns: minmax(0, 1fr); }
        .sp-shell__body--split > * { grid-column: 1 / -1; }
        .sp-shell__body--split > .sp-panel { width: auto; position: static; }
      }

- The query answers to the column the body sits in, so that column must be a container (the app's page column, `container-type: inline-size`). The app's workaround in `app.css` can be removed.
- `.sp-panel--wide` is covered by the same rule.

### Other pages
- Order read is the only page that shows `.sp-panel` in one column. On the list pages (Bookmarks, Vendors and categories) the panel opens as its own page at 900 (18a), so the rule does not apply there.

### Note
- 18b, Order read (1a), at 900: Totals, under the items, takes the column's width, like the cards above it.

## 2. The period bar (styles/components.css, Order statistics 4a, Responsive reference 18b)

### Decision
- The bar wraps, as the app does. Hiding the resolved range alone is not enough: between 641 and 900 the sizes, the window and the compare switch still do not fit on one line.

### Rule
- `.sp-period` is `flex-wrap: wrap` (was `nowrap`). The sizes keep their 462px at every desktop width. When the row has no room, the window, the resolved range and the compare switch move to a second line. The day count still leaves below 1100. Below 640 the bar is the single select, as before.
- The app's workaround in `app.css` can be removed.

### Notes
- Statistics 4a: new note, "The period bar wraps rather than squeezing."
- 18b, Statistics (4a): at 1280, the wrap described; at 900, "Period bar as at 1280."

## 3. Not changed
- No tokens, type, colours or other components. Pages drawn wider than 900 render as before.

## 4. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- styles/components.css
- Order statistics.dc.html
- Responsive reference.dc.html

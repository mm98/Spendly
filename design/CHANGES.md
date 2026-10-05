# Spendly - changes since handoff_2026_10_04n_changes_fixed_4

Copy these files over handoff_2026_10_04n_changes_fixed_4. The HTML files are design references; rebuild them in the app's own code.

## 1. The name field never moves a view row (Brief 21, point 1)

In the Views card (Order list 2g), the name field that stands in a row's place - naming a new view, and Rename in edit mode - keeps its own height (42px desktop, 48px touch) but takes only the row's 40px in the list. Its extra height overlaps the 6px gap above and below it (1px each side on desktop, 4px on touch). The rows under it move 0px.

This is the rule the app already applies in `app.css`. It now lives in the design:

```css
.sp-nav-list > .sp-field__wrap { margin-block: calc((40px - var(--control-h)) / 2); z-index: 1; }
.sp-touch .sp-nav-list > .sp-field__wrap { margin-block: calc((40px - var(--control-h-touch)) / 2); }
```

**What the app changes**
- Remove the workaround from `app.css` and use the rule from `styles/components.css`.

## Not changed (Brief 21, points 2 and 3)

The card may grow when content is added below the list: the filter line while naming, and the Update / Revert footer when a view has changed since saving. That is intended. Only the rows must not move.

## Files
- Order list.dc.html - 2g naming note
- styles/components.css - nav-list field rule
- styles/COMPONENT-STATUS.md - change log entry
- styles/check.js, styles/tokens.css - unchanged, included for completeness

# Spendly - a loading shape that fills its box

Copy these files over handoff_2026_10_08o_changes.

**Added: `sp-skeleton--fill`.** A part that is not there yet - a field or a button in the order editor, Show all on Statistics, a limit bar in the category list, a category chip on a bookmark card - is a box at that part's own size with this shape inside. The shape fills the box in a flex row, a flex column, a grid cell or a block with a height, and has no size of its own. Same ground and radius as every other loading shape.

`sp-skeleton--bar` is only a chart's loading bar, a direct child of `.sp-bars`, standing on the baseline at its own height (handoff o). It filled other boxes only through the stretch that hung it from the chart's top.

## Tested
- The fill shape in six boxes, measured: a 280x42 field box in a flex row, a 120x34 button box in a flex column, a 200x8 limit bar in a grid cell, a 72x24 chip as a block and as inline-flex, a 120x34 box in a flex row that centres its items (a card head). The shape matches the box in all six.

## Checks
- checks.html: a new rule, a loading shape fits its job. A `sp-skeleton--bar` outside a chart is a finding, and so is a fill shape that does not fill its box.
- check.js: `sp-skeleton--fill` exists and fills; a chart loading bar outside `.sp-bars` is a finding.
- check.js: 0 findings across 26 pages. checks.html: clean, 26 rules over 26 pages.
- Components c13, Notes for implementation: both shapes and which job each does.

## Files
- styles/components.css
- styles/check.js
- checks.html
- Components.dc.html

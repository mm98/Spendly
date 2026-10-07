# Spendly - changes since handoff_2026_10_07c_changes

Fixed in this copy: the two open questions are decided and recorded. Income stays shown while editing (21c), and the names of income rows stay visible; only amounts are hidden. Budget.dc.html carries the added note. Nothing else differs from handoff_2026_10_07d_changes.

Copy these files over handoff_2026_10_07c_changes.

## 1. Budget: income hidden by default (Budget 21a, 21b; Mobile screens, Budget)
- Every time Budget opens, income and everything that reveals it is hidden:
  - the Income and Left over figures in the month card
  - each income row's amount and the Income sum
  - Left over in each month and on its pill
- Each hidden amount is drawn as `sp-redacted`: a bar of one fixed length, so its width says nothing about the figure. While hidden the figure is not in the page at all.
- The gauges on income are drawn empty (`sp-gauge--untargeted`), with no fill and no marker. Their line reads "Show income to see how much of it is used". Nothing moves when it is shown.
- Costs stay as they are, and so do the names of income rows: only amounts are hidden.
- New control in the controls bar: an outline button with the eye icon, `aria-pressed`. Off it reads "Show income"; pressed it reads "Hide income" and every figure appears in place. 21a draws it off, 21b draws it pressed.
- The choice holds until Budget is left. Edit (21c) shows income while editing, and leaving edit hides it again unless it was shown before.
- Phone: the same button sits beside Edit in the Budget header.

## 2. New component state: `sp-redacted` (styles/components.css)
- Inline block, 5.5em by 0.75em, `--r-marker` corners, the text's own ink at 0.18 opacity. Scales with the text it replaces, so it fits stat figures, summary rows and pills, on light and dark cards.
- Added beside `sp-gauge--untargeted`. No existing rule changed.

## 3. Icon legend: eye
- The eye now also shows or hides the income on Budget (21a).

## 4. Order create: the reading spinner lines up with the checks (Order create 3a)
- The spinner on "Reading the lines..." sits in a small plain mark (`sp-mark sp-mark--small sp-mark--plain`), so it takes the checkmarks' width and its text starts on the same edge as the lines above.
- No CSS change.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- Budget.dc.html
- Mobile screens.dc.html
- Order create.dc.html
- Icon legend.dc.html
- styles/components.css

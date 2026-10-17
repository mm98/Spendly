# Amounts in Statistics rows line up

Brief: "amounts in Statistics rows do not line up" (Brief-amount-alignment.md), and the later.md entry on card-head icon buttons on touch.

## 1. Grey text after an amount is a column of one width

**The problem** - In By category, Top vendors, Limits and By status the amount is followed by a short grey text ("71 orders", "/ 264.000 kr.", "71%"). That text had no width of its own and proportional digits, so each amount was pushed left by the length of the text after it, and the amounts in one card did not form a column (3.1 to 6.8 px spread at 1440 px, more with real data).

**What changed** - The grey text is a right-aligned column of one width for every row of a card, with equal-width digits: `sp-row-meta` beside `sp-meta`. At least 9ch for an order count, 12ch for "/ limit" (`sp-row-meta--limit`), 4ch for a share (`sp-row-meta--share`). The amount now ends at the same place in every row. Text longer than the column ("1.240 orders") widens that row only. This is the rule for every chart row where an amount is followed by grey text.

**Where** - Order statistics 4a, 4g and the crumb pages: By category, Top vendors, Limits, By status (38 rows). Components, charts notes ("Grey text after an amount in a chart row is a column"). `styles/components.css`: new `.sp-row-meta`, `.sp-row-meta--limit`, `.sp-row-meta--share`, after `.sp-meta--over`. App: `react/src/pages/Statistics.jsx` - `Ranked` (used by `CategoryCard` and `VendorsCard`) puts the order count in `sp-row-meta`; `LimitCard` puts "/ limit" in `sp-row-meta sp-row-meta--limit`; `StatusCard` puts the percentage in `sp-row-meta sp-row-meta--share`. No change on the phone, inside a crumb where the amount stands alone, or in "Copy an order", where the date sits under the amount.

**What is still open** - Nothing.

## 2. Card-head icon buttons keep their desktop size on touch (settles later.md "Icon buttons in a card head are kept small on the phone, in the app only")

**The problem** - On touch every icon button grows to 48px, which put the Totals box's Duplicate and Make invoice, and the close button on Home's month summary, 3px from the card's top edge. The app kept them small with its own rule in `app.css`; the design did not have it.

**What changed** - In a card head an icon button keeps its 32px box on touch, inside an invisible 48px press area, the same way the small outline button in a card head already works.

**Where** - `styles/components.css`: `.sp-touch .sp-card__head .sp-icon-btn:not(.sp-icon-btn--small, .sp-icon-btn--field)` and its `::after`, after the touch icon-button rule. Mobile screens, note "A card head's action is the small outline button". App: remove the rule in `react/src/styles/app.css` and remove the later.md entry.

**What is still open** - Nothing.

## 3. The checker covers it

`styles/check.js` adds "grey text after an amount is a sp-row-meta column": in a `sp-row-flex` row, an `sp-amount` followed by `sp-meta` without `sp-row-meta` is a finding.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - the 38 rows with `sp-row-meta`, and the By category note.
- `Components.dc.html` - the charts note for the column.
- `Mobile screens.dc.html` - the card-head icon button note.
- `styles/components.css` - the new column classes and the touch rule.
- `styles/check.js` - the new assertion.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.
- `styles/tokens.css`, `styles/doc.css` - shared styles.
- `styles/pages/order-statistics.css` - linked by a page in this package.
- `styles/pages/budget.css` - linked by a page in this package.
- `styles/pages/mobile-screens.css` - linked by a page in this package.

## Check

`styles/check.js`: 0 finding(s) across 27 pages.

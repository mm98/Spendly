# Orders with more than one category count in full in each

Brief: an order in Fastfood and Food was counted at half its total in each category, so Statistics showed 420,61 kr. for four Fastfood orders that came to 841,22 kr.

## 1. An order counts its full total in every category it carries

**The problem** - The app divides an order's total by its number of categories (`/ ot.category_count`). Categories overlap (Fastfood is a kind of Food), so each category was understated by half: Spend, Median order, the limit and the head of "The 4 orders behind this" read 420,61 kr. while the Total column added to 841,22 kr.

**What changed** - A category's spend is the full total of every order it is on. This holds for Statistics inside a category crumb (Spend, Median order, the limit, the charts, the order list head), the category list and record, limits and pace, Home's Categories this month and the monthly summary. A vendor still counts once. Category figures no longer add up to the period's spend.

**Where** - Order statistics 4a (note "An order counts its full total in every category it carries"); Vendors and categories 5d (note "A category's spend is the full total of every order it is on"). App: `api/src/lib/stats.js` (`scopeOf` share, `selectSplit`, `categorySeriesOver`, `selectLimitedMonths`) and `api/src/lib/aggregate.js` (`categoryStatsForQuery`, `categoryYearSpendQuery`, `categoryYearOrdersQuery`): remove `* 1.0 / ot.category_count`.

**What is still open** - Nothing.

## 2. By category is a ranked list, with no shares

**The problem** - By category was a ring with a percentage per category adding to 100%. With full amounts the shares would add to more than 100%.

**What changed** - By category is the ranked row list Top vendors already uses: each category's full amount and order count, the bar scaled to the largest category. There is no ring, percentage, Other row or total line. The card head reads "2026 · top 4 of 34" (4a) and "August · top 4 of 9" (4g). Inside a category crumb the Spend figure loses its share line ("44% of this vendor" removed in the vendor and Decor crumb) and the slice's order list head loses "39% of August spend". A vendor's share ("29% of the year") stays.

**Where** - Order statistics 4a, 4g (By category card, same markup as Top vendors), 4b crumb pages. App: the Statistics By category card in `react/src/pages/`; `splitOver` no longer needs `share` or the "Without category" remainder row for this card.

**What is still open** - The donut component (Components c14, DRAFT) has no remaining use. Please confirm it can be removed from the library.

## 3. Stacked counts each order once, under its first category

**The problem** - Spend by month's Stacked mode piles the top 3 categories into each bar. With full amounts the segments would add to more than the bar.

**What changed** - In Stacked, each order counts once, under the first category listed on the order, so a bar's segments always add up to the bar. The segments are the top 3 categories of By category; an order whose first category is not among them, or that has none, goes in Other. A Stacked segment can therefore be smaller than that category's By category row.

**Where** - Order statistics 4a (note "Stacked counts each order once, under its first category"). App: `categorySeriesOver` in `api/src/lib/stats.js` groups by each order's first category instead of every link.

**What is still open** - Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order statistics.dc.html` - By category cards, removed share lines, the three notes.
- `Vendors and categories.dc.html` - the full-amount note on the category list.
- `support.js`, `components.js` - needed to open the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles.
- `styles/pages/order-statistics.css` - linked by Order statistics.

## Check

`styles/check.js`: 0 findings across 27 pages.

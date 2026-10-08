# Fixed in this package

The t package drew three 4a cards wrongly: the new values had no rule in the styles.
- By category: the ring was one colour. components.css gains the `29-49-62` stops beside `39-67-88`.
- Limits: the Decor, Seating and Lighting gauges drew empty and the pace marker sat at 0. Fills are now 55, 35, 40, 40 and the marker 65, steps that exist; the pace reads 65%.
- Top vendors: five gauges drew empty. Fills are rounded to steps of 5.
- checks.html: a gauge fill or marker that does not draw where its value says, or a ring whose stops have no rule, is a finding.

Copy these files over handoff_2026_10_08s_changes (this replaces handoff_2026_10_08t_changes).

---

# Spendly - every Statistics card follows the period

**Decided: every card on Statistics follows the chosen period; none is tied to a month.** 4a (period Year · 2026, to date) showed By category, Top vendors and Monthly limit for August only. They now cover 2026, like the figures, Spend by month, By status, Spend vs saving and the order list. 4g is the same page for one month and keeps the August figures.

- **By category:** the ring and its shares for 2026: 486,3k; Decor 29%, Seating 20%, Lighting 13%, Other 38% (the same amounts as the phone's By category).
- **Top vendors:** 2026, top 8 of 23, Show all 23 vendors, 486.320 kr. total.
- **Limits** (was Monthly limit; one name for every period, Month included). A limit is set per month, so for a longer period a category's limit is its monthly limit times the months in the period: 12 for a year, 3 for a quarter. A custom period counts each month by the share of its days it covers. The pace marker is how far through the period today is, by days: day 232 of 365, 64%, drawn at 65%. Copy: "Each category has one limit a month. For 2026 that is 12 months." Decor 142.310 / 264.000 kr., Seating 98.740 / 288.000, Lighting 64.180 / 168.000, Textiles 38.920 / 96.000.
- When the path selects something these three cards are not shown; unchanged.
- Not changed: Home's "Categories this month", and "Monthly limit" as the name of the setting on categories, its field and its column, where it is a per-month amount.
- 4a's Notes for implementation state the rule.

## Checks
- check.js: 0 findings across 26 pages.

## Files
- Order statistics.dc.html
- styles/components.css
- checks.html

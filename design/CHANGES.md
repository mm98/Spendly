# Spendly - design brief 13 answers

Copy these files over handoff_2026_10_03p_changes.

## 1. The order views in the sidebar: option B

The sidebar always shows All orders and the first N views (Settings, "Order views in the menu"), then "N more in Orders". Opening a view never adds, removes or moves a row, and the count does not change.

**Stylesheet (components.css)**
- New state: `.sp-nav-item[aria-current="page"] > .sp-nav-item__sub { color: #fff; }`. The "N more in Orders" row takes `aria-current="page"` when the open view is one of the N, and gets the same fill and weight as any current item. Its text is unchanged and it still takes no click.

**What the app changes**
- Remove the extra row for the open view. Set `aria-current="page"` on the "N more in Orders" span when the open view is past the limit.

**Documented**
- Navigation shell 9e: the sidebar with a view past the limit open, beside the sidebar at rest.
- Settings and import, the "Order views in the menu" note: now states this behaviour.
- COMPONENT-STATUS.md: dated entry.

## 2. Navigation shell 9a: wrong row fixed

The second row under ORDERS read "All orders 248" with a wallet icon and linked to Budget. It is now "Hay this month 18" with the store icon, linking to the order list, matching 9e.

## Files

- `styles/components.css`
- `styles/COMPONENT-STATUS.md`
- `Navigation shell.dc.html`
- `Settings and import.dc.html`

`styles/check.js` reports the same 84 known findings as handoff_2026_10_03p_changes.

# Spendly - changes since handoff_2026_10_06c_changes_fixed

Copy these files over handoff_2026_10_06c_changes_fixed. Answers brief 33. Notes only, plus one drawing on Statistics 4d. No CSS, tokens or components changed.

## 1. A list never shows more than one page of rows (Order statistics 4a, 4d, Home 1a)

### Rule
- P is Rows per page from Settings (never fewer than 10), the same number for every list on Home and Statistics.
- At rest a list shows its top 8 rows and one line, "Other N categories" or "Other N vendors", with their total.
- The button reads "Show top P of N categories" and opens the top P rows; the rest stays as one Other line. It never opens the whole list. With P or fewer rows it reads "Show all N".
- Monthly limit opens to P rows; under them one line: "Top P of N. Edit on category lists them all."
- Top vendors meta: "top 8 of N" at rest, "top P of N" open, "all N" when everything is shown.
- Home keeps its caps: 3 rows in Needs a look, 4 in Categories this month.

### Drawing (4d, 200 vendors)
- Resting button: "Show top 10 of 200 vendors".
- Open card: meta "top 10 of 200", the top 10 rows, then "Other 190 vendors" at 272.870, footer "Show top 8 only" and "3.342.600 kr. total". The scroll region (`os-scroll sp-scrolls`) is removed; one page does not scroll.

## 2. Monthly limit card: only categories with spend (Order statistics 4a)
- Draws only categories with spend in the period. A category with a limit and no spend is not drawn.
- The foot line ("All categories", spend and total of limits) still counts every limit.
- No spend in any limited category: the card shows the same text as when no category has a limit.
- Inside one category's crumb the card is always drawn, spend or not.

## 3. Categories list: filter for categories with a limit (Vendors and categories 5d, Home routes)
- New URL filter `/categories?flag=limited`, shown as the removable tag "Has a limit", the same `sp-crumb` as "Over the limit".
- Empty: "No category has a limit".
- Links:
  - Edit on category (Statistics, Monthly limit) opens `/categories?flag=limited`.
  - Needs a look, "near its limit" row, opens `/categories?flag=limited`.
  - "All N" in Categories this month on Home opens `/categories?month=YYYY-MM` (was `/categories`).
- Actions inventory: the Edit on category entry updated to match.

## 4. A link opens what it counts (Home routes, Statistics 4d, Categories 5d)
- A button or row that shows a number opens a list with exactly that many items. If it cannot, the number is not shown.

## 5. Open points
- The Monthly limit card's no-limit text is not drawn anywhere yet; the app's existing text applies.
- If the "near its limit" row ever shows a count, `flag=limited` would not match it, since that filter lists every category with a limit.

## 6. Check
- `styles/check.js` clean: 0 findings across 26 pages.

## Files
- Order statistics.dc.html
- Vendors and categories.dc.html
- Home.dc.html
- Actions inventory.dc.html

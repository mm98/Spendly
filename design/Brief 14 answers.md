# Brief 14 answers

1. The monthly summary does not appear on a phone, and nothing replaces it.
   - Not option B: a row about last month answers nothing a few days into the next one, and no page shows last month's limits for it to open. Needs a look already covers this month.
   - Remove the phone summary card from the app. 10a is unchanged apart from point 4.
2. Not needed, since the summary is not drawn on a phone. The desktop card keeps Adjust on the over-limit row.
3. Keep the close button that hides the whole summary; remove the per-row close and its Undo message.
   - Drawn in Duplicate and alerts 8b, 3: an `sp-icon-btn` at the right of the head, labelled "Hide the August summary". Hiding is remembered for that month on every device.
   - Actions inventory updated to match.
4. Yes. Recent orders on the phone carries "All 248" in its head, the same `sp-btn--text sp-btn--small` link as desktop, with "newest 3" as the muted label. Drawn in 10a.
5. "N over their limit" in Needs a look opens `/categories?flag=over-limit`: the category list cut to the categories over their limit this month.
   - The list also takes `month=YYYY-MM`. The column then reads the month (AUGUST) instead of THIS MONTH and the pace marker goes.
   - Both are URL-only filters with no control in the page. When applied, each shows as a removable crumb (the order list's `sp-crumb`). Drawn under Vendors and categories 5d.

# Brief 10 answers

1. Load more in the address: c1 (Components) has the rule. The number of pages loaded is part of the address (`?pages=3`); it resets on any filter, search or sort change, and a saved view does not store it.
2. Statistics, 4d:
   1. The order table's Load more goes into the address, as on every list, so an opened order and Back return to the same rows.
   2. Show all and Show top 8 stay card-local; a reload comes back at top 8.
   3. "25 rows" is gone; the table loads one page (Rows per page).
3. The order card on a phone:
   - 2c says selection applies on desktop only; a phone does not select orders and has no bulk actions.
   - The phone card is now the 2i card, one implementation: vendor and amount; date and items with the saving under the amount. The reference, the status and the category are not on a phone card; the order page shows them. A saving of zero is grey. Mobile screens order list redrawn and its note corrected.
4. `.sp-touch .sp-chip:not(.sp-chip--static)` takes the touch height; a label chip keeps `--field-trail`. Drop the app.css workaround.
5. `.sp-shell--touch .sp-shell__body > .sp-empty:not(.sp-empty--dashed) { padding: 0; }` is in components.css. Drop the app.css workaround.

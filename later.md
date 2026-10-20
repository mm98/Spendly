# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## Deleting an order should not remove it for good at once

- **Where:** Delete order (`react/src/pages/DeleteOrder.jsx`, `DELETE /api/orders/:id`) and bulk
  delete (`react/src/pages/OrderBulk.jsx`, `POST /api/orders/bulk`).
- **What the reader sees:** one deleted order can be brought back only from the toast, for 6
  seconds. The copy is held in the server's memory, so a restart loses it. Bulk delete cannot be
  undone at all.
- **What is wanted:** a deleted order is kept for a while and can be restored, then removed.
- **Two ways to build it:**
  - A copy moved out of `orders` into its own table, removed after a set time. No other read of
    orders changes. It needs a "Recently deleted" place in the app, which `design/` does not draw.
  - A Deleted status type. The order list shows it only when its facet is chosen, so no new page
    is needed. Every read of `orders` and `order_totals` in `api/src` must then skip it, not only
    leave its money out as Draft and Cancelled do. Cancelled cannot be reused: it is a real order
    the reader keeps.
- **Open questions for the user:** remove after one day, after longer, or never; whether Deleted
  is offered in the status menu; whether bulk delete moves orders to Deleted too.
- **Found:** 2026-10-20.

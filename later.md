# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## Large accounts still make everyone wait on a few pages

- **Where:** the Home, Orders and Statistics pages, and the server, which answers one request at a time.
- **What the reader sees:** with 30 accounts opening a page at once, every account waits about
  0.7 to 2 seconds, the smallest ones too.
- **What was found:** read helpers were built and measured on branch `feat/read-helpers`: a few
  threads beside the server, each with its own read-only connection. With 30 accounts opening
  Statistics at once, the reads took 450 ms on the server alone and 150 ms on 4 helpers, but the page
  as a whole did not get faster: the reads are about half of its time, and the rest is receiving the
  requests and sending the answers. The gain also depends on how many processors the server has.
- **Proposed shape:** pick the branch up when real use shows many accounts waiting at once; move the
  order list to the helpers too, and measure on the real server's processor count.
- **Found:** 2026-10-23.

## A deleted record should not be removed for good at once

- **Where:** Delete order (`react/src/pages/DeleteOrder.jsx`, `DELETE /api/orders/:id`), bulk
  delete (`react/src/pages/OrderBulk.jsx`, `POST /api/orders/bulk`), and the delete of every other
  kind of record a reader may want back (vendors, categories, bookmarks).
- **What the reader sees:** one deleted order can be brought back only from the toast, for 6
  seconds. The copy is held in the server's memory (`api/src/lib/orderTrash.js`), so a restart
  loses it. Bulk delete, and the delete of any other record, cannot be undone at all.
- **What is wanted:** a deleted record is kept for a while and can be restored, then removed.
- **Proposed shape:** one table for every kind, a copy of the record and everything that goes with
  it, after which the record is deleted as now:

  ```sql
  CREATE TABLE deleted_records (
  	id TEXT PRIMARY KEY,
  	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  	kind TEXT NOT NULL,
  	record_id TEXT NOT NULL,
  	deleted_at INTEGER NOT NULL,
  	rows TEXT NOT NULL
  );
  ```

  - `rows` is JSON grouped by table (`{"orders": [...], "order_items": [...]}`). Each kind
    declares once which tables go with it. Restore inserts the parent first.
  - File bytes cannot be JSON: base64 inside it, or a `deleted_record_files` side table if copies
    are kept long.
  - Restore inserts only the columns the copy has and the table still has, as `orderTrash.js`
    does, so a later migration does not break it.
  - One cleanup removes copies older than the kept time, and one "Recently deleted" place lists
    them all. `design/` does not draw that place yet.
  - No other read changes, unique names stay unique, and cascades still run.
  - Each kind needs a rule for a restore that conflicts with what changed meanwhile: its vendor is
    gone, or its name is taken.
- **Rejected:** a `deleted_at` column with a view per table, which filters every read for free
  but needs partial unique indexes, adjusted stored counts and its own handling of linked rows in
  every table. A Deleted status type, which every read of `orders` would have to skip. Cancelled,
  which is a real order the reader keeps.
- **Open questions for the user:** how long a copy is kept; which kinds get it; whether bulk
  delete keeps copies too; where "Recently deleted" lives, which goes to Claude Design.
- **Found:** 2026-10-20.

## An offer's panel on a phone hangs from its row, not its tag

- **Where:** `react/src/styles/app.css`, the three `.sp-touch .sp-list-item ... .sp-popover` rules;
  `design/Order editing layouts.dc.html` 1c.
- **What the reader sees:** on a phone the offer panel opens under the whole line, its right edge on
  the line's right edge.
- **What was found:** hung from the tag, as 1c draws it, the panel is wider than the room left of the
  tag and ran 19px past the left edge of a 393px wide iPhone 15 screen.
- **Proposed shape:** Claude Design takes the rule into the popover's touch rules, and these lines go.
- **Found:** 2026-10-26.

## A phone's line row cannot carry an offer's tag while the row opens the line

- **Where:** the edit and new-order pages on a phone (`react/src/pages/OrderForm.jsx`), and an order
  line with a photo on the order page on a phone (`react/src/pages/Order.jsx`).
- **What the reader sees:** on a phone's edit page the head says how many lines are on offer, but
  the lines show no tag. On the order page a line with a photo and an offer opens its photo from the
  photo itself, not from the whole row.
- **What was found:** there the whole row is one button, and a button cannot hold another button.
  `ListItem` has no place for a control beside a row that opens, except with a reorder handle.
- **Proposed shape:** Claude Design gives `ListItem` a place for one control beside the part that
  opens, and the tag goes there.
- **Found:** 2026-10-26.

## An offer's picture was never seen loading

- **Where:** the offer panel on an order, and the offers in an Ask answer.
- **What the reader sees:** the product's small picture, or the empty photo box when it does not load.
- **What was found:** Tilbudsugen's picture server refused the test machine (403, "Access denied"),
  from a command line and from a browser alike, so no picture from it was seen in Spendly.
- **To do:** open an order with an offer in an ordinary browser, and check that the picture shows.
- **Found:** 2026-10-26.

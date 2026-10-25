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

## The sidebar rows' own name does not match their words

- **Where:** `NavItem` (`react/src/components/Shell.jsx`, Claude Design's code). The stories marked
  `knownAccessibilityFaults`: every story in `storybook/pages/Pages.stories.jsx`, and Shell's
  Sidebar And Top Bar and One Nav Item. Their test reports the fault and does not fail.
- **What the reader sees:** nothing on screen. A person who speaks to their computer may not reach a
  sidebar row by saying the words on it.
- **What was found:** a NavItem with words names itself "All orders 18". The accessibility check
  reads the words and the count as one text, "All orders18", which is not part of that name. The
  account row ("session@example.com") fails the same way. Every other fault the check found in the
  components and the pages is gone. Sent to Claude Design in the note on the long press.
- **Found:** 2026-10-25.

## Two parts of Claude Design's handoff wait on a change in a part

- **Where:** the order list and bookmarks on a phone (`react/src/pages/Orders.jsx`, `OrderCards`;
  `react/src/pages/Bookmarks.jsx`), and the rail heads on the order list (`Orders.jsx` Filters,
  `OrderViews.jsx` Views).
- **What the reader sees:** a long press on an order or a bookmark on a phone does nothing; on
  Vendors and Categories it opens the record's menu. The rail heads' buttons are the small size,
  not the smallest.
- **What was found:** the long press is on `Card` only, and these lists draw their rows with
  `ListItem` and `Record`. `CardHeader` draws its buttons at the small size and takes no size.
  Both are in the note to Claude Design of 25 October.
- **Found:** 2026-10-25.

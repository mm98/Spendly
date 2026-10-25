# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## The phone top bar's Back size does not reach the app's Back

- **Where:** every phone screen one level down that shows Back in the top bar (Ask, Ask's Files and
  Chats, Scanned before, Compare with receipt), against Mobile screens 11e and 24a.
- **What the reader sees:** Back at 30px and the page menu at 32px, as drawn, through a rule in
  `react/src/styles/app.css`.
- **What was found:** the design's rule reaches an icon button straight inside `.sp-topbar--touch`.
  The app puts Back, the title and the menu in a slot (`.sp-topbar__screen`, drawn as
  `display: contents`) inside the top bar, so the rule missed them and Back stayed 48px.
- **Rule for `design/`:** the top bar's Back and page menu sizes also reach an icon button inside
  `.sp-topbar__screen`, the slot a screen one level down fills.
- **Found:** 2026-10-25.

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

## Budget's month wells do not use popLayout

- **Where:** Budget, months view (`react/src/pages/Budget.jsx`, `react/src/styles/pages/budget.css`),
  against the Motion note under Budget 21a in `design/Budget.dc.html`.
- **What the reader sees:** nothing; the months slide sideways as drawn.
- **What was found:** the note builds the wells with `AnimatePresence mode="popLayout"`. popLayout
  lifts a leaving well out with a `<style>` element it adds to the page, and the server's CSP refuses
  it, so in production the new month was placed below the others and then rose. The build puts every
  well in one grid row instead, a column each, and a leaving well keeps its last column.
- **Rule for `design/`:** the month wells sit in one row, a column each; a well that leaves shares
  its column with the one taking its place. Nothing in the app may depend on a `<style>` element
  added at run time.
- **Found:** 2026-10-25.

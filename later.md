# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## A tall shop logo is cut at the bottom of its mark

- **Where:** `.sp-mark--logo` in `design/styles/components.css` (Components c2), drawn on Ask's offer rows.
- **What the reader sees:** a logo taller than the mark's shape, such as Rema 1000's, showed only its
  top half.
- **What was found:** the image's `height: 100%` has nothing to resolve against in the mark's grid, so
  the image takes its own height and the mark crops it. `react/src/styles/app.css` sets the mark's
  track (`grid-template: minmax(0, 1fr) / minmax(0, 1fr)` on `.sp-mark--logo:has(> img)`), so every
  logo is drawn whole and centred.
- **Proposed shape:** Claude Design takes that rule into `.sp-mark--logo`; the app's copy and this entry then go.
- **Found:** 2026-10-26.

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

## The status guard does not run in project threads

- **Where:** `.claude/hooks/status-guard.mjs`, set up as a `PreToolUse` hook in `.claude/settings.json`.
- **What the reader sees:** nothing changes. A thread can still go more than 30 seconds without a
  status, and its next step is not stopped.
- **What was found:** in a project thread the guard never wrote its time file, and a step taken 37
  seconds after the last status went through. Run by hand, the script works. The thread's own built-in
  hooks do run, among them a status reminder that waits 300 seconds. Gaps over 30 seconds between status
  lines were as common after the guard was added as before. The repo cannot switch the hook on.
- **Kept:** the user chose to keep the guard, in case a later setup loads the repo's hooks.
- **Found:** 2026-10-26.

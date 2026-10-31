# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## A deleted record should not be removed for good at once

- **Status:** an idea for later, not a planned task. Nothing is built for it until the user asks.
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
    them all.
  - No other read changes, unique names stay unique, and cascades still run.
  - Each kind needs a rule for a restore that conflicts with what changed meanwhile: its vendor is
    gone, or its name is taken.
- **Rejected:** a `deleted_at` column with a view per table, which filters every read for free
  but needs partial unique indexes, adjusted stored counts and its own handling of linked rows in
  every table. A Deleted status type, which every read of `orders` would have to skip. Cancelled,
  which is a real order the reader keeps.
- **Agreed with Claude Design, not in `design/` now:** Recently deleted is a card in Settings with
  one row per record: its kind and name, when it was deleted and when it is removed for good, and a
  Restore button. Orders, vendors, categories and bookmarks are kept 30 days, bulk delete included.
  Restore brings back the record and what went with it. A restore that conflicts still restores, and
  the toast says what changed: "Order restored. Its vendor Proshop is gone, so it has no vendor." or
  "Category restored as Garden (2), since Garden is taken." If it is ever built, it is its own pull
  request, and `design/` draws the card in Settings 11a first.
- **Found:** 2026-10-20.

## Reconcile's matching notes in the design are out of date

- **Status:** waits for the next note to Claude Design. Added 31 October 2026.
- **Where:** `design/Order list.dc.html`, 2j, the Matching note.
- **What the reader sees:** nothing. The app is right; only the design text is old.
- **What was found:** the note says a payment matches an order dated "before or after" the bank
  date. The user decided a payment only matches an order from the same day or the days before it,
  since a bank never takes the money before the order. The note should say that.
- **Also:** the Days apart note says both sliders start at 3. The user chose 5 for Days apart,
  since a bank can take some days to take the money. The note should say Days apart starts at 5.

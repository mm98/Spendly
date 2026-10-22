# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

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

## For Claude Design: the bars in an answer measure their height above the ticks

- **Where:** `react/src/styles/app.css`, `.sp-chat__chart .sp-bars__col` and `.sp-chat__chart .sp-bars__tick`. Ask Spendly (24d), a bar chart in an answer.
- **What the reader sees:** each bar is as tall as its amount says, and the tallest bar reaches the top.
- **What was found:** a bar's height is a share of its whole column, and the tick under it takes part of that column. So every bar above about four fifths was cut to the same height, and August and September looked equal. Found 22 Oct 2026.
- **To take into `design/`:** in an answer's chart the tick sits in the column's padding, so a bar's height is a share of the space above the ticks. Then it is removed from `app.css` and this entry goes.

## For Claude Design: Ask's empty page scrolls in its own box

- **Where:** `react/src/styles/app.css`, `.sp-chat__start`. Ask Spendly (24a), the empty page with the saved questions.
- **What the reader sees:** the box to type a question stays above the tab bar, and the saved questions scroll when there is no room.
- **What was found:** on a phone with the confirm banner showing, the empty page did not shrink, so it pushed the box to type in 7px under the tab bar and the whole page scrolled. Found 22 Oct 2026.
- **To take into `design/`:** `.sp-chat__start` gets `min-height: 0; overflow-y: auto; justify-content: safe center`. Then it is removed from `app.css` and this entry goes.

## For Claude Design: a downloaded file is named after its heading, not the question

- **Where:** `design/Ask Spendly.dc.html`, Files (24e), "The downloaded file is named the question, then the time it was asked". Built in `api/src/lib/assistantFiles.js`, `fileDownload`.
- **What the reader sees:** a file downloads as "Orders in October 2026 (2026-10-22 14.05.33).xlsx", the heading at the top of the file, then the time. The row on Files and in the answer still shows the question.
- **What was found:** the user asked for a proper file name instead of the question. Decided 22 Oct 2026.
- **To take into `design/`:** the sentence names the heading at the top of the file, not the question, and the example follows. Then this entry goes.

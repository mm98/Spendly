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

## For Claude Design: the last control in the chat field opens its tip to the left

- **Where:** `react/src/styles/app.css`, `.sp-chat__composer > [data-tip]:last-child::after { left: auto; right: 0; transform: none; }`. Ask Spendly (24a), the email button beside Send.
- **What the reader sees:** the tip of the email button lines up with the button's right side. Before, the whole page scrolled 7px sideways at every desktop size.
- **What was found:** a tip is centred over its control and only hidden, so it still takes room. The email button sits at the right edge, and its centred tip reached 7px past the window. Found 21 Oct 2026.
- **To take into `design/`:** a tip on a control at the right edge lines up with the control's right side, in `components.css` beside the tooltip rules. Then it is removed from `app.css` and this entry goes.

## For Claude Design: the confirm banner keeps the phone gutter on Ask

- **Where:** `react/src/styles/app.css`, `.sp-shell--touch .sp-shell__body--fill > .au-banner { padding: var(--phone-gutter) var(--phone-gutter) 0; }`. Ask on a phone (7a) while the email is not confirmed.
- **What the reader sees:** the banner sits 16px from the screen's edges, as on every other phone page. Before, it ran 3px past the screen, and the page scrolled sideways and down.
- **What was found:** Ask's body has no padding on a phone, so the banner had no gutter. Found 21 Oct 2026.
- **To take into `design/`:** the banner's gutter on a full-height page. Then it is removed from `app.css` and this entry goes.

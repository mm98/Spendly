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

## The phone's tab bar is 3px wider than the screen

- **Where:** the tab bar on a phone (`.sp-tabbar--band`, drawn by `react/src/components/Shell.jsx`), seen on Ask Spendly.
- **What the reader sees:** the page can be moved sideways by 3px, and on Ask Spendly a 6px gap shows between the question field's bar and the tab bar.
- **What was found:** on an iPhone 15 profile in Chromium, the tab bar and its last item end at 396px on a 393px screen. Main shows the same, so it predates the Ask Spendly changes. Found 21 Oct 2026.

## For Claude Design: a wide table in an answer scrolls sideways

- **Where:** `react/src/styles/app.css`, `.sp-chat__figures { overflow-x: auto; }`. Ask Spendly answers (24a, Components c34, Mobile screens 7a).
- **What the reader sees:** on a phone, a table with more columns than the bubble holds scrolls sideways inside its frame. Before, the last column was hidden.
- **What was found:** no column of an answer's table is cut, so each column is at least as wide as its longest word. A four-column table (Type, Lamp, Price, Order) needs 380px; an iPhone 15's bubble has 291px. `.sp-chat__figures` had `overflow: hidden`, so the Order column was hidden. Found 21 Oct 2026.
- **To take into `design/`:** the rule above, in `components.css` beside the other `.sp-chat__figures` rules. Then it is removed from `app.css` and this entry goes.

## For Claude Design: a saved question's cap is a fixed 320px

- **Where:** `react/src/styles/app.css`, `.sp-chat__pick > .sp-btn { max-width: 320px; }`. Ask Spendly's empty page (24b states 1 and 6).
- **What the reader sees:** a long saved question sits in the middle under the empty state. Before, it sat at the left.
- **What was found:** with `max-width: min(320px, 100%)` on the button, the row sizes the saved question by its uncut text, so the question takes the whole row and its button sits at the row's left edge. A fixed 320px cap lets the row size it at 320px and centre it; the question and its remove button still shrink to fit a narrower column (checked from 320px to 393px wide). Found 21 Oct 2026.
- **To take into `design/`:** the rule above in place of the `min(320px, 100%)` cap in `components.css`. Then it is removed from `app.css` and this entry goes.

## For Claude Design: the conversation email is almost full width

- **Where:** `api/src/emails/ask-chat.html`, which differs from `design/emails/ask-chat.html` on purpose. `react/scripts/check-design.mjs` lets it differ through `EMAIL_FIXES`.
- **What the reader sees:** the emailed conversation fills the window up to 1200px, with 24px around the card and 32px inside it. On a phone it is 8px around and 20px by 16px inside. Before, it was 600px wide with 20px inside.
- **What was found:** on a phone, the answer bubble kept a quarter of the row empty beside it, so a three-column table stuck out of its bubble by 34px. The empty quarter is now hidden below 480px. Outlook for Windows ignores a maximum width, so there the email is a fixed 800px, and its button shape is 734px. Found 21 Oct 2026.
- **To take into `design/`:** the outer cell's 24px side padding; `.sp-wrap` at 100% with `max-width: 1200px`; the Outlook-only 800px table around it and the 734px button; the card cell's `.sp-pad` (32px, 20px 16px below 632px); `.sp-gap` on the two quarter-width cells, hidden below 480px. Then `api/src/emails/ask-chat.html` is a copy again, `ask-chat.html` leaves `EMAIL_FIXES`, and this entry goes.

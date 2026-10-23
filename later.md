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

## For Claude Design: the order search's Ask button on a phone

- **Where:** `react/src/styles/app.css`, the rule under "on touch a field-end button's ::after is its
  press area". Order list 2b, Mobile screens 7a.
- **What the reader sees:** after a tap on Ask, the button showed as one dark box, with no mark.
- **What was found:** `.sp-touch .sp-field__trails > .sp-field__trail::after` draws the 44px press
  area with `::after`, which the tooltip (`[data-tip]::after`, c18) also uses. On touch the tapped
  button keeps `:hover`, so the tip's dark chip filled the press area, and the tip's
  `pointer-events: none` made the area let taps through. Found 23 Oct 2026.
- **To take into `design/`:** on touch, a field-end button's `::after` carries no tip: no padding,
  border or background, `position: absolute`, `pointer-events: auto`. Then the app's rule and this
  entry go.

## For Claude Design: the order search's end buttons sit close to the edge on a phone

- **Where:** `react/src/styles/app.css`, the rules under "on touch a field's end buttons keep their
  drawn size". Order list 2b, Mobile screens 7a.
- **What the reader sees:** on a phone the Ask button had less space on its right than above and
  below it.
- **What was found:** `.sp-field__trails` sits `--sp-6` from the right at every size, but on touch the
  30px buttons are centred in a 48px field, so they sit 9px from the top and bottom. Found 23 Oct 2026.
- **To take into `design/`:** on touch, `.sp-field__trails` sits `(--control-h-touch - --field-trail) / 2`
  from the right, and `.sp-input--trail-2` pads by the same amount in place of `--sp-6`. Then the
  app's rules and this entry go.

## For Claude Design: touch rules found in an iPhone run

- **Where:** `react/src/styles/app.css`, the five rules at the end of the file, from "on touch a facet
  group's whole head" to "on a phone the status editor wraps". Found 23 Oct 2026, iPhone 15 in WebKit.
- **What the reader saw:**
  - In Filters, a group heading looked 48px tall, but only its 18px line of text opened or closed it.
  - After a tap on an icon or a colour in a category or vendor form, its name stayed on the screen
    in a dark box. A phone keeps `:hover` on the last thing tapped, and the tip shows on `:hover`.
  - On Budget, an amount beside a long row name broke into three lines: "400.", "00", "kr.".
  - On Check a bank statement, "Other amount" was cut off in the four-way switch on a phone.
  - In Settings, Statuses, Rename put the name field, four tones and two buttons on one line: the
    name field was 26px wide, Save was off the screen and the page scrolled sideways.
- **To take into `design/`:**
  - On touch, `.sp-field-group__fold` stretches to the head's height, and its press area takes in
    the legend's padding under it.
  - On touch, `[data-tip]` shows no tip, except on a disabled control and on a field-end button.
  - A `.sp-sum__value` beside a label does not shrink, up to 60% of the row; the label wraps.
  - `.sp-segmented--facet` columns are `minmax(max-content, 1fr)`.
  - Mobile screens draws the status editor on a phone: here it wraps, the name on the first line,
    the tones on the second, the buttons on the third.
  Then the app's rules and this entry go.

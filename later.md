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

## The Storybook's accessibility check finds faults in the components

- **Where:** the stories marked `knownAccessibilityFaults` in `storybook/stories/`. Their test
  reports the faults and does not fail. The Accessibility panel in Storybook lists each one.
- **What the reader sees:** some small grey text is hard to read on a tinted ground, and a screen
  reader is told a few parts in a way it does not expect.
- **What was found:**
  - Grey small text (`--ink-5`, #72716b) is under 4.5:1 on the tinted grounds: 4.06:1 on #eceae4,
    4.32:1 on #f2f1eb, 4.3:1 on #eef1ee, 4.17:1 on #e7efe8 (Card wells, Chat, Choice, Field note,
    List cards, DatePickers).
  - `--ink-4` on the danger tint #f0e6e4 is 4.43:1, and the green #2f7a51 on #eceae4 is 4.33:1.
  - A calendar's days outside the month (#c3c1b8) are 1.8:1 (DatePickers ranges).
  - A NavItem drawn on the page's ground, not the sidebar's, has #7d9186 and #c3d2c8 text on
    #eceae4 (Shell, One Nav Item).
  - The drop zone holds a control inside a control (FileDrop, Drop Zone).
- **Since:** Claude Design darkened `--ink-4`, `--ink-5`, `--green-2` and the calendar's outside days
  on 2026-10-25. The figures above are from before that, so each item needs a new check.
- **Found:** 2026-10-24.

## The whole pages in Storybook have accessibility faults

- **Where:** every story in `storybook/pages/Pages.stories.jsx`, marked `knownAccessibilityFaults`.
- **What the reader sees:** a screen reader reads some rows and buttons by a name that is not the
  words on them, and a few controls sit inside other controls.
- **What was found:**
  - The sidebar's rows ("All orders, 441"), the statistics rows ("Transport, 4,795 kr.") and the
    empty photo box on a bookmark have a name that does not hold the words drawn on them.
  - The lists' last column head (`.sp-col-menu`) is empty (Orders, Vendors, Categories).
  - The line photo's Add box (`label[aria-label="Add the line's photo"]`) and the large marks on the
    order and vendor forms have a role their element may not have, and hold a control inside a
    control.
  - The grey text in a bookmark's empty photo box and its address line is under 4.5:1.
- **Found:** 2026-10-24.

## Claude Design's own reorder code lacks the tilt, the landing line and the 4px start

- **Where:** `design/react_handoff/Reorder.jsx` against `react/src/components/Reorder.jsx`, and the
  carried-row rule in `react/src/styles/app.css`. Listed in `storybook/design-differences.json`.
- **What the reader sees:** in the app, a row dragged by its handle tilts, a 2px green line sits just
  above it where it lands, and a drag starts after 4px, as Components c1, Ordering by hand, draws
  and describes. Claude Design's own code does none of the three.
- **What was found:** the drag writes its own `transform` on the row, which overrides the drawn
  `transform: rotate(-0.6deg)`; app.css tilts with the separate `rotate` property instead. The drag
  library's own start distance is 3px; the app asks for 4px. `ReorderList` never drew `Insertion`;
  the app draws it as c1 places it. Built at Carsten's request; Claude Design should take all three
  into `design/`, and React components (Motion) should drop "The insertion line is gone", which
  Carsten decided against.
- **Found:** 2026-10-25.

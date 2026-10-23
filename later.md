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

## For Claude Design: a field's end buttons sit close to the edge on a phone

- **Where:** `react/src/styles/app.css`, the rules under "on touch a field's end buttons keep their
  drawn size". Order list 2b, Mobile screens 7a, the Ask page's chat field and every search field.
- **What the reader sees:** on a phone an end button (Ask, clear, the Ask page's help) had less space
  on its right than above and below it, and a search field's clear button sat high.
- **What was found:** `.sp-field__trail` and `.sp-field__trails` sit `--sp-6` from the right, and a
  search field's single button `--sp-6` from the top, at every size. On touch the field is 48px and the
  button 30px, so the even inset is 9px. Found 23 Oct 2026.
- **To take into `design/`:** on touch, an end button or group sits `(--control-h-touch - --field-trail) / 2`
  from the right, a button not centred by its field sits the same from the top, and `.sp-input--trail`,
  `.sp-input--trail-2` and the chat field pad by that amount in place of `--sp-6`. Then the app's rules
  and this entry go.

## For Claude Design: Ask in a search field keeps its hover colour after a tap

- **Where:** `react/src/styles/app.css`, the rule under "a touch screen keeps a tapped button hovered".
  Order list 2b.
- **What the reader sees:** on a phone, after a tap on Ask, it showed the lighter hover green, not the
  green it has when on, until the next tap somewhere else.
- **What was found:** a touch screen keeps `:hover` on the last tapped element. Other controls hover
  only under `@media (hover: hover)` (21b); `.sp-field__trail--ask` does not. Found 23 Oct 2026.
- **To take into `design/`:** the Ask button's hover rules sit under `@media (hover: hover)`. Then the
  app's rules and this entry go.

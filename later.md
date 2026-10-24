# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## The Files Docs page in Storybook opens under the file viewer

- **Where:** Storybook, Fields/Files, the Docs page (`storybook/stories/FileDrop.stories.jsx`, the
  viewer story).
- **What the reader sees:** the viewer story starts open, so on the Docs page its dark box covers the
  props table and the other examples until it is closed.
- **Proposed shape:** draw that story closed in the Docs page, or inline there, as other stories that
  open over the page do.
- **Found:** 2026-10-24.

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
- **What the reader sees:** a screen reader names some parts wrongly or not at all.
- **What was found:**
  - `Mark` puts `aria-label` on a `span` with no role, so the name is not read out
    (`Mark.jsx`; the Fills, Gone, Empty states and Attachment strip stories).
  - The combobox panel is a `listbox` whose children are `li` around `button role="option"`, and
    its group heads are `li` too: a listbox may hold only options and groups (`Combobox.jsx`).
  - The custom colour in `Picker` is a `label` with `aria-pressed`, which a label cannot carry
    (`Choice.jsx`).
  - The search palette is a dialog with no name (`Palette` in `Shell.jsx`).
  - The account button's name does not contain the words drawn on it (`SidebarAccount` in
    `Shell.jsx`, with the name the Shell story passes).
- **Found:** 2026-10-24.

## A toast's grey text keeps the old grey

- **Where:** `react/src/styles/app.css`, `.sp-toast { --ink-5 }`; a toast's countdown (`Toast` `seconds`).
- **What the reader sees:** nothing changes: the countdown keeps the grey it had.
- **What was found:** the lighter-ground `--ink-5` (#72716b) is 3.55:1 on the light theme's dark
  toast (#1b1a17), under 4.5:1. The app keeps #8b8a82 (5.02:1) inside a toast. The rule to take into
  `design/`: grey small text on a toast uses a grey made for its dark ground. In the dark theme the
  toast's grey (#90897e on #2e2b26) is 4.07:1, also under 4.5:1. Sent to Claude Design.
- **Found:** 2026-10-24.

## Dialogs, sheets and popovers close at once, and the account row is still its own

- **Where:** `Dialog`, `Sheet` and `Popover` in `react/src/components/`; `SidebarAccount` in
  `react/src/components/Shell.jsx`.
- **What the reader sees:** these three open with the design's motion but close at once. The account
  row looks as designed.
- **What was found:** the design asks for a closing fade held with `data-leaving`, but a page removes
  these parts at once, and the design does not say how a part stays on screen while it fades. It
  also asks that `SidebarAccount` be a `NavItem` with a `control`, but does not say which part is
  the button. Both are asked in the brief to Claude Design.
- **Found:** 2026-10-24.

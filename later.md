# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## The design's components take narrower settings in the app

- **Where:** `design/react_handoff/*.jsx` against `react/src/components/*.jsx`, in their type comments.
- **What the reader sees:** nothing in the app. In Storybook, each setting has a control and a
  description. The design's copies still type the settings below as any part, and most of their
  settings have no description.
- **What was found:** the app takes one kind of value where every caller passes one kind:
  - text: Field `unit` and `kbd`, SearchInput `kbd`, FileDrop `action`, Record `more`, and the
    facet count of a FieldGroup, which is "24 total" rather than a number;
  - an icon name: Field `lead`, Picker `customIcon`;
  - an icon name or a drawn icon: `chevron` on Card, Toolbar, SumHead and ListItem;
  - on or off: Field `chevron`, the drag `handle` on ListItem and NavItem;
  - the flags Field hands its control (`lead`, `trail`, `unit` on Combobox and Slot) are on or off.
  A setting that holds only other parts is typed `ReactElement`, and one that takes words is
  `ReactNode`, so Storybook knows which one gets a text box.
- **Proposed shape:** Claude Design takes the same types and the descriptions into `design/`.
- **Found:** 2026-10-24.

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

## The design's React specimens pass a prop the combobox does not take

- **Where:** `design/React components.dc.html`, the searchable combobox specimen.
- **What the reader sees:** nothing; the chevron is drawn by the combobox itself either way.
- **What was found:** the specimen passes `chevron`, which neither `design/react_handoff/Combobox.jsx`
  nor `react/src/components/Combobox.jsx` takes, so it lands on the box as a stray attribute. The
  story in `storybook/stories/Combobox.stories.jsx` leaves it out. A note for the next Claude Design brief.
- **Found:** 2026-10-24.

## The Storybook's accessibility check finds faults in the components

- **Where:** the stories marked `knownAccessibilityFaults` in `storybook/stories/`. Their test
  reports the faults and does not fail. The Accessibility panel in Storybook lists each one.
- **What the reader sees:** grey small text is hard to read for someone with weak sight, and a
  screen reader names some parts wrongly or not at all.
- **What was found:**
  - The grey text (`--ink-5`, #8b8a82 on white) has a contrast of 3.46:1. The standard asks for
    4.5:1 for text this small. It is the meta lines, section labels, units, axis ticks and group
    heads, and it fails in 37 stories. It is a token, so it is a question for `design/`.
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

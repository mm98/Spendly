# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## Account card: the name is a smaller text style than the drawing

- **Where:** the account card at the top of More and of Settings, against Mobile screens.
- **What the reader sees:** the name in a title or body text style. The drawing uses the heading
  style.
- **What was found:** 15 October 2026, while fixing the gap in the same card. Not changed there.

## design/README.md: four open questions from the old overview are not in the new one

- **Where:** `design/README.md`, the section Known and open.
- **What the reader sees:** nothing in the app. The design's list of open questions is shorter.
- **What was found:** 17 October 2026, comparing the new overview with the last full one (commit
  2eea677). Claude Design asked to confirm that nothing is missing. The settled rules from the old
  text are all still written on the pages or in `styles/COMPONENT-STATUS.md`. These open questions
  are not written anywhere in `design/` now:
  - at the 280px card width, three card heads do not fit on one line: Showing, Spend by month and
    Categories this month;
  - four groups of variants mix structure and colour: `Combobox`, `Menu`, `ListItem`, `TextField`;
  - `Mark` has three fills that draw almost nothing: `plain`, `none`, `empty`;
  - the list behaviours that are not built: moving between rows with the keyboard, choosing a whole
    filter, and a long press on a touch screen.
- **Why not now:** `design/` is changed only through Claude Design.

## Mobile screens: a comment still says the scan choices are 6 apart

- **Where:** `design/styles/pages/mobile-screens.css`, the comment on `.ms-device .sp-stack`.
- **What the reader sees:** nothing on screen. The comment says the scan choices keep a gap of 6.
  The drawings in Mobile screens 7a and Order create 3a now draw them as a title and its second
  line, 2 apart, and the app shows them that way.
- **What was found:** 17 October 2026, in the upload that answered the import and statuses brief.
- **Why not now:** a comment in `design/`, changed only through Claude Design.

## Previous imports on a phone: a file name is cut short beside Undo and Reuse mapping

- **Where:** Settings > Import > Previous imports, on a phone (iPhone 15 width).
- **What the reader sees:** a line from the last 24 hours with saved column choices has Undo and
  Reuse mapping beside its name. The name is cut to its first few letters ("webshop-…"). Nothing
  runs off the screen.
- **What was found:** 17 October 2026, while building the outline Undo of 11b. Settings and import
  11b draws Previous imports at desktop width only, and Mobile screens does not draw it. A question
  for Claude Design: how this line looks on a phone.
- **Why not now:** no drawing covers it; `design/` is changed only through Claude Design.

# Problems

Small problems that are known but not urgent. Each one says where it is, what the reader sees,
what was measured and when. An entry is removed in the change that fixes it.

## The design: the Categories field moves its first row, so the bulb is 1-2px off it

- **Where:** the Categories field on a new or edited order, which follows the design's field that
  holds several values (c3).
- **What the reader sees:** on a computer, the field grows 2px taller when the first category is
  added, so everything under it moves down 2px, and the bulb sits 1px above the middle of the
  categories. On a phone, when the categories fill more than one line, the first line moves up
  2px and the bulb sits 2px below its middle.
- **Measured:** 9 October 2026, in Chrome at 1440px and in WebKit with the iPhone 15 profile. On a
  computer the field is 42px empty and 44px with one category; the middle of the categories is
  22px from the field's top, the bulb's 21px. On a phone the middle of the first line is 24px with
  one line and 22px with several; the bulb's is 24px.
- **Why not urgent:** the offset is 1-2px, and the app copies the design's rules for this field
  unchanged, so the fix belongs in the design first.

## Settings: a choice shows its old value for a moment after Save

- **Where:** every select on the Settings page, for example Rows per page in Lists.
- **What the reader sees:** after Save, the select goes back to the value it had before for two or
  three frames, then shows the new value again.
- **Measured:** 11 October 2026, in Chrome at 1440px, reading the select on every frame after Save.
  Rows per page set from 10 to 25 showed "10 rows" for 33ms. Recent orders on Home showed the old
  value for 26-39ms in three tries.
- **Why not urgent:** the saved value is right, and the old one shows for a fraction of a second.

## The server: a scanned receipt is stored twice for a day

- **Where:** saving an order from a scan. The picture is copied onto the order, and the scan keeps
  its own copy until it expires 24 hours after it was last used.
- **What the reader sees:** nothing on screen. The database holds two copies of every receipt
  scanned in the last day, and the space the second copy used stays in the file as empty space
  until the nightly clean-up.
- **Measured:** 13 October 2026, on the user's database: scans and drafts held 24.7 MB beside
  73.8 MB of order pictures, and 45.8 MB of the 160.9 MB file was empty space.
- **Possible fix:** the order's file points to the scan's row instead of copying its bytes.
- **Why not urgent:** the nightly clean-up gives the space back every night.

## The server: one picture per record is stored in two different ways

- **Where:** a user's picture is in its own table, `user_pictures`, and a vendor's picture in
  `vendor_images`. A bookmark's picture is in columns on `bookmarks`.
- **What the reader sees:** nothing. Each is one picture per record, so columns on `users` and
  `vendors` would do, the way `bookmarks` does it. The separate tables add a lookup and a second
  way of doing the same thing.
- **Measured:** 13 October 2026, on the user's database: `user_pictures` held 0.01 MB and
  `vendor_images` 1.4 MB.
- **Why not urgent:** both ways work, and the cost is a fast lookup by id.

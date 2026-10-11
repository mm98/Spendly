# Problems and adjustments

Small problems and adjustments that are known but not urgent. Each one says where it is, what the
reader sees, what was measured and when. An entry is removed in the change that fixes it.

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

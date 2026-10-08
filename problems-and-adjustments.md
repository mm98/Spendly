# Problems and adjustments

Small problems and adjustments that are known but not urgent. Each one says where it is, what the
reader sees, what was measured and when. An entry is removed in the change that fixes it.

## The order editor: four loading boxes have no width

- **Where:** the order editor, while the order is still loading.
- **What the reader sees:** grey boxes stand where the fields and buttons will be. Four of them do
  not show, because they are 0px wide:
  - the box for the "add a file" tile in the Attachments card, on desktop and on a phone;
  - the two boxes for the buttons in the save bar at the bottom, on a phone.
- **Measured:** 8 October 2026, in Chrome at 1440px and with the iPhone 15 profile, with the
  server's answer held back. The version before the fill shape (#437) has the same four, so they
  are older than that change.
- **Why not urgent:** it only shows while the order loads, and the other loading boxes on the page
  fill their space.
- **Likely cause:** each of these boxes sits in a row that gives it no width of its own, so it
  shrinks to nothing.

## The vendor chart: long names run into each other in a narrower window

- **Where:** Statistics, the vendor chart, in a window about 1000px wide.
- **What the reader sees:** a long vendor name under a bar is no longer cut with "…" at the bar's
  width, so it runs into the next name, by up to 16.5px. A 1440px window and the phone are not
  affected.
- **Measured:** 8 October 2026, in Chrome, on the edge-case account, in 3 of 9 periods.
- **Why:** since the design centres a chart label on one line, a label is as wide as its text. The
  design's own vendor chart only has short names, so it has no rule for cutting a long one.
- **Needs Claude Design:** a name under a bar is cut with "…" at its bar's width, while day, week and
  month labels stay centred and uncut.

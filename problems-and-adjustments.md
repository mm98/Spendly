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

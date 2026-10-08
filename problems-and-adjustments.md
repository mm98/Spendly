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

## The design: old text on Statistics still ties cards to a month

- **Where:** `design/Order statistics.dc.html` and `design/Mobile screens.dc.html`.
- **What the reader sees:** the new rule in 4a says every card follows the period. Some old text
  and drawings still say the opposite:
  - 4a and 4g: the note "By category, Top vendors and Monthly limit show the current month".
  - 4a and 4g: two notes still call the card "Monthly limit". Its name is now "Limits".
  - 4c (the year 2026, one category): "Against the limit" reads "August, over", and "By month,
    against the limit" draws three months. The app shows the whole period: "2026, under", and
    every month up to today, newest first, eight at rest with "Show all N months".
  - 7a (phone, the year 2026): "Top vendors, August".
- **Found:** 8 October 2026, while building "every card follows the period".
- **Why not urgent:** the app follows the new rule. Only the design text is old.

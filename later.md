# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## Settings: Returned and Cancelled are drawn as deletable, but stay built in

- **Where:** Settings > Statuses, against the drawing in Settings and import 11a.
- **What the reader sees:** the drawing marks only Draft "built in" and gives Cancelled, with no
  orders, a delete button. The app marks Draft, Ordered, Delivered, Returned and Cancelled "built
  in", and none of them can be deleted.
- **What was found:** 14 October 2026, reading the app and the server. The app knows Returned and
  Cancelled by what they mean, not by their name, and that is lost when one is deleted. A status
  added later with the same name does not bring it back. After a delete:
  - a scanned return receipt is filed under the default status, usually Delivered, and counts as
    spending;
  - Fill with demo data still makes Returned orders, which then count as spending;
  - an import matches the status by name, so a new "Cancelled" counts as spending and is not struck
    out;
  - an order that was once Returned keeps a history line for the deleted status.

  Statistics and the vendor page already cope with a missing Returned.
- **Why not now:** the app is safe as it is. The drawing is what is out of date, and that is
  Claude Design's to change: Returned and Cancelled marked "built in", and no delete button on
  Cancelled.

## Home: two cards read the whole statistics answer for a few numbers

- **Where:** Home's "Last 8 months" card and its month card (`react/src/pages/Home.jsx`).
- **What the reader sees:** nothing wrong, but Home is the first page most visits open, and it
  waits for both answers.
- **What was found:** 14 October 2026, on the edge-case account. "Last 8 months" reads the year's
  statistics, 54 kB with every day's running total, to draw 8 bars and one average. The month card
  reads the month's statistics, 25 kB, for its sums and its top categories. Both are the answers the
  Statistics page reads in full.
- **Why not now:** it is a change to the statistics routes, which is its own piece of work: a small
  answer with the 8 months' totals, and a month summary without the daily series.

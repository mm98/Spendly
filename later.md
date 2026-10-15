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

## design/README.md now holds one handoff note instead of the design system's overview

- **Where:** `design/README.md`.
- **What the reader sees:** the file describes only the Needs a look and Drafts swap on Home. The
  overview it held before (what each file in `design/` is, the state of the checks, the settled
  rules for card heads, rows that open, and the copy conventions) is gone from the folder.
- **What was found:** 15 October 2026, in the upload that answered the Home card order brief. The
  upload replaced the whole file rather than adding a note beside it.
- **Why not now:** `design/` is changed only through Claude Design. The old text is in git history
  (the commit before "Add files via upload" on 15 October) if Claude Design wants it back.

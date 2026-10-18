# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## 51 of the design's checks are not held against the app

Found 2026-10-17, in `react/scripts/check-design.mjs`. Of the 110 rules in `design/styles/check.js`,
51 apply to the app's own source but are only checked on the design's pages. They are the entries
marked `NOT_CHECKED` in `DESIGN_RULES`. A fault one of them describes reaches the app unseen, as the
amounts that did not line up in Statistics did. Each one ported is moved from `NOT_CHECKED` to the
name of its rule here.

## Demo data counts returned orders as spending

Found 2026-10-18, in `api/src/lib/demoData.js`. "Fill with demo data" turns the orders triggers off
while it writes, and `storeColumns` does not set `status_type` when they come back. Every demo order
keeps the type `custom`, so Home, Statistics and the status email count returned orders as spent
and show 0 delivered. Accounts with real orders are not affected.

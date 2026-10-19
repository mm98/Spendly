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

## A category cannot be marked as a favourite

Found 2026-10-19, in `react/src/pages/CategoryForm.jsx`. Pickers list favourite categories first, and
demo data makes three of them, but the category page has no control to mark one. Vendors have it.
A person can never set or clear a favourite category.

## The order form promises an order number nobody sees

Found 2026-10-19, in `react/src/pages/OrderForm.jsx`. A comment beside Reference says an order without
one "is given the next order number". Every order gets a number (`api/src/migrations/250_order_number.sql`),
but no page shows it.

## Search finds categories and bookmarks but does not show them

Found 2026-10-19. `api/src/routes/search.js` returns categories and bookmarks, and
`react/src/app/Palette.jsx` draws only orders, vendors, items and actions. The server does work the
page throws away.

## A saved view's warning colour has no control

Found 2026-10-19, in `api/src/routes/views.js`. The server can show a view's count in amber, but
nothing in the app turns it on.

## The privacy notice does not name the exchange-rate lookup

Found 2026-10-19, in `react/src/pages/Notices.jsx`. A receipt in another currency sends its currency
and date to api.frankfurter.dev for that day's rate. The privacy page names the receipt reader and
email, not this.

## Categories with equal spend sort by their generated ids

Found 2026-10-19, in `api/src/lib/stats.js` (`ORDER BY spend DESC`, no second key). Two categories
that spent the same amount keep one order inside an account, but which comes first is decided by
their ids. It makes the Statistics screenshot change between two renders on one day. A name as the
second key would fix both.

## Changing the password in Settings keeps other sign-ins open

Found 2026-10-19, in `api/src/routes/profile.js`. A sign-in someone stole keeps working after the
owner changes the password in Settings. `design/Actions inventory.dc.html` asks for exactly this
("other sessions stay signed in"), so a change needs Claude Design first. Adding a passkey also
needs no password, so a short visit to an open session can leave a passkey behind.

## One account can slow down or stop the server for everyone

Found 2026-10-19. One request can hold the server's memory or time far beyond its share:
- an item photo upload takes any number of files (`api/src/routes/orders.js`, the `upload` limits);
- the large import body is read before the sign-in check (`api/src/app.js`, `importJson`);
- an import check with many new vendor names rereads every vendor per name (`api/src/lib/findOrCreate.js`);
- saved drafts and copied photos have no limit, and deleting an order holds every photo in memory
  (`api/src/routes/drafts.js`, `api/src/lib/orderTrash.js`);
- "Fill with demo data" without the progress stream blocks the server while it writes.

## Bookmark previews can reach the home network

Found 2026-10-19, in `api/src/lib/pageTitle.js`. The address is checked, then looked up again by the
fetch, and the second answer can be a private address. The check belongs in the connection itself.

## Paid reading and sign-in have no limit per person

Found 2026-10-19. Receipt reading (`api/src/routes/scan.js`) and category suggestions
(`api/src/routes/categories.js`, which does not need a confirmed email) can be used without limit.
Nothing limits sign-in, register or reset per visitor, so anyone can keep an account locked or send
reset emails to an address every minute (`api/src/routes/auth.js`).

## Requests from a sibling site can act for a signed-in user

Found 2026-10-19. The only guard is the cookie's SameSite setting, which lets other pages on the same
domain through. A check of `Origin` against `SPENDLY_PUBLIC_URL` on every change would close it.

## Smaller faults in files

Found 2026-10-19, in `api/src/routes/orders.js` and `api/src/lib/images.js`. An imported attachment
keeps the type the import file claims and skips the 25 MB limit, so a web page can be shown from
Spendly's own address. A file name with "€" or emoji cannot be opened: the download answers an error.

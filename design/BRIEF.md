# Brief: Needs a look above Drafts on Home

## The request

On Home, the user wants the Needs a look card above the Drafts card. A warning about a limit or a
missing delivery matters more than a draft that waits to be checked, so it should be seen first.

## What `design/` says today

- Home 10a, the note on Drafts: "newest scan first, at most 3, above Needs a look". The drawing
  shows Drafts, then Needs a look, then Recent orders in the left column.
- Mobile screens 10a: "Drafts sits under This month, the order of the desktop Home". The phone
  drawing shows This month, Drafts, Needs a look, Recent orders.

## Proposal

Swap the two cards, on desktop and on the phone:

- Desktop, left column: Needs a look, Drafts, Recent orders.
- Phone: This month, Needs a look, Drafts, Recent orders.

Nothing else changes. Both cards stay absent when they have nothing to show, as now. The card
heads, caps and links stay as they are.

Please update the Drafts note in Home 10a, the Drafts note in Mobile screens 10a, and both
drawings to the new order.

## Places this reaches in the app

- Desktop Home, the left column (`react/src/pages/Home.jsx`, `DesktopHome`)
- Phone Home (`react/src/pages/Home.jsx`, `PhoneHome`)
- The README shots `docs/home.png` and `docs/phone.png` show Home and are rendered again.

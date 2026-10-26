# Offers are only in Ask

Answers the brief: remove Check offers and the offer settings, on the order, in Settings and on vendors and categories. Offers are found only by asking in Ask.

## 1. Offers leave the order

**The problem.** A grocery order carried its own offer lookup: Check offers in the Items card head with five head states, an offer tag on each matching line opening a popover (a sheet on a phone), and an "At this week's offers" row in Totals. Offers will only be looked up in Ask.

**What changed.** An order shows no offers. The Items card head, the line rows and Totals are as on any other order. A new order from a scan shows none either.

**Where.**
- `Order editing layouts 1a`: the specimen "A grocery order, offers checked, one opened", the three popover specimens, the five card-head states and the notes "This week's grocery offers" removed.
- `Order editing layouts 1c`: the specimen "Grocery order · an offer tapped" (the rows with tags and the offer sheet) removed.
- `Order create 3a`: the note "Grocery offers before the order is created" removed.
- App: `react/src/pages/Order.jsx`, `react/src/pages/OrderForm.jsx` and the scan's line list lose Check offers, the `OfferTag`, its popover and sheet, and the Totals row; the order's offer check endpoint and its hour's cache go with them.

**What is still open.** Nothing.

## 2. The Offers settings go

**The problem.** Settings had an Offers pane (one card per source, with Vendors and Categories picks deciding which orders got Check offers), drawn on desktop and as its own phone screen, and each vendor and category had an Offers card with "Check Tilbudsugen offers". With no Check offers there is nothing for them to set.

**What changed.** No Offers pane, no Offers row in the phone's Settings list, no Offers card on a vendor or a category. Ask's offers search every shop the source covers, as before, and need no setting.

**Where.**
- `Settings and import 11a`: "Offers" removed from the settings menu, the Tilbudsugen card and the "Offers · nothing picked" and "Offers · account in euros" states removed, the six Offers notes removed.
- `Mobile screens`: the Offers row in the Settings list, the Offers screen (11a) and the note "Offers on a phone" removed.
- `Vendors and categories 5c` and the category edit page: the Offers card and its note removed from both.
- App: the Offers settings pane and its phone route, the Offers card on the vendor and category edit pages, and the stored picks (`api/src/offers/`, "picks") go. A source is offered to Ask by currency alone.

**What is still open.** Nothing.

## 3. The control slot beside the part that opens goes

**The problem.** `ListItem`'s `control` and `end` props, and `.sp-list-item__control`, existed only for the offer tag. A part with no use is a component Claude Code would keep building.

**What changed.** The slot is removed. A row that opens is the whole row again, or the handle and the open target side by side when it can be moved.

**Where.**
- `Components c15`: the specimen "A row that opens, with one control beside it" and its note removed.
- `styles/components.css`: `.sp-list-item__control`, `.sp-list-item:has(> .sp-list-item__control)` and `.sp-list-item:has(> .sp-list-item__control .sp-popover)` removed.
- `react_handoff/ListItem.jsx`: `control` and `end` removed from the props, the JSDoc and both render paths. App: `react/src/components/ListItem.jsx` the same.

**What is still open.** Nothing.

## 4. The touch rule for a panel that only shows something goes

**The problem.** `Components c25` said a panel with no Apply opens as a sheet on touch, with the offer as its only example. No such panel is left.

**What changed.** The note is removed. A popover on touch follows the rest of c25 as before.

**Where.** `Components c25`, the note "A panel that only shows something". App: the touch branch that turned the offer popover into a sheet goes with the `OfferTag`.

**What is still open.** Nothing.

## 5. What stays, and the notes that named the removed parts

Ask's offers (`Ask Spendly 24d` 11 to 14, `Mobile screens` Ask - this week's offers, the email of a chat) are unchanged. They keep the shop's place (`sp-mark--logo`, c2) and the link out (`sp-link-out`, c28), whose notes now name only the Ask offer row. The Ask note "A question about prices this week" no longer refers to the order's Check offers.

**Where.** `Components c2` and `c28` notes; `Ask Spendly 24d`.

## later.md

None of the entries on main or `feat/offer-source-picks` are settled by this. "A deleted record should not be removed for good at once" was left out, as asked; "Large accounts still make everyone wait on a few pages" is server work.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Order editing layouts.dc.html` - 1a and 1c without offers.
- `Order create.dc.html` - 3a note removed.
- `Settings and import.dc.html` - 11a without the Offers pane.
- `Vendors and categories.dc.html` - vendor and category edit pages without the Offers card.
- `Mobile screens.dc.html` - Settings list and Offers screen.
- `Components.dc.html` - c2, c15, c25, c28.
- `Ask Spendly.dc.html` - 24d note.
- `react_handoff/ListItem.jsx` - without `control` and `end`.
- `assets/shop-logo.svg` - the logo stand-in the Ask offer rows draw.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets; `components.css` loses the control slot rules.
- `styles/pages/order-editing.css`, `styles/pages/order-create.css`, `styles/pages/settings.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/ask-spendly.css` - the page stylesheets these pages link.

## styles/check.js

0 finding(s) across 27 pages.

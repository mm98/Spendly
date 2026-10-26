# Choose which vendors and categories each offer source checks

## Fixed from handoff_offer_sources

- **The problem:** the lede of `Settings and import 11a` still said "Twelve panes", though the sub-navigation now lists thirteen with Offers.
- **What changed:** it reads "Thirteen panes".
- **Where:** `Settings and import 11a`, the section lede.

Answers "Brief: choose which vendors and categories each offer source checks".

## 1. Where it lives

- **The problem:** an order gets Check offers only when its vendor is a grocery chain Tilbudsugen knows by name. The reader cannot add a local baker or an online grocer, or remove a chain.
- **What changed:** a new Settings pane, **Offers**, after Needs a look. It holds one card per offer source, headed by the source's name and what it covers: "TILBUDSUGEN", "Groceries in Denmark". A new source adds one more card of the same shape. Under the head: "Orders from the last 7 days get Check offers when their vendor or one of their categories is picked here. Every shop Tilbudsugen covers is searched." Changes go through the pane's save bar, as in Statuses.
- **Where:** `Settings and import 11a` (sub-navigation item and the Tilbudsugen card). `react/src/pages/Settings.jsx`: add the section.
- **What is still open:** nothing.

## 2. How vendors and categories are picked

- **The problem:** a reader can have many vendors and categories, so the picker must search on the server.
- **What changed:** each card has two fields, Vendors and Categories, each with its count beside the label. Above the picked ones is the search field ("Add a vendor…", "Add a category…"); typing searches on the server and opens the Combobox panel under it, already picked ones left out. A picked one is a list row: its mark, its name, and Remove (`sp-list-item__remove`, an X icon button) at the tail, shown on hover or focus and always on touch. Five rows show; past five, a small outline button "Show all 9" opens the rest in place and goes away.
- At first Vendors holds the vendors Tilbudsugen knows by name or alias (Netto, Rema 1000, Føtex...), so it works with no setup; Categories starts empty. A removed vendor stays removed.
- **Where:** `Settings and import 11a`. Components reused: `sp-picker__search`, `sp-list-item`, `sp-mark--medium`, Combobox panel, `sp-btn--outline sp-btn--small`. No new component and no CSS change.
- **What is still open:** nothing.

## 3. Nothing picked

- **What changed:** both fields empty, and one grey line (`sp-meta`) under them: "No orders are checked against Tilbudsugen." No order shows Check offers for that source; the order page draws nothing in its place, as today for an unknown vendor.
- **Where:** `Settings and import 11a`, specimen "OFFERS · NOTHING PICKED". `react/src/pages/Order.jsx`, `OrderForm.jsx`: no drawing change.
- **What is still open:** nothing.

## 4. The vendor page and the category form

- **What changed:** a new last card, **OFFERS**, with one switch per source: "Check Tilbudsugen offers", help "Orders from this vendor (in this category) from the last 7 days get Check offers, against this week's offers in every shop Tilbudsugen covers." It is the same pick as the row in Settings, Offers: on adds it there, off removes it, and it saves with the page. A vendor Tilbudsugen knows by name starts on; every other vendor and every category starts off. The create pages carry the same card, off. The switch markup is the "Leave out of statistics" switch's.
- **Where:** `Vendors and categories 5c` (vendor edit) and `5f` (category edit), with notes; `5b` and `5e` by note. `react/src/pages/vendorsCategories.jsx`, the vendor page, `react/src/pages/CategoryForm.jsx`.
- **What is still open:** nothing.

## 5. An account in another currency

- **What changed:** the Offers pane still shows the card, with its head and one line: "Tilbudsugen works only for accounts kept in Danish kroner." No fields. The picks are kept and come back if the account changes to Danish kroner. The vendor and category pages show no Offers card for such an account.
- **Where:** `Settings and import 11a`, specimen "OFFERS · ACCOUNT IN EUROS".
- **What is still open:** nothing.

## 6. Phone

- **What changed:** Offers is a row in the phone's Settings list after Limit alerts, opening its own screen with the desktop card unchanged.
- **Where:** `Mobile screens 7a`, the Settings list and the new Offers phone screen beside AI assistants.
- **What is still open:** the phone's Settings list has no Needs a look row, though the desktop pane exists. Not changed here; please confirm it should be added.

## later.md

None of its entries are settled by this package. On the user's answer:

- "An offer's panel on a phone hangs from its row, not its tag" and "A phone's line row cannot carry an offer's tag while the row opens the line" were left for later by the user. Please keep both in later.md.
- "A deleted record should not be removed for good at once": where "Recently deleted" lives is left for a later brief.
- "Large accounts still make everyone wait" and "An offer's picture was never seen loading" are not design work.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - 11a: Offers pane, its states and notes.
- `Vendors and categories.dc.html` - 5c and 5f: the Offers card and notes.
- `Mobile screens.dc.html` - 7a: the Offers row and phone screen.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - unchanged, loaded by the pages.
- `styles/pages/settings.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - unchanged, linked by the pages.

## styles/check.js

Run on the three changed pages: no findings for them. The full run timed out in the sandbox, so it ran on those pages alone; its one finding, "the start page counts the screens", comes from that subset (index.html counts 105 screens across all pages), and no screen badge was added or removed.

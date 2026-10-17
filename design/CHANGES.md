# A vendor default for Leave out of statistics

Brief: each order can be left out of statistics. Whether an order is left out usually depends on its vendor, so the vendor should carry the default.

All questions were answered in the design chat. Nothing is open.

## 1. The vendor carries the default

**The problem** - Leave out of statistics was set per order only (Order editing layouts 1d, Order create 3a). For a vendor of one-off purchases, like a car dealer, the user had to remember to turn it on for every order.

**What changed** - The vendor's Defaults for its orders card has a second field, under Default categories: the switch "Leave out of statistics", off by default. Help text: "For a vendor of one-off purchases, like a car dealer. A new order from this vendor starts with Leave out of statistics on, and you can still change it on the order." It is the same field as the order's switch (`sp-switch` with an `sp-data` label and `sp-field__help`). No component changed.

**Where** - Vendors and categories 5b (create) and 5c (edit). Mobile screens, vendor edit. The vendor model gets a boolean, default false.

## 2. How a new order takes it

**The problem** - With a vendor default, the order screen needs a rule for when the vendor sets the switch and when it doesn't.

**What changed** - Choosing a vendor on a new order sets the order's switch to the vendor's value. This applies to an order typed by hand and to one proposed from a scan. Once the user touches the switch on the order, the order's value is the user's, and changing the vendor afterwards leaves it as it is. An untouched switch follows the vendor, so changing to a vendor with the default off turns it back off. The order shows no line saying the vendor set it; the switch shows its state and nothing more. Editing a saved order and changing its vendor does not reset the switch.

**Where** - Vendors and categories 5l (notes). Order create 3a (note on Leave out of statistics). Track a "touched" flag on the order form, as 5l already does for categories that came in as suggestions.

## 3. Changing the default on a vendor with orders

**The problem** - Turning the default on later could change past statistics without warning.

**What changed** - The default applies to new orders only. Saved orders are not changed, and nothing asks. Save saves the vendor and nothing else.

**Where** - Vendors and categories 5l.

## 4. Import, scan and copies

**What changed** - An order imported or scanned and matched to a vendor takes the vendor's default. A copy of an order keeps the source order's value, not the vendor's default.

**Where** - Settings and import 11b (note on Import 41 orders). Vendors and categories 5l. Duplicate and alerts 8a.

## 5. Where the default is shown

**What changed** - The vendor list does not show it, in rows or cards; it is read on the vendor's page. The vendor summary rail counts every order from the vendor, left out or not. See more in statistics opens Statistics filtered to the vendor, where left-out orders follow the existing rule: excluded unless "Include N left-out orders" is on. When every order in the set is left out, Statistics shows its empty state reading "All 12 orders here are left out of statistics", with the Include switch above it.

**Where** - Vendors and categories 5a and 5c. Order statistics 4a.

## 6. No other vendor defaults

**What changed** - Default categories and Leave out of statistics are the only vendor defaults. Status is not one.

**Where** - Vendors and categories 5l.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Vendors and categories.dc.html` - the switch in 5b and 5c, and notes in 5a, 5c and 5l (items 1-6).
- `Mobile screens.dc.html` - the switch on the phone vendor edit (item 1).
- `Order create.dc.html` - 3a note on how the vendor sets the order's switch (item 2).
- `Order statistics.dc.html` - 4a note on the empty state when every order is left out (item 5).
- `Duplicate and alerts.dc.html` - 8a note that a copy keeps the source's value (item 4).
- `Settings and import.dc.html` - 11b note that imported orders take the default (item 4).
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/pages/budget.css`, `mobile-screens.css`, `order-create.css`, `order-statistics.css`, `duplicate-and-alerts.css`, `settings.css` - linked by the pages above, unchanged.

## styles/check.js

0 finding(s) across 26 pages.

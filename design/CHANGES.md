# A grip takes the finger; remove the old Settings page

The brief: a row's grip let the page scroll on a touch screen, and `design/Settings structure options.dc.html` is still in `design/` after Settings was kept in its earlier layout (11a). Both close an open later.md entry.

## 1. A row's grip takes the finger on a touch screen

- **The problem:** on a phone or tablet, holding a row's grip and moving the finger scrolled the page and let the row go. No list could be reordered by finger: Saved views, Statuses, budget accounts, order lines.
- **What changed:** the grip takes `touch-action: none`, so a finger held on it moves the row and a swipe that starts on it does not scroll the page. A swipe anywhere else on the row still scrolls. Components, Ordering by hand, says so in a new note.
- **Where:** styles/components.css, `.sp-list-item__handle { touch-action: none; }`, beside the handle's touch rules (`-webkit-touch-callout`, `user-select`). Components c1, Ordering by hand. App: remove the copy of the rule from `react/src/styles/app.css`; it reaches every `ReorderList` row (OrderViews.jsx NavItem, SettingsStatuses.jsx, Budget.jsx accounts, OrderForm.jsx lines). The add row's empty grip (`.sp-list-item--add`, hidden) and the sheet line editor's grip (`display: none`) take no finger, so they are unaffected.
- **What is still open:** nothing.

## later.md: A row's grip lets the screen scroll on a touch screen

- Settled by section 1. Remove this entry from later.md.

## 2. Remove Settings structure options.dc.html

- **The problem:** Settings is built in its earlier layout (Settings and import 11a), but `design/Settings structure options.dc.html` (25) still draws the five groups, so a build from `design/` would bring them back.
- **What changed:** the page is no longer part of the design. It is not in this package and not in the project; delete `design/Settings structure options.dc.html`. Settings is Settings and import 11a, unchanged.
- **Where:** `design/Settings structure options.dc.html` (delete).
- **What is still open:** nothing.

## later.md: Settings is built in its earlier layout, not the one in `design/`

- Settled by section 2. Remove this entry from later.md.

## later.md entries left as they are

- **A deleted record should not be removed for good at once:** on hold by the user's choice until they decide to build it. Its "Settled in design/" line points to Settings structure options 25e, which this package removes; the entry itself stays.
- **Large accounts still make everyone wait on a few pages** and **The status guard does not run in project threads:** not design fixes; untouched.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Components.dc.html: Ordering by hand with the touch note.
- support.js, components.js: what the page loads to open.
- styles/tokens.css, styles/doc.css: shared styles, unchanged.
- styles/components.css: adds `touch-action: none` on `.sp-list-item__handle`.
- assets/shop-logo.svg: the logo mark drawn in Components.

## styles/check.js

0 findings across 27 pages.

# Mobile screens made consistent - the fixes

This answers the review of Mobile screens on 25 October 2026: back buttons of different sizes, the Budget year dropdown with no border, not filling its bar, and its chevron in the wrong place, the space beside Edit, and the question whether the phone screens are consistent. It also settles one later.md entry. Take the files in unchanged.

## 1. Every phone uses the touch sizes

- **The problem:** of the 25 phones on Mobile screens, 6 used the touch sizes (`sp-touch`) and 19 drew desktop sizes. So did the phone on Order create and the two on Order editing layouts. The same control was 48px high on one phone and 34px or 42px on the next. Components and Auth already drew every phone with touch sizes.
- **What changed:** every phone frame is `sp-phone sp-touch`. In the app nothing changes: below 640px the touch rules already apply, and these frames now draw what the app does.
- **Where:** Mobile screens (every frame, 10a to 22a), Order create (the phone frame), Order editing layouts (the two phone frames).
- **What is still open:** nothing.

## 2. Back and the page menu keep one size in the phone's top bar

- **The problem:** on touch, the rule that gives every icon button the 48px touch height also reached the top bar, so Back was 48px on the Ask phones (24a, 24c, 24d, 24e, 24f) and 30px on every other phone (11e). The menu beside it grew the same way.
- **What changed:** in `.sp-topbar--touch`, the outline Back is 30px and the page menu 32px on every phone, each inside a 48px (`--control-h-touch`) press area, as an icon button in a card head already is.
- **Where:** Mobile screens, every top bar (1d, 3c, 5b, 11e, 24a, 24c, 24d, 24e, 24f). `styles/components.css`: `.sp-touch .sp-topbar--touch > .sp-icon-btn:not(.sp-icon-btn--small, .sp-icon-btn--field)` (with `::after`), joined to the card head rule, and `.sp-touch .sp-topbar--touch > .sp-icon-btn.sp-icon-btn--outline:not(.sp-icon-btn--small)`. App: `react/src/app/AppShell.jsx` (the phone top bar) needs no change once the stylesheet is taken in.
- **What is still open:** nothing.

## 3. The Budget year is a full dropdown that fills its bar

- **The problem:** the phone Budget bar drew the year as `sp-combobox--bare`, the value and chevron with no field box, so it did not read as a dropdown. It sat at its text width with a spacer after it, so the bar's right side looked loose, and the value was in `sp-title` with the chevron beside it rather than at the box's end.
- **What changed:** the year is the Combobox with its field box, on the existing `sp-combobox--grow` variant (as Filters is on the order list), taking the width Show income and Edit leave. The value is the plain `sp-grow` span, so the chevron sits at the right edge, as on every other Combobox. `sp-combobox--bare` is removed: this was its only use.
- **Where:** Mobile screens 21a, and its first Budget note. `styles/components.css`: `.sp-combobox--bare` removed. `react_handoff/Combobox.jsx`: `bare` removed from `VARIANT`. App: `react/src/pages/Budget.jsx` (the phone bar) passes `variant="grow"` instead of `bare`, and drops the spacer.
- **What is still open:** nothing.

## 4. A button beside a dropdown in a phone bar keeps its width

- **The problem:** on touch every button is full width, so in a bar holding a dropdown and buttons the buttons took the row and the dropdown shrank to nothing. It showed once every phone was touch (5a, 5d, 21a, 22a).
- **What changed:** a button straight inside a card bar keeps its own width on touch, as it already does in the save bar, toolbar and top bar.
- **Where:** Mobile screens 2b, 5a, 5d, 21a, 22a. `styles/components.css`: `.sp-touch .sp-list-item--card > .sp-btn:not(.sp-btn--block)` added to the list of bars whose buttons keep `width: auto`.
- **What is still open:** nothing.

## 5. One Sort dropdown on every phone list

- **The problem:** the Vendors and Categories phones drew Sort with a grey "Sort" label and the value in `sp-title`, and the chevron did not sit at the box's end. The order list phone (2b) draws Sort as the value alone.
- **What changed:** both now draw Sort as the order list does: the value in a plain `sp-grow` span, then the chevron at the right edge.
- **Where:** Mobile screens 5a, 5d. App: `react/src/pages/Vendors.jsx` and `react/src/pages/Categories.jsx` (the phone bar), if they render the label.
- **What is still open:** nothing.

## later.md: "Budget's month wells do not use popLayout"

- **The problem:** the Motion note under Budget 21a built the month wells with `AnimatePresence mode="popLayout"`. popLayout adds a `<style>` element at run time, which the server's CSP refuses, so the app builds them another way and the note was wrong.
- **What changed:** the note now says the wells sit in one grid row, a column each, keyed by month inside `AnimatePresence`, the staying well on `layout="position"`, and a well that leaves keeps its last column, shared with the one taking its place. It says why popLayout is not used, and that nothing in the app may depend on a `<style>` element added at run time.
- **Where:** Budget 21a, Notes for implementation, Motion. App: none, the build already does this. Remove this entry from later.md.
- **What is still open:** nothing.

## later.md: other entries

- "A deleted record should not be removed for good at once": kept for later, at the user's decision.
- "Large accounts still make everyone wait on a few pages": not design work.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Mobile screens.dc.html` - every frame touch, the Budget year, the Sort dropdowns, the Budget note.
- `Order create.dc.html`, `Order editing layouts.dc.html` - their phone frames touch.
- `Budget.dc.html` - the 21a Motion note.
- `react_handoff/Combobox.jsx` - `bare` removed from the variants. It imports its neighbours in `react_handoff/` as before.
- `styles/components.css` - the top bar sizes, the card bar button width, `.sp-combobox--bare` removed.
- `support.js`, `components.js`, `icons.js`, `styles/tokens.css`, `styles/doc.css` - what the pages load, unchanged.
- `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/order-create.css`, `styles/pages/order-editing.css` - what the pages link, unchanged.

Every page's link to `styles/components.css` now carries the version `v20261025k`.

## styles/check.js

0 finding(s) across 27 pages.

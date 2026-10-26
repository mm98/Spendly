# Four parts that moved focus on a timer - the fixes

## Fixed from handoff_focus_without_timers

- **The problem:** in `DateField`, the new `opening` ref and its `useLayoutEffect` sat after the early `if (isNative) return`. When the field switched between the native picker and the calendar (`touch` or `native` changed), React saw a different number of hooks and failed ("Rendered fewer hooks than expected"). The React components page crashed on it. The brief's patch puts them in the same place in `react/src/components/DatePickers.jsx`; it passed only because the desktop test never switched to native.
- **What changed:** both hooks move above the native return, after `usePanelMotion`, as the comment above `useDateText` asks of every hook in `DateField`. The guard `if (!open || !opening.current) return` stays, so the native path does nothing.
- **Where:** `react_handoff/DatePickers.jsx`, `DateField`. Point 3 below. The rest of the package is unchanged.

This answers "Brief: four component parts that wait on timers to move focus" (26 October 2026), its four points. Each fix is in a part in `react_handoff/`. No exported component gains or changes a prop. Take the files in unchanged.

## 1. Filters: focus after a crumb or Clear all is pressed

- **The problem:** `keepFocus` placed focus at 0, 300 and 1000 ms. An answer later than 1000 ms lost focus to the page, and a timer could pull focus back after the reader had moved on.
- **What changed:** as the brief's patch. `keepFocus` keeps its choice for the row (`wantedFocus`), and `Filters` places it each time it is drawn (`useKeptFocus`), until the reader's next press or key outside the row. One addition to the brief: Orders, Categories and Bookmarks draw the row only while a filter is on (`crumbs.length ? <Filters> : null`), so Clear all, or removing the only crumb, takes the row away in the same drawing. The patch as sent then has no drawing of the row left to run in, and focus goes to the page. `useKeptFocus` now also places focus when the row leaves: its cleanup queues the placement for the end of that drawing (`queueMicrotask`), when the row's own controls are gone and the first control after the row is the first one still on the page. That is a step after React's own work, not a wait of a guessed length.
- **Where:** Components c12, Actions note: where focus goes after Remove a chip and Clear all, and that it moves once the list has redrawn. `react_handoff/List.jsx`: `Filters`, `keepFocus`, `useKeptFocus`, `placeFocus`. App: `react/src/components/List.jsx`; it reaches `react/src/pages/Orders.jsx`, `Categories.jsx`, `Bookmarks.jsx` and `Vendors.jsx` (the possible duplicates crumb), which need no change.
- **What is still open:** please confirm on the tested copy: Clear all on Orders with two filters on, and removing the only crumb, each leave focus on the first control after the row. The brief's table has Clear all passing; the case where the row itself goes is the one to repeat. Bookmarks and Vendors are not in the brief's list of places and were not measured.

## 2. The day grid (Month): arrow keys and Page Up/Down

- **The problem:** `go()` waited one frame, and one more after moving the month. On a slow device the new month was not always drawn, and focus stayed behind.
- **What changed:** as the brief's patch. A day already drawn takes focus at once. A day in another month is kept (`wanted`), the month moves, and the day takes focus in the `useLayoutEffect` that runs when that month is drawn.
- **Where:** `react_handoff/DatePickers.jsx`, `Month`. App: `react/src/components/DatePickers.jsx`; reaches `RangePicker` on Statistics and Orders, and `DateField`.
- **What is still open:** nothing.

## 3. DateField: the calendar opened by a click or Alt+Down

- **The problem:** `openTo` opened the calendar and waited one frame to focus the day.
- **What changed:** as the brief's patch, except where the two hooks sit. `openTo` marks the opening (`opening`), and a `useLayoutEffect` on `open` gives focus to the day as the calendar is drawn. Both hooks sit above `if (isNative) return`, not below it as in the patch, so the hook count is the same on both branches.
- **Where:** `react_handoff/DatePickers.jsx`, `DateField`. App: `react/src/components/DatePickers.jsx`; reaches `react/src/pages/OrderForm.jsx` and the Orders date filter.
- **What is still open:** nothing.

## 4. ChatScroll: the edge fades

- **The problem:** the fades were measured at once and again one frame later.
- **What changed:** as the brief's patch. The frame-late measure is gone; the `ResizeObserver` already reports once when it starts watching and on every size change.
- **Where:** `react_handoff/Chat.jsx`, `ChatScroll`. App: `react/src/components/Chat.jsx`; reaches `react/src/pages/Ask.jsx` and `react/src/app/askListFrame.jsx`.
- **What is still open:** nothing.

## later.md

- "A deleted record should not be removed for good at once": kept for later, at the user's decision, as in the last packages. Not changed in this pass.
- "Large accounts still make everyone wait" and "The status guard does not run in project threads" are not design work.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note, the whole note of `handoff_focus_without_timers` with the fix above it.
- `Components.dc.html` - c12, the Actions note on focus.
- `React components.dc.html` - renders `react_handoff/`, so the changed parts can be tried; unchanged.
- `react_handoff/` - every component, as the React components page loads them. Changed: `List.jsx`, `DatePickers.jsx` (again here), `Chat.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - what the pages link, unchanged.

## styles/check.js

Not run to completion: the checker timed out (30 s limit) in this session. No stylesheet and no component's props changed, so the JSDoc assertion is unaffected. A sweep of the changed files for em dashes, en dashes and curly quotes found none.

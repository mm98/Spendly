# Long press on two more parts, the rail head size, and the sidebar row name - the fixes

This answers "Note for Claude Design: long press on two more parts, the rail head size, and the sidebar row name" (25 October 2026), its three points. Each fix is in a part, in `react_handoff/` or `styles/components.css`. Take the files in unchanged.

## 1. Long press on ListItem and Record

- **The problem:** item 8 of the last package gave only `Card` an `onLongPress`. The order list on a phone draws its rows as `ListItem variant="card"`, and Bookmarks and the Cards view draw theirs as `Record`, so neither could open its menu on a long press. Item 8 also named Bookmarks as a `Card variant="row"` list, which it is not.
- **What changed:** `ListItem` and `Record` take the same `onLongPress` as `Card`: held still for 500ms it calls `onLongPress`, 8px of travel first is a scroll and cancels it, the click that ends it opens nothing, and the row opens no context menu, no link preview and selects no text. A pointer is unchanged and keeps its menu button. The three parts share one hook, `useLongPress`, now exported from `Card.jsx`. On `Record` in the Cards view the long press opens the same order menu its menu button opens.
- **Where:** Components c1, Touch note. `react_handoff/Card.jsx` (`useLongPress`, exported), `react_handoff/ListItem.jsx` (`ListItem`, new `onLongPress`), `react_handoff/List.jsx` (`Record`, new `onLongPress`). `styles/components.css`, `.sp-card[data-long-press], .sp-list-item[data-long-press], .sp-record[data-long-press]`. App: `react/src/pages/Orders.jsx` (`OrderCards`, the touch branch), `react/src/pages/Bookmarks.jsx` (the list body) and `react/src/pages/OrderMenu.jsx` (`OrderCard`) pass `onLongPress` to open their record menu.
- **What is still open:** nothing.

## 2. CardHeader draws its actions at xsmall in a rail

- **The problem:** item 11 asked for xsmall buttons in the rail headings, but `CardHeader` drew every action as `Button size="small"` and took no size.
- **What changed:** `CardHeader` takes `actionSize`, `small` (the default) or `xsmall`. The two rail heads pass `actionSize="xsmall"`; every other card head keeps small. Order list already draws the rail heads at xsmall and is unchanged.
- **Where:** React components, CardHeader specimens (a Filters head with `actionSize="xsmall"`). `react_handoff/Card.jsx`, `CardHeader`. App: `react/src/pages/Orders.jsx` (Filters) and `react/src/pages/OrderViews.jsx` (Views) pass `actionSize="xsmall"`. Order attachments, Order compare, Statistics and Home stay as they are.
- **What is still open:** nothing.

## 3. A sidebar row is named by what it draws

- **The problem:** a `NavItem` with words set its own `aria-label` from its words and count ("All orders 18"), but the drawn text reads "All orders18", since the label and the count sit side by side. The check failed "visible text is part of the accessible name" on every sidebar row with a count, and on the account row.
- **What changed:** where the words are drawn, a `NavItem` and `SidebarAccount` set no name, so each is named by what it shows. Only on the rail, where the words are hidden, does the row carry its words and count, or the account's name and email, as its name. The rail is read from the shell: `Shell collapsed`, or a `Sidebar variant="rail"`; a `peek` sidebar shows its words and sets no name. A passed `aria-label` is still refused.
- **Where:** Navigation shell, the first Notes for implementation. `react_handoff/Shell.jsx`: `Shell` and `Sidebar` (a rail context), `NavItem`, `SidebarAccount`. App: `react/src/app/AppShell.jsx` and `react/src/app/views.jsx` need no change once the component is taken in. Storybook's Shell stories and the whole page stories can drop `knownAccessibilityFaults` for this fault.
- **What is still open:** nothing.

## later.md

- "A deleted record should not be removed for good at once": kept for later, at the user's decision. Not changed in this pass.
- The other entries are not design work, or were settled in the last package.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - c1 Touch note.
- `React components.dc.html` - the CardHeader specimen at xsmall. It renders `react_handoff/`.
- `Navigation shell.dc.html` - the note on how a row is named.
- `react_handoff/` - every component, as the React components page loads them. Changed: `Card.jsx`, `ListItem.jsx`, `List.jsx`, `Shell.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/components.css` - the long press rule, widened.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/navigation-shell.css` - what the pages link, unchanged.

Every page's link to `styles/components.css` now carries a new version (`v20261025e`) so the changed rule loads.

## styles/check.js

0 finding(s) across 27 pages.

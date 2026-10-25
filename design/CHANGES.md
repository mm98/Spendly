# Where the app differs from Claude Design - the fixes

This answers "Where the app differs from Claude Design" (25 October 2026), the six gaps and the two contradictions in it. It also covers the later.md entries settled in the same pass and three changes asked for during the pass: the rail buttons on Order list, the Budget month head, and the Budget month motion. Each gap was in Claude Design's own code, which the app copies, so each fix is in `react_handoff/` or `styles/components.css`. Take the files in unchanged.

## 1. A drop-down's arrow points at its list

- **The problem:** the arrow on every drop-down turned up whenever its list opened, also when the list opened below (Sort on Orders, Kind, Status, the vendor and category pickers).
- **What changed:** the arrow stays down for a list below and turns up only for a list placed above. A placed panel is now marked `data-place="up"` whenever it stands above, also when it is lifted out of a clipping box, so its rise runs upward too.
- **Where:** Components c9. `styles/components.css`, the combobox chevron turn (`.sp-combobox:has(> .sp-combobox__panel[data-place="up"])`). `react_handoff/Combobox.jsx`, `usePanelPlace`.
- **What is still open:** nothing.

## 2. Chart bars rise and move

- **The problem:** bars appeared at full height at once and jumped when the period changed (Home, Last 8 months; every bar chart on Statistics). The stylesheet had the rise, but an inline `height` outranks the stylesheet's starting height, and columns keyed by period remounted on every step.
- **What changed:** bars rise from nothing when they first show and move to their new height when the figure changes, over twice `--motion-in` (360ms) on `--ease-enter`. A bar carries its height as `--h`, and columns are keyed by their place.
- **Where:** React components, Motion note under Data. `react_handoff/Data.jsx`, `Bars`. `styles/components.css`, `.sp-bars__bar[style*="--h"]`, `.sp-bars__stack[style*="--h"]` and their `@starting-style`. App: `react/src/pages/Home.jsx` and the Statistics pages need no change once the component is taken in.
- **What is still open:** nothing.

## 3. Hover fades in over 120ms

- **The problem:** hover turned grey at once on every list (Orders, Vendors, Categories, Statuses in Settings, the sidebar, rows on Home).
- **What changed:** `transition: background-color 120ms ease` on table rows and cells, list rows, sidebar rows, the summary rows on Home and Budget, and choice rows, as Order list 2h states.
- **Where:** Order list 2h. `styles/components.css`, the last rule in the file.
- **What is still open:** nothing.

## 4. Scrolling closes an open list or menu

- **The problem:** an open list or row menu stayed open and moved with the page.
- **What changed:** a scroll of the page under an open list or menu closes it, as its own button would. A scroll inside the panel does not. A scroll in the first 150ms after it opens doesn't close it either, since that one comes from focus being brought into view. A resize still places it again.
- **Where:** Components c9. `react_handoff/Combobox.jsx`, `usePanelPlace` (new `onAway`), both Combobox calls. `react_handoff/Overlays.jsx`, `useMenuPlace`.
- **What is still open:** nothing.

## 5. A submenu's arrow points at the side it opens on

- **The problem:** in an order's menu, Set status and Add category open to the left, but their arrow pointed right.
- **What changed:** in a floating menu, where a submenu opens inward to the left, the item's arrow is mirrored to point left.
- **Where:** Components c9. `styles/components.css`, `.sp-menu--floating li:has(> .sp-menu__sub) > .sp-menu__item > svg:last-child`.
- **What is still open:** nothing.

## 6. A submenu closes after 200ms

- **The problem:** the c9 note said a submenu closes "after the same 500ms", but the open delay it refers to is 200ms. The app closes after 200ms.
- **What changed:** decided 200ms, the same as opening. The note now says so. The code already did this (`--submenu-delay`).
- **Where:** Components c9, Actions note.
- **What is still open:** nothing.

## 7. The landing line, the tilt and the 4px start (contradiction 1, later.md)

Settles the later.md entry "Claude Design's own reorder code lacks the tilt, the landing line and the 4px start".

- **The problem:** Components c1 draws a carried row tilted 0.6 degrees, a 2px line where it lands and a drag that starts after 4px. Claude Design's code did none of the three, and the React components Motion note said the line was gone. Carsten decided to keep it.
- **What changed:** the carried row tilts with the `rotate` property, since the drag writes its own `transform`. The 2px insertion line stands just above the carried row's slot. A pointer drag starts once the pointer has moved 4px; touch keeps its 200ms hold. The Motion note now describes all three.
- **Where:** Components c1, Ordering by hand (unchanged). React components, Motion note under ListItem. `react_handoff/Reorder.jsx`, `Slot`. `styles/components.css`, `.sp-list-item--carried`. App: the app's own copy of these three in `react/src/components/Reorder.jsx` and `react/src/styles/app.css` can go, replaced by these files.
- **What is still open:** nothing.

## 8. A phone list: long press, and no swipe (contradiction 2)

- **The problem:** c1 said that on a phone a long press opens the record menu and a swipe to the left shows two actions. The app had neither.
- **What changed:** decided there is no swipe. A sideways swipe near the screen's edge is Safari's back and forward, and the record menu already holds every action. A long press on a touch row, held still for 500ms, opens the record menu. The tap that ends it opens nothing, and the row opens no link preview and selects no text. A pointer keeps its menu button.
- **Where:** Components c1, Touch note. README, the list of things not decided. `react_handoff/Card.jsx`, `Card` (new `onLongPress` prop). `styles/components.css`, `.sp-card[data-long-press]`. App: the phone list rows (`Card variant="row"`) on Orders, Vendors, Categories and Bookmarks pass `onLongPress` to open their record menu as a sheet.
- **What is still open:** nothing.

## 9. Accessibility faults in the components (later.md)

Settles the later.md entry "The Storybook's accessibility check finds faults in the components", apart from the two points below.

- **The problem:** some grey text was under 4.5:1 on tinted grounds, and the entry asked for a new check after the greys changed.
- **What changed:** checked with the new values. `--ink-5` #686760 is 4.64:1 or more on every tinted ground (4.72:1 on #eceae4, 4.64:1 on #f0e6e4). `--ink-4` #5f5e58 is 5.31:1 on the danger tint. `--green-2` #2d754e is 4.64:1 on #eceae4. The calendar's outside days use `--ink-5`. Every figure in the entry now passes.
- **Where:** `styles/tokens.css` (unchanged in this pass).
- **What is still open:**
  - The NavItem story (Shell, One Nav Item) draws a NavItem on the page ground. A NavItem only exists on the sidebar ground, where its colours pass, so the story should draw it there. This is a Storybook change.
  - The drop zone's control inside a control: decided it is not a fault in the design. The entry can go.

## 10. Accessibility faults on the whole pages (later.md)

Settles the later.md entry "The whole pages in Storybook have accessibility faults".

- **The problem:** some rows were named by words that are not the ones drawn on them. The lists' menu column head was empty. The large marks and the line photo's Add box were reported as holding a control inside a control. A bookmark's empty photo box had grey text under 4.5:1.
- **What changed:**
  - A `NavItem` with words is named by its words and its count as drawn ("All orders 441"), and refuses a passed `aria-label`. On the rail, where the words are hidden, it carries that name itself.
  - A `ShareRow` is named by the words it draws and refuses an `aria-label`.
  - The menu column's head is named "Actions" for a screen reader (`th scope="col"` with `sp-announce`).
  - A bookmark card's picture link with no pictures is named by the band's words, then its own ("No picture. Open example.com").
  - A `Mark` drawn as a button takes the name only, never the picture role.
  - The grey text in the empty photo box and in the address line is `--ink-5` and now passes.
  - The line photo's Add box: decided it is not a fault in the design. The entry can go.
- **Where:** `react_handoff/Shell.jsx` (`NavItem`), `react_handoff/Data.jsx` (`ShareRow`), `react_handoff/List.jsx` (`List` head, `Record`), `react_handoff/Mark.jsx` (`Mark`). App: the sidebar and the Statistics rows stop passing `aria-label` (`react/src/components/Shell.jsx` callers, `react/src/pages/Statistics*.jsx`).
- **What is still open:** nothing.

## 11. Rail heading buttons on Order list

- **The problem:** the Views and Filters heads on Order list drew Save, Edit, Cancel, Done and Clear all at the small size. The stylesheet names xsmall as the size for a rail section header.
- **What changed:** every button in a rail heading is `sp-btn--xsmall`: 2b, 2d (all three Clear all) and the Views card states. A Clear beside a field group (2d, the date range) stays small. On touch, xsmall draws at the small size, as before.
- **Where:** Order list 2b, 2d and the saved views section. App: `react/src/pages/Orders.jsx` rail heads, `Button size="xsmall"`.
- **What is still open:** nothing.

## 12. Budget: no stepper in the month head

- **The problem:** the month card's head carried a window (Earlier, "Oct to Nov", Later) that repeated what the twelve months under it already do.
- **What changed:** the window and the "Oct to Nov" label are gone from the head on desktop. A press on a month moves to it. The left and right arrow keys page one month per press while no month is being edited. The phone keeps its window, since it has no month bar.
- **Where:** Budget 21a and 21c, the month card head and Notes for implementation. App: `react/src/pages/BudgetMonths.jsx`.
- **What is still open:** nothing.

## 13. Budget: the month wells slide like paper

- **The problem:** switching months replaced the two month wells at once.
- **What changed:** the two wells are one strip that slides under the card's edges. Stepping on, the later well glides left into the first place, the next month slides in from the right and the earlier one slides out at the left. Stepping back runs the other way. A jump of more than one month slides the whole pair out and the new pair in. The slide takes twice `--motion-in` on `--ease-enter`, and under reduced motion the months change at once.
- **Where:** Budget 21a, Notes for implementation, Motion. App: `react/src/pages/BudgetMonths.jsx`, with the wells keyed by month in `AnimatePresence mode="popLayout"` and the staying well on `layout="position"`.
- **What is still open:** nothing.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - c1 touch note, c9 submenu close.
- `React components.dc.html` - the Motion note under ListItem. It renders `react_handoff/`.
- `Order list.dc.html` - rail heading buttons.
- `Budget.dc.html` - the month head, the arrow keys, the month motion.
- `react_handoff/` - every component, as the React components page loads them. Changed: `Card.jsx`, `Combobox.jsx`, `Data.jsx`, `List.jsx`, `Mark.jsx`, `Overlays.jsx`, `Reorder.jsx`, `Shell.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/components.css` - gaps 1 to 5, the tilt, the long press and the hover fade.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/order-list.css`, `styles/pages/budget.css` - what the pages link, unchanged.

Every page's link to `styles/components.css` now carries a new version (`v20261025d`) so the changed rules load.

## styles/check.js

0 finding(s) across 27 pages.

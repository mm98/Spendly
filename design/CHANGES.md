# Two findings from Lighthouse's accessibility check

The brief: Lighthouse (13.6, desktop, signed in on Home) scores accessibility 95 and reports two faults, both in components: the sidebar grip is a small target, and the headless lists on Home have data cells no header names. The user left both questions to Claude Design; the decisions below are its answers.

## 1. The sidebar grip is a 24 px wide target

- **The problem:** `.sp-sidebar__grip` ("Collapse the menu") is 14x44 px, 0 px from the Categories row. WCAG 2.2, 2.5.8 Target size (minimum) asks for 24x24, or 24 px of clear space around a smaller target, so it fails both.
- **What changed:** the target is 24x44. The 3x26 bar is drawn as before and stays in the same place, centred in the right 14 px of the target; the extra 10 px reach into the sidebar, not over the page edge, since the shell clips its overflow. Those 10 px sit over the right end of the row at that height, and a press there is the grip's. Hover and colours are unchanged; the focus ring is drawn round the wider target. The same in the folded rail.
- **Where:** Navigation shell 9i, the grip note. `styles/components.css`, `.sp-sidebar__grip` (`grid-template-columns: 1fr 14px`, `width: 24px`) and `.sp-sidebar__grip::before` (`grid-column: 2`). `styles/COMPONENT-STATUS.md`, the 9i entry and a dated line. App: `react/src/app/AppShell.jsx`, `SidebarGrip`, takes the stylesheet change with no markup change; copy the two rules into the app's stylesheet if it carries its own. Storybook: `storybook/stories/Shell.stories.jsx`, open and folded.
- **What is still open:** nothing.

## 2. A headless list still names its columns

- **The problem:** on Home, Recent orders and Drafts are `table.sp-table` with no head row, so axe (`td-has-header`) reports `<td>` cells no `<th>` names, and a screen reader reads "Bilka, 10/28, Returned, 2,733.86 kr." with no column names.
- **What changed:** a headless list keeps its `<thead>` with `<th scope="col">` cells. Each label sits in `.sp-announce` (the existing read-not-drawn class), and the new variant `.sp-table--headless` gives the head row no height, no padding top or bottom and no rule. Nothing changes on screen. The labels are the order list's: Recent orders reads Vendor, Date, Status, Amount; Drafts reads Vendor, Date, Amount.
- **Where:** Home 10a, Drafts and Recent orders, and state 5 (Drafts made by hand). Components c1, a note in States. `styles/components.css`, `.sp-table--headless thead th`, beside `.sp-table--compact`. `react_handoff/List.jsx`: `headless` now always renders `<thead>`, adds `sp-table--headless` to the table and wraps each head label in `sp-announce`; its JSDoc line is updated. App: `react/src/components/List.jsx` takes the same change; `react/src/pages/Home.jsx` needs none, its two `List ... headless` already pass the head cells. Storybook: `storybook/stories/List.stories.jsx` with `headless` on.
- **What is still open:** nothing.

## later.md entries left as they are

- **A deleted record should not be removed for good at once:** on hold until the user decides to build it. Untouched.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Home.dc.html: 10a, the hidden head rows on Drafts and Recent orders.
- Navigation shell.dc.html: 9i, the grip note.
- Components.dc.html: c1, the headless list note.
- react_handoff/List.jsx: `headless` keeps the head for a screen reader.
- styles/components.css: `.sp-sidebar__grip` at 24x44, `.sp-table--headless` added.
- styles/COMPONENT-STATUS.md: the 9i entry and a dated line.
- styles/tokens.css, styles/doc.css, styles/pages/home.css, styles/pages/navigation-shell.css: what the pages load, unchanged.
- support.js, components.js: what the pages load to open.
- assets/shop-logo.svg: drawn on the pages.

## styles/check.js

0 findings across 28 pages.

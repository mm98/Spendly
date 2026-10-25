# Phone selection, and contrast on tinted grounds

Answers two briefs: Components c1 contradicted Order list 2c on whether a phone selects orders, and later.md's contrast faults in the Storybook accessibility check.

## 1. A phone does not select orders

- **The problem:** Components c1 said a long press on a phone selects an order. Order list 2c said a phone does not select orders, has no select box and no bulk actions. The README listed long press as not decided.
- **What changed:** a phone has no selection. On a touch list: tap opens the record, long press opens the record menu, swipe left shows the two actions the page marks primary. No select box, no bulk bar, no hover, no ⋮. Every action is on one record at a time.
- **Where:** `Components c1`, Actions notes, Touch. Order list 2c already said this and is unchanged. README, the list of things not decided: long press is now settled. App: the list's touch rendering (`.sp-card sp-card--row`) must not render a select box or the bulk bar, and long press opens the record menu.
- **What is still open:** nothing.

## 2. Small grey and green text under 4.5:1 on tinted grounds

Settles the later.md entry "The Storybook's accessibility check finds faults in the components", and the grey-text point of "The whole pages in Storybook have accessibility faults". Please remove the first entry, and the grey-text bullet from the second.

- **The problem:** `--ink-5` (#72716b) was 4.0 to 4.3:1 on the tinted grounds (#eceae4, #f2f1eb, #eef1ee, #e7efe8, #f0e6e4). `--ink-4` on the danger tint was 4.43:1, `--green-2` on #eceae4 was 4.34:1, and a calendar's days outside the month were 1.5 to 1.8:1.
- **What changed:** light theme only, dark theme unchanged.
  - `--ink-4` #6b6a63 to **#5f5e58** (5.3:1 or more on every tint), so it stays one step darker than `--ink-5`.
  - `--ink-5` #72716b to **#686760** (4.64:1 on #eceae4, the darkest tint).
  - `--green-2` #2f7a51 to **#2d754e** (4.55:1 on #eceae4). `--shell-action-hover` stays #2f7a51: it sits on the sidebar, not on a tint.
  - A calendar day outside the month is `--ink-5`, not `--line-5`.
- **Where:** `styles/tokens.css` (`:root` and the light-theme block), `styles/components.css` `.sp-range__day--outside`. The token tables in `Dark mode and image viewer` and the Sort note in `Layout rules` state the new values. App: the same tokens in `react/src/` and the date range calendar.
- **What is still open:**
  - The NavItem story (Shell, One Nav Item) draws a NavItem on the page ground. A NavItem only exists on the sidebar ground, where its colours pass; the story should draw it there. No token changes for it. Please confirm.
  - The drop zone's control inside a control, and the screen-reader names in the pages entry, are code, not drawing, and stay in later.md.
  - "Recently deleted" stays in later.md, by decision: not in this handoff.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - c1, the touch note.
- `Dark mode and image viewer.dc.html` - the token table's new light values.
- `Layout rules.dc.html` - the Sort label's new value.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css` - the three changed tokens.
- `styles/components.css` - the outside-month day.
- `styles/doc.css`, `styles/pages/dark-mode.css`, `styles/pages/layout-rules.css` - what the pages link.

Every page's stylesheet links now carry a new version (`v20261025c`) so the changed tokens load; nothing else on those pages changed.

## styles/check.js

0 finding(s) across 27 pages.

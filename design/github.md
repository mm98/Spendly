repo: mm98/Spendly
branch: main

## Last sync

date: 2026-10-02T07:00:19Z

### Updated in this project

- Audit only: read `react/src/components/*` exports and `react/src/routes.jsx` against `Components.dc.html` and the pages; nothing built, nothing pushed
- Found: `BudgetEditor` (c32) and `react_handoff/BudgetEditor.jsx` recorded below do not exist in this project
- Read `react/src/pages/Wishlist.jsx`, `WishForm.jsx`; drew the area as `Bookmarks.dc.html` 22a-22d (routes `/bookmarks`), using the same categories as orders, as the repo does

## Sync history

- 2026-10-02T04:39:50Z - Read the budget section (`react/src/pages/Budget.jsx`, `BudgetMonths.jsx`, `BudgetCheck.jsx`, `components/BudgetPanels.jsx`, `BudgetCells.jsx`, `BudgetImport.jsx`) and drew it as `Budget.dc.html` 21a-21h from existing components
- Two new components: `BudgetEditor` (c32, `react_handoff/BudgetEditor.jsx`) and `AddRow` (c33, in `Utilities.jsx`)
- Nothing was pushed; the read was one-way

## Screen map

| Screen | Built from |
| --- | --- |
| `Bookmarks.dc.html` 22a-22d | `react/src/pages/Wishlist.jsx`, `react/src/pages/WishForm.jsx`, `react/src/routes.jsx` |
| `Budget.dc.html` 21a, 21c | `react/src/pages/BudgetMonths.jsx`, `react/src/pages/Budget.jsx` (YearBar, NewYearDialog) |
| `Budget.dc.html` 21b, 21d | `react/src/pages/Budget.jsx` (SheetCard, Totals, AccountsCard) |
| `Budget.dc.html` 21g, 21h | `react/src/pages/BudgetCheck.jsx` |
| `Components.dc.html` c32, `react_handoff/BudgetEditor.jsx` | `react/src/components/BudgetPanels.jsx` |
| `react_handoff/Button.jsx` | `react/src/components/Button.jsx`, `.design-sync/docs/Button.md`, `.design-sync/props/Button.txt`, `react/src/styles/app.css` (`.button*` rules) |
| `react_handoff/README.md` | `docs/porting.md`, `.design-sync/conventions.md` |
| `Components.dc.html` c6 | the source the Button was written from; `styles/components.css` holds its rules |
| `icons.js` | `tabler/tabler-icons` `icons/outline/*.svg` (40 icons, MIT) - a separate public read, see below |

## Notes

The 21 `.dc.html` pages, `styles/` and the two checkers are this project's own work.
The repo holds older copies of some of them under `design/`, which are behind this
project - do not read them back over the current pages.

`docs/porting.md` states that `react/` is the one place the design system is built
and that `spendly.html` is a frozen historical artifact. That makes the app the
consumer of this library, not a second copy of it.

- 2026-09-17T06:22:34Z - Button read: `react_handoff/Button.jsx` from `react/src/components/Button.jsx`, vocabulary conflict recorded in the README

- 2026-09-14T17:20:54Z - `tabler/tabler-icons@main`, a separate public read: 59 outline icons into `icons.js`, MIT, nothing pushed back. Icon legend 19a is the register; 19b states the rule. `icons.js` is byte-identical to that read.
- 2026-09-14T16:55:50Z - first Tabler read: 40 icons into `icons.js`, legend rebuilt on the real artwork

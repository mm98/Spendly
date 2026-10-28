# One class for a described choice's second line

## Fixed from handoff_described_choice_help

**The problem.** That package settled the description on `.sp-field__help`, the Settings class. The decision is the other way: c5's `.sp-meta`.

**What changed.** Every described choice's second line is `.sp-meta`, as c5 draws it. c5, c32 and Budget are back as they were; Settings and the phone pages move to `.sp-meta`. The assertion in `styles/check.js` now reads "a described choice uses sp-meta".

## 1. The description is .sp-meta

**The problem.** One line, two classes. c5's described checkbox and radio, and "Greyed out in the totals" in the Budget account dialog, put the description on `.sp-meta`; Settings (Needs a look, Status email and the other described toggles) put it on `.sp-field__help`. In code that is two components for one job.

**What changed.** Every described choice's second line is `.sp-meta`, c5's form. No copy changes.

**Where.** `Settings and import 11a`, Needs a look, Status email and the other described toggles (nine rows). `Mobile screens`, the Status email page and one other described row (three rows). `Vendors and categories 5b`, `Vendors and categories 5c`, `Vendors and categories 5e`, `Vendors and categories 5f`, `Vendors and categories 5h`, the Favourite choice (five drawings). `Components c5` and `c32`, `Budget`: unchanged from before `handoff_described_choice_help`. `styles/check.js`, the assertion "a described choice uses sp-meta". App: wherever `react/src/components/Choice.jsx` or a Settings page renders a described choice, the description takes `sp-meta`.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html`, `Mobile screens.dc.html` - described choices on `.sp-meta`.
- `Vendors and categories.dc.html` - the Favourite choice on `.sp-meta`.
- `Components.dc.html`, `Budget.dc.html` - c5, c32 and the account dialog, on `.sp-meta` as before.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/budget.css`, `styles/pages/settings.css`, `styles/pages/mobile-screens.css`, `support.js`, `components.js`, `icons.js` - what the pages load to open from this folder.

## styles/check.js

0 finding(s) across 28 pages.

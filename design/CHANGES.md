# Changes: the side menu's highlight, the cause and the change that fixes it

Answers `Brief-nav-highlight-layoutroot-follow-up.md`. It replaces point 1 of `handoff_nav_highlight_page_scroll/CHANGES.md` (`layoutRoot` on `Sidebar`), which was built and measured and did not fix the fault.

## 1. The current row's ground slides by the difference between two rows read at one moment

**The problem.** Picking a Settings section made the Settings highlight in the side menu jump away and slide back. Scrolled down Statistics or Settings, pressing another menu row made the highlight start up to 4000px from its row. Leaving Settings for Home, Vendors or Budget gave the menu's scrolling list a scroll bar for a moment and changed its width. The highlight was a Motion `layoutId` marker, which is measured on the page; the old one is measured while the new page is prepared, before it scrolls, so any page scroll between the two measurements read as the row moving. `layoutRoot` does not change a `layoutId` handover.

**What changed.** `NavItem` draws its ground with `NavGround`, a small part in `Shell.jsx`, in place of the `layoutId` marker. It keeps the row the ground was last on and where on that row, reads that row and the new row at the same moment, and slides by the difference with Motion's `animate` and `glide()` (`y` and `scaleY`). A page scroll moves both rows equally, so it never counts. The code is the brief's, unchanged.

- The ground slides only between rows of one box (the nearest `.sp-scrolls` or `.sp-nav-list`): inside the menu's scrolling list, inside the pinned rows (Ask, Settings, the account row), or inside one light list. Between the scrolling list and the pinned rows it is drawn at once on the new row. The list clipped that slide already, and drawing it at once removes the scroll bar. Taken as the brief proposes.
- Leaving Settings for All orders, the Views card's ground is drawn in place.
- Under reduced motion the ground is drawn at once, as before.
- `.sp-nav-item > .sp-marker` gains `transform-origin: top;`, so the `scaleY` runs from the row's top. No look changes at rest.

**What goes.** Nothing in the side menu or the light lists uses `layoutId` any more, so:
- `Sidebar` renders `<nav>` again, without `layoutRoot`.
- `Panel` renders `<div>` again, without `layoutRoot`, and `Card.jsx` no longer imports `m`. The brief asks to check it before keeping it. A Segmented or radio-row marker inside a sticky Panel moves on a pick, and a pick does not scroll the page, so there is no page scroll for `layoutRoot` to guard against; and by the brief's cause it would not guard a `layoutId` handover anyway. It goes.
- `motion.js` no longer imports or re-exports `LayoutGroup`, and the `glide` comment states the new rule: Segmented, PeriodPicker and Choice keep `layoutId`, since they move with the page; the menu and the light lists use `NavGround`.
- In the app: `layoutScroll` on `NavScroll` (`react/src/app/AppShell.jsx`), `layoutRoot layoutScroll` on Settings' `SectionNav` (`react/src/pages/Settings.jsx`, back to `<nav className="st-subnav" aria-label="Settings">`), and the `LayoutGroup`s in `Settings.jsx` (`settings-sections`) and `OrderViews.jsx` (`views`, `views-sheet`), with their imports.

**Where.** `Navigation shell` 9g: the note "The current row's ground slides from the row left to the row reached" rewritten, and a new note "The ground slides only inside one box of rows". `Settings and import` 11a: the note "The section nav's ground slides from section to section" rewritten. `React components`, Shell segment: the "Motion" and "A page scroll never moves the marker" notes rewritten, and `LayoutGroup` dropped from the harness scope. `react_handoff/Shell.jsx` (`NavGround`, `NavItem`, `Sidebar`), `react_handoff/Card.jsx` (`Panel`), `react_handoff/motion.js`, `styles/components.css` (`.sp-nav-item > .sp-marker` and the `.sp-marker` comment). App files: `react/src/components/Shell.jsx`, `react/src/components/Card.jsx`, `react/src/components/motion.js`, `react/src/app/AppShell.jsx`, `react/src/pages/Settings.jsx`, `react/src/pages/OrderViews.jsx`. The Shell and NavItem stories draw the same part with no change of their own.

**What is still open.** Nothing to decide. The Panel removal was not measured in the built app; please confirm a Segmented inside a sticky Panel still slides straight when the page is scrolled.

## later.md

Read on main before this task. No entry is a design fix this project can settle now. "A deleted record should not be removed for good at once" still waits on the user's answers about Recently deleted, put off earlier, and stays as it is.

## Files

- `README.md`: the design's overview, unchanged.
- `CHANGES.md`: this note.
- `Navigation shell.dc.html`: 9g notes.
- `Settings and import.dc.html`: 11a note.
- `React components.dc.html`: Shell motion notes, harness scope.
- `react_handoff/`: every component file, since React components loads them all. Changed: `Shell.jsx`, `Card.jsx`, `motion.js`. No exported component gained or changed a prop, so no JSDoc block changed; `NavGround` is not exported.
- `support.js`, `components.js`, `icons.js`: loaded by the pages.
- `styles/components.css`: `.sp-nav-item > .sp-marker` gains `transform-origin: top`.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/navigation-shell.css`, `styles/pages/settings.css`: loaded by the pages, unchanged.

## styles/check.js

Not run to completion: it timed out at the 30 s limit, as in the last two sessions. A sweep of every changed file for em dashes, en dashes, curly quotes and their entities found none.

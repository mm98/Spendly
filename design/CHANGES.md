# Changes: the side menu's highlight counts a page scroll as movement, and the release notes limit

Answers the brief "the side menu's highlight counts a page scroll as movement" (`Brief-nav-highlight-page-scroll.md`), and one point raised in review on Settings and import 11d: the release notes list needs a limit.

## 1. The menu's highlight is measured on the screen, not on the page

**The problem.** Scrolled down a page (Settings, Statistics), a press on another sidebar row (Home, Vendors, Budget) made the highlight appear up to 700px below the row it left and slide up from there, and the menu showed a scroll bar and changed width while it was below. The sidebar stays put while the page scrolls under it, but Motion measured its rows by their place on the page, so a page scroll in the same moment read as the row moving.

**What changed.** Every box that stays on screen while the page scrolls under it is a Motion layout root, so the markers inside it are measured on the screen. A box that scrolls its own rows also takes `layoutScroll`. No look changes.

- `Sidebar` renders `<m.nav ... layoutRoot>` in place of `<nav>`. This covers every dark row: Home, Scan receipt, New order, All orders, the saved views, Vendors to Statistics, Ask, Settings and the account row.
- `Panel` (sticky beside a form) renders `<m.div ... layoutRoot>`, so a Segmented or radio-row marker inside it is safe in the same way.
- `motion.js` re-exports `LayoutGroup`, and its `glide` comment states the rule.
- In the app, `NavScroll` (`react/src/app/AppShell.jsx`) is the sidebar's scrolling region and moves its own `scrollTop` when the page changes. It becomes `<m.div ref={box} className={...} layoutScroll>` (import `m` from `../components/motion.js`).
- In the app, Settings' `SectionNav` (`react/src/pages/Settings.jsx`) is sticky and scrolls. It becomes `<m.nav className="st-subnav" aria-label="Settings" layoutRoot layoutScroll>`, with its `sp-nav-list` wrapped in `<LayoutGroup id="settings-sections">`.
- In the app, the light rows in `react/src/pages/OrderViews.jsx` are in the page flow, so a page scroll moves them for real and they need no root. Each `sp-nav-list` there is wrapped in its own `LayoutGroup`: `id="views"` in `ViewsCard` and `id="views-sheet"` in `SheetViews`. All light rows share the marker id `sp-nav-on-light`. Without the groups, leaving Settings for Orders would glide the light marker from the Settings nav into the Views card, across two coordinate spaces. A page switch moves only the sidebar's marker (`ShellContent`'s JSDoc), so the light marker is drawn in its new list at once.
- `Segmented.jsx`, `Choice.jsx` and `DatePickers.jsx` are unchanged. Their markers sit in the page flow, where measuring on the page is correct. The fix is on the boxes, not in shared motion code.

**How to check in the built app.** On a desktop, scroll Statistics to the bottom and press Home, Vendors and Budget in turn. Do the same from Settings with a section picked low on the pane. The highlight slides straight between the two rows and never starts below the menu. The menu shows no scroll bar and keeps its width. Then pick Settings sections from the section nav: the pane scrolls and the nav's highlight goes straight to the row picked. Leave Settings for Orders: the Views card's highlight is drawn in place, with no glide.

**Where.** `Navigation shell` 9g, new note "The current row's ground slides from the row left to the row reached". `Settings and import` 11a, new note "The section nav's ground slides from section to section". `React components`, Shell segment, new note "A page scroll never moves the marker", and the harness scope now hands on `LayoutGroup`. `react_handoff/Shell.jsx` (`Sidebar`), `react_handoff/Card.jsx` (`Panel`), `react_handoff/motion.js`. App files: `react/src/app/AppShell.jsx` (`NavScroll`), `react/src/pages/Settings.jsx` (`SectionNav`), `react/src/pages/OrderViews.jsx` (`ViewsCard`, `SheetViews`).

**What is still open.** Nothing to decide. Run the check above in the built app, since the brief says an earlier fix held in development but not there.

## 2. Release notes: at most 20 versions, and the button names what it will show

**The problem.** Pressing "Show all N earlier versions" in This build lists versions in place. The app returns at most 20, so on a long history "all" was wrong, and the review asked for a limit.

**What changed.** The list holds at most 20 versions, the running one included. The button reads "Show N earlier versions". N counts the earlier versions the list will hold once the button is pressed, so it is at most 19. A version older than those 20 is not listed.

**Where.** `Settings and import` 11d: every state's button ("Show 4 earlier versions") and the note "Three versions at first". App: `react/src/pages/SettingsBuild.jsx` line 134, `Show all ${earlier} earlier versions` becomes `Show ${earlier} earlier versions`, with `earlier` capped at 19. The comment on line 34 changes to match.

**What is still open.** Nothing.

## later.md

Read on main before this task. No entry is a design fix this project can settle now. "A deleted record should not be removed for good at once" still waits on the user's answers about Recently deleted, which were put off earlier, and stays as it is.

## Files

- `README.md`: the design's overview, unchanged.
- `CHANGES.md`: this note.
- `Navigation shell.dc.html`: 9g note.
- `Settings and import.dc.html`: 11a note, and the 11d button and note.
- `React components.dc.html`: Shell motion note, and `LayoutGroup` in the harness scope.
- `react_handoff/`: every component file, since React components loads them all. Changed: `Shell.jsx`, `Card.jsx`, `motion.js`. No prop changed, so no JSDoc block changed.
- `support.js`, `components.js`, `icons.js`: loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/navigation-shell.css`, `styles/pages/settings.css`: loaded by the pages. All unchanged.

## styles/check.js

Not run to completion. The checker timed out (30 s limit) twice in this session, as it did in the last one. No stylesheet changed. A sweep of every changed file for em dashes, en dashes and curly quotes found none.

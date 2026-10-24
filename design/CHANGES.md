# Motion gaps (fixed 2): every scrolling list shows the shared scrollbar

## Fixed from design_handoff_motion_gaps_fixed

**The problem** - On Order create and Order edit, the vendor combobox's list drew the browser's own scrollbar: wide, light, with arrows, on the dark surface. Every scrolling region is meant to show the same bar (thin, no track, `--scroll-thumb`), but that is stated as a list of selectors in `components.css`, and `.sp-combobox__panel` was never on it. The list only scrolls past `--list-max` (420px), which the vendor list with Favourites, Recent and Other vendors now reaches, so the gap showed only now. It was missing in every earlier package and on main. Five more regions scroll and were missing too: filter group values, an answer's figures table (sideways), Ask's empty start, Ask's help, and the Ask field.

**What changed** - `.sp-combobox__panel`, `.sp-field-group__values`, `.sp-chat__start`, `.sp-chat__help`, `.sp-chat__field` and `.sp-chat__figures` join the shared scrollbar rules: `scrollbar-width: thin` and `scrollbar-color: var(--scroll-thumb) transparent`, an 8px webkit bar, a pill thumb. `.sp-chat__figures` scrolls sideways, so its webkit bar is 8px high. No other component's rules changed. `styles/check.js` gains "every scrolling region shows the shared bar": any rule with `overflow: auto` or `scroll` whose class is not in the shared rules fails, unless it hides its bar. Run against the previous package's stylesheet it reports all six.

**Where** - `styles/components.css`, the scrolling regions block. `styles/check.js`. In the app: `react/src/styles/components.css`, the same block.

**What is still open** - Nothing.

---

## Page switches no longer blink

## Fixed from design_handoff_motion_gaps

**The problem** - Every page switch blinked and the app read like a full page load. `ShellContent page={path}` keyed the body by page, so a switch unmounted the whole body and mounted a new one at `opacity: 0` (`PRESENCE.page`): the old page went in one frame and the new one faded up from nothing. Loading `domMax` with the app (point 2 below) made the fade run from the first switch, so it showed on every one.

**What changed** - A page switch is not animated. The new page replaces the old at once, the body stays mounted, nothing fades or rises; only the sidebar's marker moves. `ShellContent` loses its `page` prop and always renders a plain `main`; `PRESENCE.page` is removed.

**Where** - `react_handoff/Shell.jsx` (`ShellContent` and its JSDoc), `react_handoff/motion.js` (`PRESENCE`), `react_handoff/README.md` and `styles/components.css` (the Motion comment: page change removed from what Motion runs), React components, the first implementation note and the Shell Motion note. In the app: `react/src/components/Shell.jsx`, `react/src/components/motion.js`, and drop `page=` from `ShellContent` in `react/src/app/AppShell.jsx` if the PR added it.

**What is still open** - Nothing.

---

Answers the brief "two gaps in the Motion update" (pull request #575).

## 1. Rows you can drag fade in and out

**The problem** - On the four lists you can drag (accounts on Budget, order lines, statuses, order views while editing), a row added or removed appeared or vanished at once. `Rows` around a `ReorderList` saw one child, the list, and never a row; a moving `ListItem` or `NavItem` spread `itemOf(moving)` on `Reorder.Item`, not `useRow()`.

**What changed** - `ReorderList` owns its rows' presence. It puts `<Rows count={order.length}>` around the keyed `Slot`s inside `Reorder.Group`, so each `Slot` is a direct, keyed child of the `AnimatePresence`. `itemOf(moving, moves)` takes the row's `useRow()` result and spreads it first, then the drag's own props, so `layout: 'position'` always wins and a carried row still glides. `ListItem` no longer spreads `moves` on its attributes when it is moving (it goes through `itemOf` instead); `NavItem` now calls `useRow()` and passes it to `itemOf`. A row added drops in, a row removed fades where it stood and the rest glide up, as on every other list.

**Where** - `react_handoff/Reorder.jsx` (`ReorderList`, `itemOf`), `react_handoff/ListItem.jsx` (`ListItem`), `react_handoff/Shell.jsx` (`NavItem`), `react_handoff/motion.js` (`useRow` comment). Drawn as a note in Components, Ordering by hand ("Adding and removing"), and in React components, the list rows' Motion note. In the app: remove the `<Rows>` around the `ReorderList` in `react/src/pages/Budget.jsx`, `react/src/pages/OrderForm.jsx` and `react/src/pages/SettingsStatuses.jsx`; `react/src/pages/OrderViews.jsx` needs no change and now fades too.

**What is still open** - A row leaving stays in `AnimatePresence` for `--motion-out` while its value is already gone from `Reorder.Group`'s `values`. A drag started inside that window has not been tried; please confirm in the browser that carrying a row while another fades out behaves.

## 2. Motion's features load with the app

**The problem** - `MotionShell` fetched `domMax` after the first paint. Until it arrived, a `layoutId` marker could not slide (the side menu's marker jumped on the first page change in Firefox, one run in four) and a part closed in that time never finished closing.

**What changed** - `domMax` is imported with the app and passed straight to `LazyMotion features={domMax} strict`. No wait: the first page change slides its markers, and every part leaving through `Presence`, `Fold` or `Rows` runs its way out from the start. The first download grows by `domMax`. Components still import `m`, never `motion`.

**Where** - `react_handoff/motion.js` (`MotionShell`; the `features` loader is gone), `react_handoff/README.md` (Motion paragraph), React components, the first implementation note. The harness on React components passes `domMax` through from Motion's browser build. In the app: `react/src/components/motion.js`.

**What is still open** - Nothing.

## later.md

The brief cites a later.md entry for "a part closed before the features load never finishes closing". later.md on `main` has no such entry today, so there is nothing to remove; point 2 settles the fault if it is added back. The other entries (accessibility faults, design differences) are outside this brief and are not touched here.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - Ordering by hand gains the "Adding and removing" note.
- `React components.dc.html` - the Motion notes, `domMax` in the harness, and the page switch notes.
- `react_handoff/` - all components, since the React components page loads every one; changed: `motion.js`, `Reorder.jsx`, `ListItem.jsx`, `Shell.jsx`, `README.md`.
- `styles/components.css` - the Motion comment no longer lists the page change, and six scrolling regions join the shared scrollbar rules.
- `styles/check.js` - the new scrollbar assertion.
- `support.js`, `components.js`, `icons.js`, `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - what the two pages load.

## styles/check.js

0 finding(s) across 27 pages.

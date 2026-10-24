# Brief: bring Motion into the design system

This package replaces `design_handoff_motion_library_fixed_3`, and with it `design_handoff_motion_library_fixed_2`, `design_handoff_motion_library_fixed` and `design_handoff_motion_library`. It keeps every section of them and adds the fix below.

## Fixed from design_handoff_motion_library_fixed_3

### The attachment strip's fades cover the strip

- **The problem:** raised in chat: on an attachment strip (c16), the fade under the earlier and later buttons, on both sides, covered only the tiles' own height from the wrap's edge. The strip scrolls in a box 4px larger on every side (room for the tiles' focus ring) and holds the names under the tiles, so a tile's edge and its name scrolled out from beside and under the fade.
- **What changed:** each fade covers the strip's whole scrolling box, edge to edge and top to bottom, names included. Its round button stays where it was: centred on the tiles and 4px in from the strip's edge, measured on Components, both strips, both sides.
- **Where:** `styles/components.css`, `.sp-strip-nav.sp-strip-nav`, its two sides, and `.sp-strip-nav > svg`. Components c16; the app's `Strip` in `Attachments.jsx` takes it with no change.
- **What is still open:** nothing.

## Fixed from design_handoff_motion_library_fixed_2 (kept)

### The drawn pages load the components.js that moves the selection

- **The problem:** raised in chat: on Components, the facet segmented control (c12) and others still jumped. Every page loaded `components.js?v=v20260917b`, so a browser that had the file kept the old copy, without the selection marker.
- **What changed:** every page loads `components.js?v=v20261024s`. Each segmented control, the period picker's window sizes and every set of radio rows on the drawn pages now slide their selection; checked on Components, every segmented control with a choice holds the marker. No file content changed.
- **Where:** the script link on every `.dc.html` page that loads `components.js`.
- **What is still open:** nothing.

## Changed from design_handoff_motion_library_fixed

### A submenu opens and closes sooner

- **The problem:** raised in chat: the submenu felt slow. It rested 500ms before opening and before closing.
- **What changed:** `--submenu-delay` is 200ms. A pointer that only crosses an item still does not open its submenu; the slide itself is unchanged (`--motion-in` / `--motion-out`, items 20ms apart).
- **Where:** `styles/tokens.css`, `--submenu-delay`; the notes in Components (c9, "Hover an item with a chevron for 200ms") and Order list (the flyouts); `react/src/styles/tokens.css` in the app.
- **What is still open:** nothing.

## Fixed from design_handoff_motion_library

### The sort control's chevron stays when open

- **The problem:** raised in chat: on Components, the sort control's chevron disappeared when it opened. The turn rotates the slot's child; on the drawn pages the slot is the svg itself, so the child is its path, which turned about the svg's corner and left the box. In the app the slot wraps the icon, so it turned in place there.
- **What changed:** the turned icon turns about its own box (`transform-box: fill-box; transform-origin: center`), so it points up in place wherever the slot holds it. No look changes at rest. `styles/check.js` gains "a turned icon turns about its own box".
- **Where:** `styles/components.css`, `.sp-combobox__trigger > .sp-combobox__chevron:last-child > *` and `.sp-combobox .sp-field__chevron > *`; `styles/check.js`. Components, the sort control.
- **What is still open:** nothing.

Answers `Brief-motion-library.md`: Motion (`motion` 14.6.0, `motion/react`) takes over what CSS cannot do the same in every browser, with one rule for which is which, one place for the timing, one reduced-motion setting and a small download. It also carries two layout fixes raised in chat and the non-colour points of the later.md accessibility entry. `react_handoff/` is main's `react/src/components/` with this pass applied.

## 1. When Motion, when CSS

**The problem** - Some motion depended on CSS features that Firefox does not animate (anchor positioning with transitions, `transition-behavior: allow-discrete`, `interpolate-size`). There was no rule for which mechanism a new case should use.

**What changed** - The rule, written in `react_handoff/README.md` ("What moves, and with what") and at the head of the motion section in `components.css`: if CSS draws it the same in Chrome, Safari and Firefox, it stays CSS. CSS keeps hover and colour, check boxes and radios, the chevrons' turn, submenus, the tab bar's colour, gauges and bars, the calendar's month slide and the password shuffle. Motion runs parts leaving the page, a marker or a row moving to a new place, height folds, reordering and page changes.

**Where** - `react_handoff/README.md`; `styles/components.css`, the motion section; React components, the top note.

**What is still open** - Nothing.

## 2. One place for the timing

**The problem** - Motion and CSS each needed the same pace, and writing the numbers in JS would put them in two places.

**What changed** - `react_handoff/motion.js` reads `--motion-in`, `--motion-out`, `--ease-enter`, `--ease-exit`, `--motion-rise` and the new `--motion-slide` off `:root` the first time something moves, after the stylesheet has applied, and turns them into Motion's units (seconds, cubic-bezier arrays, pixels). A missing token is reported and moves nothing; there is no fallback number. It exports `into()` and `away()` (the way in and out), `PRESENCE` (what each kind of part does as it arrives and leaves: panel, scrim, dialog, sheet, row, chip, page) and `glide()`. `inMs` and the `Leaves` context are removed from `Utilities.jsx`; every component reads the pace through `motion.js`.

`--motion-slide: 10px` is new in `tokens.css`: the sidebar labels' travel, which was written as 10px in the keyframes. No value changed.

**Where** - `react_handoff/motion.js`; `styles/tokens.css`, the motion block; `react/src/components/motion.js` and `react/src/styles/tokens.css` in the app.

**What is still open** - Nothing.

## 3. Reduced motion from one setting, and what loads

**The problem** - Each component checked `prefers-reduced-motion` itself.

**What changed** - `MotionShell` (in `motion.js`) goes once around the app: `LazyMotion` with `domMax`, fetched by dynamic import after the first paint, and `strict`, so a component that reaches for the full `motion` is refused; and `MotionConfig reducedMotion="user"`, so under the system setting transforms and layout moves are off and fades stay. The few parts that animate a number or a set of elements (the counting figures, the sidebar labels, the password shuffle, panel fades) read the same setting through `useStill()`. No component calls `matchMedia` for motion any more.

`domMax` is needed for `layoutId` (the moving markers), `layout` (rows gliding) and drag (`Reorder`); `domAnimation` alone cannot do them. Components import `m`, never `motion`.

**Where** - `react_handoff/motion.js` (`MotionShell`, `useStill`). In the app: wrap the shell in `react/src/main.jsx` or `app/AppShell.jsx` in `<MotionShell>`; in Storybook, add the same wrapper as a global decorator in `.storybook/preview.jsx`.

**What is still open** - Nothing.

## 4. The sliding marker, in every browser

**The problem** - Firefox fault 1: the selection was a `::after` placed with anchor positioning, which Firefox places but does not animate; the sidebar's marker jumped from 4 to 526 px in one frame.

**What changed** - The selection is a real element, `.sp-marker`, drawn inside the chosen option, and Motion moves it to the next one (`layoutId`), in `Segmented`, the PeriodPicker's window sizes, radio choice rows (`Choice variant="row"` with a `Radio`) and the sidebar's current row, dark and light. A Segmented or radio set the page does not hold the value of follows its own choice, so it moves too. The option holding the marker draws no ground of its own and is its own stacking context; the row of options is not (see 12). At rest nothing looks different.

**Where** - `react_handoff/Segmented.jsx`, `DatePickers.jsx` (`PeriodPicker`), `Choice.jsx` (`Choice`), `Shell.jsx` (`NavItem`); `styles/components.css`, `.sp-marker` and its four option rules. React components r4, r7 and r12: the radio rows, segmented controls and the shell's rows can be pressed to see it move. On the drawn pages `components.js` places the same marker and slides it at the tokens, so Components and every page with a segmented control or radio rows move as the app does.

**What is still open** - Nothing.

## 5. The closing fade, in every browser

**The problem** - Firefox fault 2: the combobox panel, floating menus, the date calendar and the Custom range were hidden with `display: none` and relied on `allow-discrete` to stay drawn while fading; Firefox removed them at once.

**What changed** - These panels stay mounted and shown by their host's `data-open`, as before. `usePanelMotion` (in `motion.js`) runs the fade and the `--motion-rise` drop in and out, rising when the panel is placed above its trigger, and keeps the host marked `data-closing="true"` until the fade is done; each panel's show rule also shows it under `data-closing`. A touch menu sheet slides back down under presence.

**Where** - `react_handoff/Combobox.jsx` (both forms), `Overlays.jsx` (`useMenuPlace`, `Anchor`, `Menu` on touch), `List.jsx` (`Record` menu), `DatePickers.jsx` (`DateField`, `PeriodPicker`); `styles/components.css`, the show rules of `.sp-combobox__panel`, `.sp-menu--floating`, `.sp-period__custom` and `.sp-calendar`.

**What is still open** - Nothing.

## 6. Leaving becomes AnimatePresence, under the same name

**The problem** - `Leaving` (63 uses in 24 files) kept a part drawn on a timer read from `--motion-out`.

**What changed** - `Leaving` is now Motion's presence, with the same name and props (`onClosed`, children), so no call site changes. `Dialog`, `Scrim`, `Popover` and `Sheet` are `m` elements with their own way in and out (`PRESENCE`); while one leaves it is `inert`, so it takes no more presses. A dialog on touch is a sheet and leaves as one. `Sheet`'s drag moves the same motion value Motion slides it with, so a sheet let go short of closing goes back from where the finger left it.

**Where** - `react_handoff/Overlays.jsx`, `Shell.jsx` (`Scrim`), `Touch.jsx` (`Sheet`), `motion.js` (`Presence`, `useGoing`).

**What is still open** - Nothing. The sheet's rise on opening was the app's own `app.css` fault (brief, "for your information"): with Motion moving the sheet, its `transition: transform` rule in `react/src/styles/app.css` can go.

## 7. Rows added and removed: `Rows` replaces `app/rowMotion.js`

**The problem** - `useRowMotion` kept removed rows as ghosts and marked `data-added` / `data-leaving` for CSS.

**What changed** - A list wraps its keyed rows in `<Rows count={n}>`. Rows loaded with the list do not move; one added later drops in; one removed fades where it stood and the rows below glide up. `ListItem`, `Record` and the List's table rows read it (`useRow`); the List wraps its own table rows and record cards, so pages using `List` change nothing. Past 60 rows nothing glides (`GLIDE_MAX`).

**Where** - `react_handoff/motion.js` (`Rows`, `useRow`), `ListItem.jsx`, `List.jsx`. In the app: delete `app/rowMotion.js`; in `OrderForm.jsx`, `Budget.jsx` and `SettingsStatuses.jsx`, replace `useRowMotion` and its `row()` marks with `<Rows count={items.length}>` around the rows.

**What is still open** - Nothing. A load or a scan filling a list at once is no longer told apart from one row arriving: rows present at the list's first render never animate, and later arrivals fade in, many or one.

## 8. Reordering by hand: `ReorderList` replaces `Reorder.js`

**The problem** - `components/Reorder.js` measured rows and set translates by hand.

**What changed** - `react_handoff/Reorder.jsx`, `ReorderList`, built on Motion's `Reorder`: `<ReorderList items keyOf nameOf onMove>{item => <ListItem handle ... />}</ReorderList>` inside the page's own list element (it draws no box: `.sp-reorder` is `display: contents`). The handle carries a row and the rows it passes make room; a touch starts after a 200ms still hold and a move of 8px first is a scroll; a press that does not drag picks the row up, the arrows move it, Space puts it down, Escape puts it back, a held row that loses focus is put down; each move is read out. `onMove(items, item, to)` is called once, as before. `ListItem` and `NavItem` take the carried and picked states from it. The insertion line is no longer drawn: the rows show where the row lands.

**Where** - `react_handoff/Reorder.jsx`, `ListItem.jsx`, `Shell.jsx` (`NavItem`). In the app: delete `components/Reorder.js`; `OrderForm.jsx`, `OrderViews.jsx`, `Budget.jsx` and `SettingsStatuses.jsx` move from `useReorder` to `ReorderList`, and drop `Insertion` and `lands`.

**What is still open** - Nothing.

## 9. Chips, figures, the sidebar labels, content after a skeleton

**The problem** - Each kept its own timers and its own reduced-motion check.

**What changed** -
- **Chips** - `Combobox multiple` wraps its chips in `Rows kind="chip"`: one added grows in, one removed shrinks out and the others close up. The leaving and added bookkeeping in `Combobox.jsx` is gone.
- **Counting figures** - `useCounted` in `Data.jsx` counts with Motion's `animate` over twice `--motion-in` on the way-in curve, in the figure's digit slots as before.
- **Password shuffle** - stays its own (it changes letters, not style), but reads the pace and reduced motion through `motion.js`.
- **Sidebar labels** - `Sidebar` runs them in from `--motion-slide` as the column opens and out before it closes, on `--ease-enter` and `--ease-exit` (they used plain ease-out and ease-in), and calls the new `onMotionEnd` when they are done. The `sp-sidebar--slide-in` / `--slide-out` classes and keyframes are gone. In the app, `AppShell`'s sidebar fold narrows the column on `onMotionEnd` instead of after `SLIDE_IN_MS` / `SLIDE_OUT_MS`, which go.
- **Content after a skeleton** - `app/loaded.js` finds each element that took a placeholder's place, as before, and calls `arrive(node)` from `motion.js` instead of setting `data-loaded`.

**Where** - `react_handoff/Combobox.jsx`, `Chip.jsx`, `Data.jsx`, `Inputs.jsx`, `Shell.jsx`, `motion.js`; `components.js` (the drawn pages' sidebar runs the same slide from the tokens). App: `app/AppShell.jsx`, `app/loaded.js`.

**What is still open** - Nothing.

## 10. Folding by height

**The problem** - Folds animated only where `interpolate-size` exists; Firefox folded at once.

**What changed** - `Fold` (in `motion.js`) grows its contents to their height and back to nothing, clipped only while it moves. A card's folding body takes the toolbar's state: `<Toolbar variant="toggle" expanded={open}>` then `<CardBody open={open}>`. A facet group's values fold the same way inside `FieldGroup`. A removed row closing up is the rows below gliding (7). The `interpolate-size` rules are gone; `.sp-fold` keeps the gap its parts had.

**Where** - `react_handoff/Card.jsx` (`CardBody open`), `Choice.jsx` (`FieldGroup`), `motion.js` (`Fold`); `styles/components.css`, `.sp-fold`. App: pages with a folding card pass `open` to its `CardBody`.

**What is still open** - Nothing.

## 11. New motion

**The problem** - Pages changed, and lists re-sorted or re-filtered, with nothing moving.

**What changed** -
- **Pages** - `ShellContent page={key}`: a new page fades in and rises `--motion-rise`; the one it replaces goes at once, so a click never waits on a fade. The sidebar and top bar stay still. In `AppShell`, pass the route's pathname (not its search) as `page`, so a filter change does not count as a new page.
- **Lists after a sort or a filter** - inside `Rows`, every row and record card glides to its new place, those that leave fade and new ones fade in (7). This covers the order list's table and cards, and every list wrapped in `Rows`.

**Where** - `react_handoff/Shell.jsx` (`ShellContent`), `motion.js`, `List.jsx`. App: `app/AppShell.jsx`. Notes in React components r12 and r9.

**What is still open** - Nothing.

## 12. A floating layer is never trapped under a stacking context

**The problem** - Raised in chat: on Statistics, Custom's range picker opened under the bars. The sliding selection set `isolation: isolate` on `.sp-period__presets`, the row that holds the Custom range, so the range's `z-index` counted only inside that row and the chart card after it drew over it. The sidebar and radio-row slides had the same rule.

**What changed** - The rows of options are no longer stacking contexts; only the option holding the marker is (4). `styles/check.js` gains "a floating layer is never trapped under a stacking context": no rule may give an element that holds a calendar, a range, a combobox panel or a menu (`.sp-period`, `.sp-period__presets`, `.sp-period__anchor`, `.sp-field__wrap`, `.sp-combobox`, `.sp-anchor`, `.sp-cell-menu`, `.sp-record__menu`, `.sp-controls`, or a broad `:has()` container) `isolation`, `contain: paint`, a `transform`, a `filter` or a `will-change` that makes one.

**Where** - `styles/components.css`, the motion section; `styles/check.js`. Order statistics, the period bar.

**What is still open** - Nothing.

## 13. A narrow field fills a half

**The problem** - Raised in chat: in Settings, Currency, Date and time format, Kind and Status ended about 20px short of their own note and the card's edge. They are `narrow` comboboxes, capped at `--field-w` (280px) for a full form column, inside `.sp-halves`, whose halves are wider.

**What changed** - In a half a narrow combobox or segmented control fills the half; in a full column it is still capped. `styles/check.js` gains "a narrow field fills a half".

**Where** - `styles/components.css`, after `.sp-halves`; `styles/check.js`. Settings and import 11b.

**What is still open** - Nothing.

## 14. later.md: The Storybook's accessibility check finds faults in the components

**The problem** - The entry lists contrast faults and three structural ones.

**What changed** - Decided in chat: the non-colour points are fixed now, the colours are a separate pass.
- **`Mark` with `role="img"` in the picture slot and the attachment strip** - a mark drawn as a file picker's label (`as="label"`) takes no role and no name; the file input inside it carries the name ("Add the image", "Add attachment"). `Mark` reports an `aria-label` passed to such a mark.
- **The account row's name** - `SidebarAccount` names itself by the words it draws, name then email with a space, so the label begins with what is seen; it reports an `aria-label` passed to it, which `AppShell` and the Shell stories should drop.

Please remove these two points from the entry; the others stay.

**Where** - `react_handoff/Mark.jsx`, `FileDrop.jsx` (`Slot`), `Attachments.jsx` (`AttachmentAdd`), `Shell.jsx` (`SidebarAccount`). App: `app/AppShell.jsx`, `storybook/stories/Shell.stories.jsx` (no `aria-label` on the account row).

**What is still open** -
- **The drop zone holds a control inside a control** - not changed. The zone is a label around its file input, the platform's own pattern, and holds no other control; the story names no rule, so the fault cannot be reproduced here. Kept in the entry: please confirm which axe rule the Drop Zone story reports.
- **The contrast points** (`--ink-5` on tinted grounds, `--ink-4` on the danger tint, the green on `#eceae4`, out-of-month days, the NavItem on the page ground) - kept for a separate colour pass, as decided.

## 15. Storybook and the harness

**The problem** - Storybook and the React components page render the components without the app's shell.

**What changed** - Storybook needs the same `<MotionShell>` as the app, as a global decorator in `.storybook/preview.jsx`; every story for the components above then moves as the app does. The React components page loads Motion's browser build (framer-motion 11.18.2, the same API) and gives the files `motion` as `m`, since each specimen renders in a root of its own; it strips re-exports and resolves `motion.js`'s late feature load to the loaded build. `FILES` adds `motion.js` and `Reorder.jsx`; the token field specimen is `Combobox multiple`, as on main.

**Where** - `React components.dc.html`, the harness and the notes in r0, r3, r4, r5, r6, r7, r9, r11, r12, r13.

**What is still open** - Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `React components.dc.html` - the harness with Motion, the motion notes, pressable shell rows.
- `Components.dc.html`, `Order list.dc.html` - the submenu delay in their notes, and the pages the fixes are seen on.
- `react_handoff/*` - main's component files with this pass; `motion.js` and `Reorder.jsx` new, `Reorder.js` replaced; the folder's README.
- `styles/tokens.css` - `--motion-slide`, `--submenu-delay` 200ms.
- `styles/components.css` - the motion section rewritten to what stays CSS and what Motion needs, the panels' `data-closing` show rules, the sidebar slide keyframes removed, the halves release.
- `styles/check.js` - the two new rules.
- `components.js` - the drawn pages' sidebar slide from the tokens, and the moving selection marker.
- `support.js`, `icons.js`, `styles/doc.css` - what the page loads.

Every page's stylesheet links move to `?v=v20261024r` (tokens) and `?v=v20261024t` (components), and its `components.js` link to `?v=v20261024s`; the other pages changed in nothing else and are not in the package.

## styles/check.js

    0 findings across 27 pages

Run in two halves of the pages, since one run passes the script time limit; each half reported only the start page's screen count, which counts both halves together (47 + 58 = 105).

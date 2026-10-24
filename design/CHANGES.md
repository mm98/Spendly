# Motion, the latest components from main, and the fixes from review, with a second motion pass

Brief: bring `react_handoff/` up to date from `react/src/components/` on main, including Claude Code's revert of the narrowed settings; add motion where it fits; and the points raised on React components: the combobox chevron should point up when open and open and close the list like a native select, a touch date field showed two calendars, a key was drawn inside a key, the calendar's one-click days sat in a wide gap, and the PeriodPicker selection and the range picker did not move as the others do.

This package replaces `design_handoff_motion_menus_fixed`, which was not applied, and with it `design_handoff_motion_menus`, `design_handoff_motion_second_pass_fixed`, `design_handoff_motion_second_pass`, `design_handoff_motion_and_sync_fixed`, which was not applied, and with it `design_handoff_motion_and_sync`, `design_handoff_react_from_app`, `design_handoff_react_sync` and `design_handoff_react_sync_fixed`, none of which was applied. It keeps every section of `design_handoff_motion_and_sync`, and the sections of `design_handoff_react_from_app` that still hold, and drops what the revert undid: the specimens pass parts again (icons, keys), as the app takes them.

## Fixed from design_handoff_motion_menus_fixed

- **The problem:** the fading hover in menus and combobox lists read as lag behind the pointer.
- **What changed:** taken out: a menu item's and an option's hover ground switches on and off at once, as before. The submenu's slide and its items' stagger stay.
- **Where:** `styles/components.css`, the "motion, second pass" block; the r7 note in `React components.dc.html`.
- **What is still open:** none.

## Fixed from design_handoff_motion_menus

- **The problem:** a submenu's items opened all together, not 20ms apart: the rule that hides them also reset each item's stagger to 0ms, and it outranked the rules that set 20ms to 100ms per item.
- **What changed:** the stagger's 0ms start sits on its own rule, `.sp-menu__sub > *`, before the per-item rules, so the second item follows at 20ms and the sixth and later at 100ms.
- **Where:** `styles/components.css`, the submenu rules in the "motion, second pass" block.
- **What is still open:** none.

## Added since design_handoff_motion_second_pass_fixed

### A submenu slides out from its item

- **The problem:** a submenu faded in on the spot after its rest, with nothing tying it to the item that opened it.
- **What changed:** after the same `--submenu-delay` rest, a submenu slides 6px out from the side of its item and fades in, its items following one after another, 20ms apart (up to 100ms). It slides back as it closes, after the same rest. A submenu flipped inward (`sp-menu--floating`) slides from the right. Opened by its item's own state (keyboard, touch), it opens at once and its items still follow. Under reduced motion it fades as before.
- **Where:** `styles/components.css`, the "motion, second pass" block, `.sp-menu__sub` and its children; note in `React components.dc.html` r7.
- **What is still open:** none.

## Fixed from design_handoff_motion_second_pass

- **The problem:** a `Stepper` with `decimals` set dropped its trailing zeros: with `decimals` 2, twenty read 20 and twenty and a half 20,5, so a value's places came and went as it changed, and a column of steppers did not align.
- **What changed:** a stepper with places always shows all of them: with `decimals` 2, twenty reads 20,00 and twenty and a half 20,50, in the reader's locale. A stepper whose step has places (0.25) already did. While the reader types, what they typed stays as typed until they leave the field.
- **Where:** `react_handoff/Stepper.jsx`, `shown` and the JSDoc for `decimals`; make the same change in `react/src/components/Stepper.jsx`. `React components.dc.html` r4, a third stepper specimen (hours, `decimals` 2, 20,00).
- **What is still open:** none.

## Added since design_handoff_motion_and_sync_fixed

### Choice rows that pick one: the tint slides

- **The problem:** in a popover's list of choices, the green tint jumped from the old row to the new.
- **What changed:** in a set of choice rows that picks one (radio rows), the tint slides between rows at `--motion-in`. Rows that pick several keep their own tint.
- **Where:** `styles/components.css`, the selection rules in the motion block (`--sp-choice-on`); note in `React components.dc.html` r7.
- **What is still open:** none.

### The password shuffles as it shows or hides

- **The problem:** pressing the eye swapped dots for letters at once.
- **What changed:** the letters shuffle into place left to right over twice `--motion-in`, through passing glyphs, and back into dots when hidden. An overlay draws the shuffle and is hidden from screen readers; the field keeps its value and the caret. A value over 40 characters, and reduced motion, switch at once.
- **Where:** `react_handoff/Inputs.jsx`, `PasswordField` (make the same change in `react/src/components/Inputs.jsx`); `styles/components.css`, `.sp-input--shuffling` and `.sp-input__shuffle`.
- **What is still open:** none.

### Second motion pass

- **The problem:** checks, radios, the sidebar's current row, figures, gauges, bars, skeletons, reorder, chips and calendar months still changed at once.
- **What changed:**
  - A check box fills and its tick draws; a radio's dot grows in from its ring, the chip's own boxes too. Unchecking runs back.
  - The sidebar's current row ground slides from the row it left to the row it reached, dark and light sidebar alike.
  - The tab bar has no marker to slide, so its current colour crosses over. A sliding marker would be a new mark on a locked component: not drawn.
  - A `Stat` figure and a `Sum` value that change count to the new value, easing out over twice `--motion-in`, in the figure's own digit slots (`useCounted` in `Data.jsx`), so separators and currency stay put and the last frame is the formatted figure.
  - A gauge fills and a bar rises from nothing when it first shows, and moves to a new length when its figure changes.
  - Content that replaces a skeleton fades in; the component that swaps them marks it `data-loaded="true"`.
  - While a row is carried, the rows it passes ease aside: the drag sets each row's move as its `translate` on a list marked `data-reordering="true"`, and the transition takes it home. This replaces the 150ms in the Ordering by hand notes with `--motion-in`.
  - A chip the reader adds grows in; one removed shrinks out, held for `--motion-out` with `data-leaving="true"`.
  - A calendar stepped a month slides its days in from that side; `Month` keys its days by month and marks `data-step`.
- **Where:** `styles/components.css`, the "motion, second pass" block; `react_handoff/Data.jsx` (`useCounted`, `Stat`, `Sum`) and `DatePickers.jsx` (`Month`): make the same changes in `react/src/components/`. In the app: `data-loaded` where a page swaps a skeleton for content, `data-reordering` and the measured `translate` in the drag (`Reorder.js`), `data-added`/`data-leaving` where `TokensField` adds and removes chips. Notes in `React components.dc.html` r3, r4, r6, r10, r11, r12, r13.
- **What is still open:** none.

## Fixed from design_handoff_motion_and_sync

- **The problem:** the ListItem specimen "Lounge chair, oak" (React components r6) drew its remove button straight after the words, mid-row, on hover. The specimen left out what every line row in the library has between the words and the actions: the spacer and the amount. The component was right; the specimen called it short.
- **What changed:** the specimen draws the row as the library does: words, `sp-grow`, the amount (8.620,00 kr.), then the remove button at the row's end.
- **Where:** `React components.dc.html`, r6, the lines specimen.
- **What is still open:** none.

## The components are main's, after the revert

- **The problem:** main changed every component file twice since the last package: the settings were narrowed to strings, then the narrowing was reverted.
- **What changed:** `react_handoff/` is the app's 28 files as of this sync, byte for byte except `Combobox.jsx` (the chevron), `Inputs.jsx` (the password shuffle), `Data.jsx` and `DatePickers.jsx` (the second motion pass), `Stepper.jsx` (its places). The React components specimens pass what the app takes: `lead` and `customIcon` an `Icon`, `kbd` a `Kbd`, `handle` and `chevron` an `Icon`.
- **Where:** `react_handoff/*`; `React components.dc.html`, the Field, Picker, Search, Shell and ListItem specimens.
- **What is still open:** none.

## Motion

- **The problem:** only small things moved: chevrons, the switch, the sidebar and tooltips. Panels, dialogs, sheets and folds appeared and vanished at once.
- **What changed:** five tokens set one pace for everything that moves: `--motion-in` 180ms, `--motion-out` 140ms, `--ease-enter` `cubic-bezier(0.2, 0, 0, 1)`, `--ease-exit` `cubic-bezier(0.4, 0, 1, 1)`, `--motion-rise` 4px. With them:
  - The combobox panel, a menu let out of its anchor, the date field's calendar, the range picker under a PeriodPicker's Custom, and a popover fade in and drop the last 4px from their trigger, rising instead when placed above. They close the same way back.
  - A dialog grows the last 2% into place over a fading scrim; a sheet rises from the bottom edge.
  - A card folding from its toolbar grows and shrinks by height; a facet group's values grow in as it unfolds.
  - The selection in a segmented control and in a PeriodPicker's window sizes slides to the option picked.
  - A row the reader adds drops in; a row they remove fades and closes up.
  - Nothing moves under `prefers-reduced-motion: reduce`, and no component looks different at rest.
- **What the app has to do:** a part mounted when it opens animates in from CSS alone, but its way out needs it kept mounted for `--motion-out` with `data-leaving="true"`, then removed: `Dialog` (on its `Scrim`), `Sheet`, `Popover`, and removed rows on `ListItem`, `Record` and table rows. A row the reader just added carries `data-added="true"` on its first render, set by the list, so a list loading its rows does not animate them.
- **Where:** `styles/tokens.css` (motion); `styles/components.css`, the motion block at the end; the same in `react/src/styles/`. Notes in `React components.dc.html` r4, r5, r6, r7, r9, r13.
- **What is still open:** none. Height folding needs `interpolate-size` and the sliding selection needs anchor positioning; a browser without them gets the instant change it had.

## The combobox chevron turns, and opens and closes the list

- **The problem:** the chevron pointed down whether the panel was open or not. In a searchable combobox it was drawn only: a press on it went through to the field, which opens the list but never closes it.
- **What changed:** open, the chevron turns to point up, over 120ms, the card chevron's turn, on both the select-style trigger and the searchable field. In the searchable field the chevron is a press target, as a native select's is: a press opens the list, a second press closes it, and the cursor stays in the field. Its target is the field's whole end, the icon's 12px inset included; it darkens on hover. It is not a tab stop: the field and its keys stay the way in for a keyboard. The select-style trigger already toggled on any press.
- **Where:** `styles/components.css`, `.sp-combobox .sp-field__chevron`, `.sp-combobox__trigger > .sp-combobox__chevron:last-child > *` and `.sp-combobox .sp-field__chevron > *`. `react_handoff/Combobox.jsx`, the searchable branch's `sp-field__chevron` span: `aria-hidden`, `onMouseDown` keeps focus in the input, `onClick={toggle}`. Make the same change in `react/src/components/Combobox.jsx`.
- **What is still open:** none.

## A date field on touch shows two calendars

- **The problem:** a native date field showed the browser's black calendar beside the date as well as the register's calendar in the trail. The rule that centres a date's value on iOS set `display: flex` on every date-family input, and in Chromium that packs the browser's glyph against the value, out from under the trail.
- **What changed:** the centring applies only in WebKit on touch (`@supports (-webkit-touch-callout: none)`). Elsewhere the glyph is back under the trail, so one calendar shows. No look changes.
- **Where:** `styles/components.css`, `.sp-input[type="date"]` and its time, month and datetime-local siblings.
- **What is still open:** none.

## The calendar's one-click days sat inside a second inset

- **The problem:** the date field's calendar opens with the range picker's row of one-click days (`sp-range__quick`), which brings its own 12px inset and divider, inside the calendar's own padding: a wide gap above and beside Today and Yesterday.
- **What changed:** inside the calendar the row takes the padding back and runs to the panel's edges, as it does in the range picker.
- **Where:** `styles/components.css`, `.sp-calendar > .sp-range__quick`.
- **What is still open:** none.

## later.md: A row that opens and has a drag handle puts a button inside a button

- **The problem:** `ListItem` and `NavItem` render a row that opens as a button or link, and the handle as a button inside it.
- **What changed:** decided: a row may both open and move. It is a plain box holding the two controls side by side: the handle button, then the open target, `sp-list-item__open`, a button or link holding the mark, the count and the words, stretched over the whole row. Actions sit outside it, above it. A press anywhere but the handle or an action opens the row; the open target's focus rings the row. The row looks as it does today. Please remove this entry from `later.md`.
- **Where:** `styles/components.css`, `.sp-list-item__open` and the rules after `.sp-list-item--opens`; `Components.dc.html`, Ordering by hand; `React components.dc.html` r6. In the app, `react/src/components/ListItem.jsx` and `NavItem` in `Shell.jsx`: with both `handle` and `to` or `onClick`, render the row as a `div` and put `to`/`onClick` on the `sp-list-item__open` element; give `handle` back its control on the One row and One nav item stories.
- **What is still open:** none.

## later.md: grey small text is under 4.5:1

- **The problem:** `--ink-5` (#8b8a82) is 3.46:1 on white, under the 4.5:1 small text needs; it is the meta lines, section labels, units, axis ticks and group heads.
- **What changed:** `--ink-5` is #72716b in the light theme, 4.90:1 on white and 4.53:1 on `--surface-2`, the lightest ground small text sits on. In the dark theme it is #90897e, 4.74:1 on `--surface`. It stays a step lighter than `--ink-4`. Please remove the grey text point from the later.md entry; its other points stay.
- **Where:** `styles/tokens.css`, both themes; the swatch table in `Dark mode and image viewer.dc.html`; `index.html`; `react/src/styles/tokens.css`.
- **What is still open:** please confirm the step between `--ink-4` (#6b6a63) and `--ink-5` (#72716b) still reads as two greys in the app. On `--bg` neither meets 4.5:1, so small text stays off the app background.

## react_handoff is the app's component files

- **The problem:** `react_handoff/` was behind the app: 40 exports the app has were missing, 25 shared exports took props this copy did not, and `NumberField` took `computed`, which the app had dropped. Two copies of one component is two components.
- **What changed:** the 25 component and helper files are now the app's, byte for byte, with three files the app's components import added: `Attachments.jsx`, `EmailLine.jsx`, `colour.js`. Every export carries the app's JSDoc, so the JSDoc check passes on them as they are. Not copied, since they belong to the app's build rather than the library: `Icon.jsx`, `icons.js`, `tabler.js`, `tabler/`, `Reorder.js`, and `Failed.jsx`, which reads the app's API client.
- **Where:** `react_handoff/*`; the file list and the harness note in `react_handoff/README.md`. Nothing to port: the app is the source.
- **What is still open:** none.

## The React components page loads the app's files

- **The problem:** the harness took each file's imports as values at load time, in a fixed order. The app's files import each other in a cycle (`Combobox`, `Shell`, `Inputs`, `Choice`), use `export async function` and `export let`, and need `createPortal`, `isValidElement`, `useSyncExternalStore`, `useNavigate`, and two helpers from outside the folder.
- **What changed:** a name is looked up when it is called, so the order and the cycle no longer matter; the export forms are read; the missing names have stand-ins, with `plural` and `useShellShape` written as `react/src/api/format.js` and `react/src/app/useMedia.js` write them. `FILES` adds `colour.js`, `EmailLine.jsx`, `Attachments.jsx`.
- **Where:** `React components.dc.html`, the logic class (`FILES`, `load`, `evaluate`).
- **What is still open:** none.

## The computed figure specimen is gone

- **The problem:** the inputs specimen drew "A computed figure" with `NumberField computed`, a prop the app no longer has.
- **What changed:** the specimen and its words in the label are removed.
- **Where:** `React components.dc.html`, the inputs specimen (Inputs, r4).
- **What is still open:** none.

## later.md: The design's React specimens pass a prop the combobox does not take

- **The problem:** the searchable combobox specimen passed `chevron`, which the combobox does not take.
- **What changed:** the prop is removed from the specimen. Please remove this entry from `later.md`.
- **Where:** `React components.dc.html`, the searchable combobox specimen.
- **What is still open:** none.

## The checker reads a component's own return only

- **The problem:** with the app's files, `styles/check.js` reported `NavItem` as rendering `.sp-sidebar__menu`: its root class is a variable, so the scan ran past the function into the next one.
- **What changed:** the root-class scan stops at the end of the component's own return. The previous copy still reports nothing.
- **Where:** `styles/check.js`, the react exports block.
- **What is still open:** none.

## A context provider is not an arrangement

- **The problem:** the checker reported `MenuHostOf` as "only an arrangement". It is the provider an Anchor or a record's menu wraps its menu in: it shares a value and draws nothing, which is what a provider is for.
- **What changed:** "no component is only an arrangement" skips a component whose whole body is a context provider over a memoised value.
- **Where:** `styles/check.js`, the arrangement rule.
- **What is still open:** none.

## Three components redraw another's root

- **The problem:** two components rendering one root class is two implementations of one thing. The checker finds three in `react/src/components/`.
- **What changed:** decided here, to be done in the app:
  - **`SidebarAccount`** renders `.sp-nav-item` markup of its own (`Shell.jsx`). It is a `NavItem` with the account's photo mark and a menu, so it composes `NavItem` (`mark`, `control`, `tip`, which `NavItem` already takes) instead of redrawing the row.
  - **`Records`** renders `.sp-list.sp-list--cards` (`List.jsx`). It is the List's record-card body, one of the three bodies a List has (`react_handoff/README.md`, List / Table), so it becomes a state of `List`, `body="cards"` with `head` and `footer`, and the `Records` export goes.
  - **`TokensField`** renders `.sp-combobox` around its `.sp-tokens` box (`Inputs.jsx`), to host the suggestion panel. `components.css` already names `.sp-tokens` "the field holding several values", not its own component, so it becomes the several-values state of `Combobox`, `multiple`, with the same props it takes now (`value` as an array, `onSearch`, `noun`, `marked`, `trails`, `end`); the `TokensField` export goes, and `Field` treats `Combobox multiple` as a value control, as it treats `TokensField` now.
  - No look changes: each keeps the classes it renders today.
- **Where:** `react/src/components/Shell.jsx` (`SidebarAccount`), `List.jsx` (`Records`, `List`), `Inputs.jsx` and `Combobox.jsx` (`TokensField`, `Combobox`), and their call sites in `react/src/pages/`. Copy the three files back into `design/react_handoff/` after the change, so the checker runs clean.
- **What is still open:** none.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `React components.dc.html` - the harness, specimens and motion notes.
- `Components.dc.html` - the opens-and-moves row note.
- `Dark mode and image viewer.dc.html`, `index.html` - the new `--ink-5` values.
- `react_handoff/*` - the app's component files, `Combobox.jsx` with the chevron change, and the folder's README.
- `styles/tokens.css`, `styles/components.css` - motion, the chevron, the date field, the calendar row, the open target, `--ink-5`.
- `support.js`, `components.js`, `icons.js`, `styles/doc.css`, `styles/pages/dark-mode.css` - what the pages load.
- `styles/check.js` - the checker.

Every page's stylesheet links move to `?v=v20261024n`; the other pages changed in nothing else and are not in the package.

## styles/check.js

    5 finding(s) across 27 pages
    
    one word per object - 3
       react: TokensField renders .sp-combobox
       react: Records renders .sp-list
       react: SidebarAccount renders .sp-nav-item
    
    one component per root class - 2
       react: .sp-combobox is rendered by Combobox and TokensField
       react: .sp-list is rendered by List and Records

The five findings are the three components in "Three components redraw another's root", each counted under its rules. They clear when the app change is copied back.

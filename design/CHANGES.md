# A closing drop-down keeps its place while it fades out

## Fixed from design_handoff_dropdown_close_jump

- **The width specimen's open lists covered the next specimen** (Components c5, "Combobox - the list's width"). `.doc-open-room` sat on the `.sp-card`, whose own padding wins over the layered doc rule, so the 150px room never applied. It is on the `.doc-specimen` now. No component rule changed.
- **The long option did not reach the cap.** It is longer now ("Garden furniture, outdoor storage and greenhouse supplies"), so the list is drawn at 288 with the name cut by the ellipsis.

Answers `Brief-drop-down-close-jump.md`, its second question (the list's width), and two later.md entries.

## 1. The panel jumps while it fades out

**The problem** - On Order edit, the Kind list is moved left to fit near the window edge. On close, `usePanelPlace`'s cleanup calls `reset()` as soon as `open` turns false, while `usePanelMotion` still draws the panel fading out (`data-closing`). The fade is drawn in the panel's default spot: 75px to the right, past the window edge, with a sideways scrollbar for about a quarter second. The same happens to any panel that was hung from an edge, lifted out of a clipping box, turned upwards or capped in height.

**What changed** - A closing panel keeps its placement until its fade-out has ended, then goes back to its own spot. The motion is unchanged.
- `usePanelPlace` no longer resets in its cleanup; the cleanup only removes the scroll and resize listeners. The reset is `unplace(list)`, shared.
- New internal hook `usePanelRest(panel, open, closing)` in `Combobox.jsx`: a layout effect that calls `unplace` once `open` and `closing` are both false. It runs in the commit that drops `data-closing`, before paint, so the panel is hidden and back in its spot in the same frame.
- Called after `usePanelMotion` in `ComboboxOne` and `ComboboxMany` (`Combobox.jsx`) and in `useMenuPlace` (`Overlays.jsx`), so every select, the chip combobox and every menu opened from a button.
- `DatePickers.jsx` uses `usePanelMotion` without `usePanelPlace`: unchanged.

**Where** - `react_handoff/Combobox.jsx` (`usePanelPlace`, `usePanelRest`, `ComboboxOne`, `ComboboxMany`), `react_handoff/Overlays.jsx` (`useMenuPlace`); app files `react/src/components/Combobox.jsx`, `react/src/components/Overlays.jsx`. Drawn as a note in Components c5 ("A closing list fades where it stood").

**What is still open** - `react/src/pages/vendorsCategories.jsx` calls `usePanelPlace(anchor, panel, !touch)` and never fades. Since the cleanup no longer resets, it needs one line after it: `usePanelRest(panel, !touch)`, so a switch to touch still clears the placement. Please confirm once it is in.

## 2. The list's width

**The problem** - `.sp-combobox__panel` had `min-width: 232px`. The Kind field on Order edit is 157px wide, so its list was 75px wider than the field although its options fit, which is also why it had to hang from the right edge near the window edge.

**What changed** - Decided: a list is the field's width, and grows past it only when an option would not fit, up to 288px; an option longer than that is cut with an ellipsis. 288 is the width `.sp-combobox--end` already uses.
- `.sp-combobox__panel`: `min-width: 232px` replaced by `width: max-content; min-width: 100%; max-width: 288px`.
- New rule: `.sp-combobox__option > span:not(.sp-combobox__dot, .sp-combobox__meta, .sp-combobox__check, .sp-mark)` takes `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, so an option's name stays on its line.
- `.sp-chat__saved-menu .sp-combobox__panel` keeps its 320 with `max-width: none`.
- `usePanelPlace`: a panel lifted out to `position: fixed` also gets `minWidth` set to its measured width, since a fixed panel's `min-width: 100%` would be the window's.
- `.sp-combobox--end` (288) is unchanged.

**Where** - Components c5, new specimen "Combobox - the list's width" (Kind at 157 with its list at 157; a Category list grown to 288 with a long option cut) and the note "The list is the field's width". `styles/components.css`: `.sp-combobox__panel`, the option rule after `.sp-combobox__check`, `.sp-chat__saved-menu .sp-combobox__panel`. `react_handoff/Combobox.jsx` (`usePanelPlace`). App: `react/src/styles/components.css`, `react/src/components/Combobox.jsx`. Reaches every select and chip combobox; the narrow ones (Kind, Status, the Date row) most.

**What is still open** - Nothing.

## 3. later.md: "The app's components and their use differ from Claude Design"

Settles the entry. Each line of `storybook/design-differences.json`:

**The problem** - `npm run design:check` and `npm run props:check` report four app-only files and eight places where a page passes a kind of value the component's JSDoc does not name.

**What changed**
- **`Failed.jsx`, `Icon.jsx`, `icons.js`, `tabler.js`** - they stay in the app, as `react_handoff/README.md` already states: the harness draws icons from the project's `icons.js`, and `Failed.jsx` reads the app's API client. Not a difference: list them as accepted in `design-differences.json` (or exempt them in the check) rather than as `appOnly`.
- **`<BulkBar count>` given text** (`BudgetCheck.jsx`, `Orders.jsx`) - the pages are right; the design draws "3 selected". JSDoc now `{string} props.count What is picked, written out, such as 3 selected.`
- **`<FieldGroup count>` given text** (`Orders.jsx`, "128 total") - the design draws "12 total" on a folded head. JSDoc now `{number | string}`.
- **`<ListItem count>` given '!'** (`OrderForm.jsx`) - the design draws the attention row with "!" (Duplicate and alerts, Home, States and confirmations). JSDoc now `{number | '!'}`.
- **`<Sum value>` given a drawn part** (`Order.jsx`, `VendorForm.jsx`, `vendorsCategories.jsx`) - legitimate: a link to the vendor, the categories, a note's well, a loading line. JSDoc now `{import('react').ReactNode}`.
- **`<Segmented value>` given a number** (`Budget.jsx`, the months) - legitimate. JSDoc of `options[].value`, `value`, `defaultValue` and `onChange` now `string | number`.

**Where** - `react_handoff/List.jsx` (BulkBar), `Choice.jsx` (FieldGroup), `ListItem.jsx`, `Data.jsx` (Sum), `Segmented.jsx`; the app's same files in `react/src/components/`; `storybook/design-differences.json`.

**What is still open** - Nothing. Remove the later.md entry once the check is clean.

## 4. later.md: "The whole pages in Storybook have accessibility faults"

Settles the entry, except its contrast line (see below).

**The problem** - In `storybook/pages/Pages.stories.jsx`: names that do not hold the drawn words, an empty column head, and controls inside controls.

**What changed**
- **Sidebar rows** ("All orders, 441") - a row is named by the words it draws: no `aria-label` on a `NavItem`; its name is its label and count as drawn. Remove the `aria-label` in `react/src/app/views.jsx` (`SidebarViews`). Navigation shell 9b.
- **Statistics share rows** ("Transport, 4,795 kr.") - same rule: no `aria-label`, the name is what the row draws. `react/src/pages/Statistics.jsx`. Order statistics 4a.
- **The bookmark's empty picture strip** - still the link to the shop; its name starts with what it draws: "No picture, open at" and the domain. `react/src/pages/Bookmarks.jsx`. Bookmarks 22a.
- **The lists' last column head** (`.sp-col-menu`) - holds "Actions" in a `.sp-announce` span: read out, drawn nowhere. Orders, Vendors, Categories (`react/src/components/List.jsx`). Order list 2a.
- **The line photo's Add box** - a label around its file input takes no role and no `aria-label`; the input is named "Add the line's photo". `Mark` already reports an `aria-label` on `as="label"`; the page passes it. `react/src/pages/OrderForm.jsx`. Order create 3a.
- **Large marks on the order and vendor forms** - a mark that holds its remove control is now `role="group"`, not `img`, since an image may hold no control. One that also opens is already the open button and the remove button side by side. `react_handoff/Mark.jsx`; app `react/src/components/Mark.jsx`, used from `react/src/pages/OrderParts.jsx`. Order create 3a.

**What is still open** - The grey text in a bookmark's empty picture box and address line (under 4.5:1) is left for the colour pass, as decided for the contrast entry. Please confirm the entry is split: the contrast line moves into "The Storybook's accessibility check finds faults in the components", and the rest is removed.

## 5. later.md entries not done in this pass

- **"The Storybook's accessibility check finds faults in the components"** - every contrast line is kept for a separate colour pass, as decided in this chat. The drop zone's control inside a control was answered before (a label around its file input, the platform's own pattern).
- **"Large accounts still make everyone wait"** and **"A deleted record should not be removed for good at once"** - not design fixes for this project. The second has an open question for Claude Design: where "Recently deleted" lives. Please confirm when it should be drawn.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - c5: the list width specimen and the two notes.
- `Navigation shell.dc.html`, `Order statistics.dc.html`, `Bookmarks.dc.html`, `Order list.dc.html`, `Order create.dc.html` - the naming notes of section 4.
- `support.js`, `components.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets; `components.css` holds the panel width and option rules; `doc.css` adds `.doc-w157` and `.doc-open-room` (on the specimen) for the drawing.
- `styles/pages/navigation-shell.css`, `order-create.css`, `order-list.css`, `order-statistics.css` - linked by the changed pages.
- `react_handoff/Combobox.jsx`, `Overlays.jsx` - the close timing and the fixed width.
- `react_handoff/Mark.jsx` - the group role.
- `react_handoff/List.jsx`, `Choice.jsx`, `ListItem.jsx`, `Data.jsx`, `Segmented.jsx` - the JSDoc types.

## styles/check.js

    0 finding(s) across 27 pages

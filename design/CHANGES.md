# Brief: three questions from building the motion update

Answers the three questions the app could not build from `design_handoff_motion_second_pass_fixed`, the points it raised for information, and the design entries in the repo's `later.md`.

## 1. A dialog, sheet or popover closes with the fade inside a Leaving

**The problem** - The package said the component keeps a `Dialog` (on its `Scrim`), `Sheet` or `Popover` mounted for `--motion-out` with `data-leaving="true"`. But a page removes these parts at once (`{open ? <Dialog .../> : null}`), about 124 times, and the components had no way to stay after the page removed them.

**What changed** - One new component, `Leaving`, in `Overlays.jsx`. The page keeps its condition and wraps it:

    <Leaving onClosed={() => ...}>{open ? <Dialog ...>...</Dialog> : null}</Leaving>

- When its child goes, `Leaving` keeps the part it last drew, with the words and figures it had then, so a page that clears its record on close (`order` set to null) needs no guard. It holds the part for `--motion-out`, then removes it and calls `onClosed`.
- While it is held, the parts under it mark themselves `data-leaving="true"` from a context, `Leaves` (`Utilities.jsx`): `Scrim` (`Shell.jsx`), the `Dialog` panel when it is a sheet on touch, `Sheet` (`Touch.jsx`) and `Popover`. The CSS rules for that state are already in `components.css`.
- A closing part answers nothing more: `Dialog` ignores Escape and a press on the backdrop, and `Sheet` ignores the pull on its handle.
- Opened again before the fade ends, it stays open. Under reduced motion it goes at once.
- A part outside a `Leaving` is removed at once, as it is now, so call sites can move over one at a time.
- An `open` prop was weighed and not taken: the page would always render the part, so every call site that reads a record the close clears (`order.name`) would need a guard.

**Where** - `react_handoff/Overlays.jsx` (`Leaving`, `Dialog`, `Popover`), `react_handoff/Touch.jsx` (`Sheet`), `react_handoff/Shell.jsx` (`Scrim`), `react_handoff/Utilities.jsx` (`Leaves`, `inMs`). `React components.dc.html` r7: the note "Closing with the fade" and a live specimen, the delete dialog opened over the page and closed in a `Leaving`. App: the same in `react/src/components/`, then each `Dialog`, `Sheet` and `Popover` in `react/src/pages/` and `react/src/app/` wrapped in a `Leaving`. Add a closing story to `storybook/stories/Overlays.stories.jsx` and `Touch.stories.jsx`.

**What is still open** - Nothing.

## 2. The account row is a NavItem whose whole row is the button

**The problem** - The last package said `SidebarAccount` composes `NavItem` with `mark`, `control` and `tip`. But a `NavItem` with a `control` is a `label` around a Switch, and the account row is one button that opens the account menu.

**What changed** - No `control`. `SidebarAccount` is a `NavItem` drawn as its button, which `NavItem` already is when it has `onClick`:

- `mark` - the photo, or the initials on `green-3`, both hidden from screen readers.
- The label - the name over the address (`EmailLine`, tone `nav`), as before.
- `trail` - the up chevron (`sp-combobox__chevron`), hidden from screen readers.
- On the button - `aria-haspopup="menu"`, `aria-expanded`, Up and Down to open the menu at its last or first item, `tip` on the rail while the menu is closed.
- The focus ring is the nav row's own. The menu is placed as before: above the row at its width, or beside the mark on the rail.
- The button's name is the words drawn on it, the name and then the address. This settles the account point of the later.md accessibility entry.
- `NavItem` gains one prop, `ref`, set on its button, link or label, which the account menu places itself against.
- Nothing looks different.

**Where** - `react_handoff/Shell.jsx`, `NavItem` (`ref` and its JSDoc) and `SidebarAccount`. `React components.dc.html` r12: the sidebar specimen ends with the account row and its menu, in place of a plain Account row, and the note "The account row". App: `react/src/components/Shell.jsx`; `react/src/app/AppShell.jsx` passes the same props as now; `storybook/stories/Shell.stories.jsx`.

**What is still open** - Nothing.

## 3. Small grey text on a toast

**The problem** - The new `--ink-5` is 3.55:1 on the light theme's toast (#72716b on #1b1a17) and 4.07:1 on the dark theme's (#90897e on #2e2b26). The countdown beside Undo is small grey text, so both are under 4.5:1.

**What changed** - On a toast, `--ink-5` is #8b8a82 in the light theme (5.02:1), the value the app already uses, and `--ink-4` #a8a29a in the dark theme (5.57:1). Both are values the system has; no new colour. A toast that asks sits on the page's own surface, so it keeps the page's grey. The r8 toast specimen shows the countdown.

**Where** - `styles/components.css`, after `.sp-toast--compact`: `.sp-toast:not(.sp-toast--asks)` and its dark theme rule. `React components.dc.html` r8, the note "Grey on a toast". App: `react/src/styles/components.css`; the override in `app.css` (`.sp-toast { --ink-5 }`) goes.

**What is still open** - Nothing.

## 4. List's bodies are `table` and `cards`

**The problem** - The package named `body="cards"` and not the other value. The app calls it `table` (`'table' | 'cards'`, default `table`).

**What changed** - `table` is right. Keep it.

**Where** - `react/src/components/List.jsx`.

**What is still open** - Nothing.

## 5. A duration is read in its own unit

**The problem** - `PasswordField` and `useCounted` read `--motion-in` with `parseFloat`, which assumes milliseconds. The built stylesheet writes 180ms as `.18s`, so the shuffle and the counting lasted under a millisecond.

**What changed** - One helper, `inMs(token, fallback)` in `Utilities.jsx`, reads a duration token in milliseconds whichever unit it is written in. `PasswordField`, `useCounted` and `Leaving` use it.

**Where** - `react_handoff/Utilities.jsx` (`inMs`), `Inputs.jsx` (`PasswordField`), `Data.jsx` (`useCounted`), `Overlays.jsx` (`Leaving`). App: use the one helper from `Utilities.jsx` in place of the local `inMs` in `Inputs.jsx` and `Data.jsx`.

**What is still open** - Nothing.

## 6. The app's changed component files are not in react_handoff yet

**The problem** - The app did not copy `Combobox.jsx`, `List.jsx`, `ListItem.jsx`, `Shell.jsx` and `Inputs.jsx` back into `design/`. Only this project changes `design/`, so it should take them in.

**What changed** - Nothing yet. On `main` at 2026-10-24T15:29Z these files do not have the change: `List.jsx`, `ListItem.jsx` and `Shell.jsx` are the same as `react_handoff/` before this package, and `Combobox.jsx`, `Inputs.jsx` and `Data.jsx` are missing the last package's motion changes. So the build is on another branch. `react_handoff/` here is the last package's files with this package's changes on top.

**Where** - `react_handoff/`.

**What is still open** - Please confirm the branch the motion update is on. The next pass takes those files into `react_handoff/` with this package's changes merged in. The four checker findings below clear then.

## 7. later.md: the remaining accessibility faults in the components

**The problem** - The later.md entry "The Storybook's accessibility check finds faults in the components" lists five faults besides the grey text, which the last package settled.

**What changed** - All five are fixed, with no change to how anything looks:

- **`Mark`** - a mark named by `aria-label` on a `span` or `label` takes `role="img"`, so the name is read out. A hidden mark, a button mark and one that names itself from its initials are as they were.
- **Combobox** - the option's `li` is `role="none"`, a group head and the empty line are `role="presentation"`, and a separator's `li` is `role="none"` with its `hr` hidden. The listbox now holds only options.
- **`Picker`** - the custom colour, a `label`, no longer carries `aria-pressed`. It says it is chosen with `data-chosen="true"`, which draws the chosen ring as before.
- **`Palette`** - the dialog is named by its `label`, the search's name.
- **`SidebarAccount`** - its name is the words on it (section 2).

Please remove the entry from `later.md`.

**Where** - `react_handoff/Mark.jsx`, `Combobox.jsx` (`ComboboxOption`, `ComboboxGroup`, `ComboboxSeparator`, `ComboboxEmpty`), `Choice.jsx` (`Picker`), `Shell.jsx` (`Palette`, `SidebarAccount`). `styles/components.css`: `label.sp-option--swatch[data-chosen="true"]` and its focus rule replace the `aria-pressed` ones on the label. App: the same files in `react/src/components/` and `react/src/styles/components.css`; then drop `knownAccessibilityFaults` from the stories that pass.

**What is still open** - Nothing.

## 8. later.md: the Files Docs page opens under the file viewer

**The problem** - On Fields/Files' Docs page, the viewer story starts open, and its dark box covers the props table and the other examples.

**What changed** - On the Docs page the viewer story is drawn closed, behind its Open button, as other stories that open over the page are. Its own story page still opens it. No change to the design.

**Where** - `storybook/stories/FileDrop.stories.jsx`, the viewer story. Please remove the entry from `later.md`.

**What is still open** - Nothing.

## 9. later.md: entries the last package settled

**The problem** - Two entries are still in `later.md` but were settled in `design_handoff_motion_second_pass_fixed`: "A row that opens and has a drag handle puts a button inside a button" (its section "later.md: A row that opens and has a drag handle") and "The design's React specimens pass a prop the combobox does not take" (the specimen passes no `chevron`).

**What changed** - Nothing new to design.

**Where** - Please remove both entries in the change that applies them.

**What is still open** - Nothing.

## 10. later.md: entries left as they are

- **Large accounts still make everyone wait** - a server question, nothing to draw.
- **A deleted record should not be removed for good at once** - "Recently deleted" is left for later, decided 24 Oct 2026, so nothing is drawn for it yet. Please confirm: its other open questions (how long a copy is kept, which kinds, bulk delete) stay open with it.

## 11. The checker reads a rule's real scope

**The problem** - `styles/check.js` found a menu rule "declared 2× identically". The second copy is in the motion block and is live: it resets a transition delay the block's own shorthand sets. The checker took the nearest at-rule as a rule's scope. That at-rule was an `@supports` that had already closed, so the rule read as top level.

**What changed** - A rule's scope is the innermost at-rule still open at it. Duplicates count only within one scope.

**Where** - `styles/check.js`, `scopeOf` and the duplicate rule.

**What is still open** - Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `React components.dc.html` - r7, r8 and r12 notes and specimens; loads `react_handoff/`.
- `react_handoff/*` - the component files: `Overlays.jsx`, `Touch.jsx`, `Shell.jsx`, `Utilities.jsx`, `Inputs.jsx`, `Data.jsx`, `Mark.jsx`, `Combobox.jsx`, `Choice.jsx` changed; the rest are what the page loads.
- `styles/components.css` - the toast grey, the custom colour's chosen state.
- `styles/tokens.css`, `styles/doc.css`, `support.js`, `icons.js` - what the page loads.
- `styles/check.js` - the checker.

Every page's link to `components.css` moves to `?v=v20261024o`. The other pages changed in nothing else and are not in the package.

## styles/check.js

    4 finding(s) across 27 pages

    one component per root class - 2
       react: .sp-combobox is rendered by Combobox and TokensField
       react: .sp-list is rendered by List and Records

    one word per object - 2
       react: TokensField renders .sp-combobox
       react: Records renders .sp-list

These are `TokensField` and `Records`, decided in the last package and built in the app. They clear when those files are taken in (section 6).

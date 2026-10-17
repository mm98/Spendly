# Changes: Import in Settings, Statuses, the phone's two-line gap, and design/README.md

Answers "Brief: Import in Settings, Statuses, the phone's two-line gap, and design/README.md", and a bug reported alongside it in the searchable combobox.

Fixed from `design_handoff_import_statuses_fixed_2`:

- `CHANGES.md` is rewritten so that every point states the problem, what changed, where, and what is still open.
- The scan choices on the phone and in Order create 3a now space a title and its second line at 2, as confirmed (point 5).

The `.dc.html` pages are design references built in HTML, not production code. Open them in a browser from this folder. No token, size or colour changed.

## 1. Undo in Previous imports asks first

**The problem.** Undo deletes every order the import wrote, the vendors and categories it created when nothing else uses them, and orders changed since the import together with those changes. The design drew both Undo buttons as plain outline buttons with nothing before them. That contradicted the Button rule that a destructive button opens a dialog first. In the app both buttons acted at one click. No import from the last 24 hours was drawn in Previous imports, so its Undo was never shown.

**What changed.**
- Both Undo buttons open "Undo this import?" before anything is deleted.
- The body names the file and its import date, the orders and item lines it wrote, and the vendors and categories it created that nothing else uses now. A part with a count of zero is left out.
- A second line, "2 of these orders were changed after the import. They are deleted too, with the changes.", appears only when at least one order was edited after the import, and carries that count.
- The buttons are Keep the orders and Delete 41 orders (danger). The button carries the order count.
- Both Undo buttons stay outline, like any button that opens a dialog.
- Previous imports now draws webshop-orders.csv, 3 Oct, 41 orders, 3 skipped, inside its 24 hours, with Undo beside Reuse mapping. Its meta line carries `sp-truncate`, like its title, so it stays on one line beside the two buttons.

**Where.**
- `Settings and import.dc.html` 11b: stage 1's Previous imports card, the dialog under stage 4, and the notes.
- App: `react/src/pages/SettingsImport.jsx`, `History` and the done stage.

**What is still open.** Nothing.

## 2. Leaving an import before it is written

**The problem.** A reader could choose a file, match its columns, then click another page. The import was lost with no warning, and coming back started again at choosing a file. Forms and Settings ask "Leave without saving?", but 11b said nothing about an import left halfway.

**What changed.** Confirmed as proposed.
- From the moment a file is chosen until Import N orders is pressed, the import counts as unsaved changes.
- Leaving in stages 2 or 3 (another page, the sidebar, Back, closing the tab) asks "Leave without saving?", the same dialog as an edited order or a dirty Settings card.
- Keep editing stays on the stage with every choice kept. Leave discards the file and the mapping, and the import starts again at stage 1.
- Cancel in stage 3 asks the same question.
- Stage 1 and stage 4 ask nothing: at stage 1 nothing is chosen yet, and at stage 4 the orders are already written.
- A mapping is saved for Reuse mapping only when an import is written.

**Where.**
- `Settings and import.dc.html` 11b: the dialog under stage 4, and the notes.
- App: `react/src/pages/Settings.jsx` (the leave warning), `react/src/pages/SettingsImport.jsx`, `react/src/pages/SettingsImportMap.jsx`.

**What is still open.** Nothing.

## 3. Removing a line from Previous imports, and keeping its orders

**The problem.** A line left Previous imports only when newer imports pushed it out. A one-time import whose mapping is never needed again stayed in the list with nothing left to do there. The only way to remove it was Undo, which also deletes its orders.

**What changed.**
- A small x (`sp-icon-btn--small`, tooltip "Remove from this list") sits at the end of a line older than 24 hours, after Reuse mapping.
- It hides the line from the list only. The orders do not change and keep their link to the import, so the order list's import chip still filters to them and still reads the file date.
- Removing a line shows the toast "orders_2025.csv removed from Previous imports", with Undo.
- A line inside its 24 hours has no x. It can be removed once its Undo has gone. A line never hides its own Undo, so there is no state to draw for a line waiting on Undo.
- Server: a hidden flag on the import. The list leaves hidden imports out; reading one import by id ignores the flag.

**Where.**
- `Settings and import.dc.html` 11b: the x on the two older lines, the toast under the card, and the notes.
- App: `react/src/pages/SettingsImport.jsx` (`History`), `api/src/routes/imports.js`, `react/src/pages/Orders.jsx` (the `import` filter, which must still work for a hidden import).

**What is still open.** Nothing.

## 4. Statuses: Returned and Cancelled are built in

**The problem.** 11a marked only Draft as built in and gave Cancelled, with no orders, a delete button. The app marks Draft, Ordered, Delivered, Returned and Cancelled built in and lets none of them be deleted. It knows Returned and Cancelled by what they mean, not by their name, and a new status with the same name does not bring that back. A scanned return receipt would then count as spending, demo data would make Returned orders that count as spending, and an imported "Cancelled" would count as spending and not be struck out.

**What changed.**
- Ordered, Returned and Cancelled carry the "built in" pill beside Draft. Delivered is the row drawn mid-rename as Received.
- Cancelled has no delete control.
- Built-in rows other than Draft keep the pencil, since a rename changes only the name.
- The note says why built-in statuses are never deleted. A status the reader added can be deleted once no orders use it.
- The app does not change.

**Where.**
- `Settings and import.dc.html` 11a: the Statuses card and its note.
- App: `react/src/pages/SettingsStatuses.jsx`. No change.

**What is still open.** Nothing.

## 5. The phone: two lines of text, 2 or 6 apart

**The problem.** The comment on the phone rule said every title with a line under it is 2 apart, with no gap of its own. The drawings gave many pairs 6, and the app followed the drawings. Taken literally, the rule would also pull a label 2 from its field.

**What changed.**
- The 2 belongs to a title with its second line. That pair is `.sp-stacked`, which is 2 on every screen, desktop and phone. List cards get their 2 from it.
- The phone rule `.ms-device .sp-stack` does not space those pairs. It applies only to a plain `.sp-stack` with no gap class inside a phone frame: the budget rows under their group, a stat figure over its line, and the vendor checklist in the filters. Its comment is rewritten to say this. Nothing renders differently.
- These places keep 6, and the app is right to show it:
  - Limit alerts. `.sp-alert__body` spaces its own title and note.
  - Notices and toasts, which the component spaces.
  - Filter labels above their controls, and form labels above their fields. These are a label and its control, not a title and its second line.
- The scan choices, "Read it again" and "New order from the saved reading", are a title with its second line. As confirmed, they are now `.sp-stacked` at 2, on the phone and on desktop.

**Where.**
- `styles/pages/mobile-screens.css`: the comment on `.ms-device .sp-stack`.
- `Mobile screens.dc.html` 7a, the scan choices screen: two pairs from `sp-stack sp-gap-6` to `sp-stacked`.
- `Order create.dc.html` 3a, "If that is not what you meant": the same two pairs.
- App: the scan choices on every screen that shows them. The gap goes from 6 to 2.

**What is still open.** Nothing.

## 6. design/README.md lost its overview

**The problem.** The upload of 15 October that answered the Home card order brief replaced the whole of `design/README.md` with that package's note. The overview was gone: what each file is, the state of the checks, the settled rules for card heads, rows that open and copy. Since then each package has written its note as `README.md` and replaced the one before it. On main, the file now holds the switch knob note.

**What changed.**
- `README.md` is the overview again: the reading order, what each file is, the state of the checks, the settled rules for card heads, rows that open and copy, and what is known and open.
- A package's note is `CHANGES.md`, beside it, and never `README.md`. An upload replaces the last note and never the overview.

**Where.**
- `README.md` and `CHANGES.md` at the root of `design/`.

**What is still open.** The old text could not be read from the commit before "Add files via upload" on 15 October, so the overview is written from the current pages, `PROJECT-RULES.md` and `CLAUDE-CODE-PROMPT.md`. Please confirm that nothing from the old text is missing.

## 7. The searchable combobox would not let its text be deleted

**The problem.** In a searchable combobox, deleting the last letter of what was typed put the chosen value straight back into the field. Selecting the text with Shift+Home and pressing Delete did the same. The field showed the typed text, or the chosen value when the text was empty, so an empty field always refilled itself. Shift+Home did not select at all: while the list was open, the component took Home and End to jump to the first and last option.

**What changed.**
- While the reader edits, the field shows exactly what they typed, empty included.
- Leaving the field, Escape, or picking an option ends the edit, and the field shows the chosen value.
- In a searchable combobox, Home and End move the cursor and Shift+Home and Shift+End select, as in any text field. Only a combobox with a button trigger uses them to jump to the first and last option.

**Where.**
- `react_handoff/Combobox.jsx`: the editing state, the field's shown value, the option pick, and the Home and End keys.
- App: `react/src/components/Combobox.jsx`, the same changes.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged from the project root
- `CHANGES.md` - this note
- `Settings and import.dc.html` - 11a statuses, 11b Previous imports, the two dialogs, the toast, the notes (points 1-4)
- `Mobile screens.dc.html` - the scan choices at 2 (point 5)
- `Order create.dc.html` - the scan choices at 2 in 3a (point 5)
- `react_handoff/Combobox.jsx` - the searchable combobox fix (point 7)
- `styles/pages/mobile-screens.css` - the rewritten comment (point 5); also loaded by Mobile screens
- `styles/pages/settings.css`, `styles/pages/budget.css`, `styles/pages/order-create.css` - loaded by the pages above
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - loaded by every page
- `support.js`, `components.js`, `icons.js` - loaded by the pages to open from this folder

`styles/check.js`: 0 findings across 26 pages.

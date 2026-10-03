# Spendly - brief 5 answers: category icons from the whole Tabler library

Copy these files over the brief 4 package. Nothing else changed.

- **Accepted.** A category's icon can be any Tabler outline icon, stored by its Tabler name. The interface still uses register icons only.
- **c7 (Components)** now draws and notes the category icon picker:
  - Before typing: 24 common, general icons, the current icon first if it is not among them. No Show all; search reaches the rest. The list: tag, home, shopping-cart, basket, tools-kitchen-2, car, bike, gas-station, bus, plane, paw, plant, baby-carriage, shirt, first-aid-kit, pill, school, device-laptop, device-mobile, gift, armchair, lamp, tool, wallet.
  - Search: the whole library, matching the Tabler name, its tags (aliases in Tabler's icons.json) and its category; names rank before tags before categories. "fuel" finds gas-station. 48 results at a time, best first, then a More cell for the next 48.
  - No match: one line, `No icon matches "...". Try another word, in English.`
  - Loading: skeleton tiles at --mark-medium in the same grid; the field works at once and filters what has arrived.
  - A saved name Tabler no longer has shows as `tag` everywhere; the picker opens on tag; the saved name is kept until the user picks again.
  - Outline only, unmodified, never uploaded, never drawn by hand, the same mark on every page.
- **Where the catalogue lives:** beside `icons.js`, not in it. A separate set of files shipped with the app: an index (name, tags, category) and the path data in parts. The picker loads the index when it opens; a category mark elsewhere loads only the icons its page shows, and caches them. In README, `icons.js` stays "the icon register" (the interface's); add the catalogue as its own entry.
- **Vendors and categories:** "a glyph from a fixed set" now reads "any icon from the Tabler outline library, picked in c7".
- **Icon legend:** the register rule covers the interface's icons; a category's icon is the one exception.

- **New order (sidebar row, rail +, phone FAB)** opens New order step 1, Order create 3a: scan a receipt, an empty order, or a copy. Actions inventory 16a said "opens a blank order in edit"; it now matches 3a and the shell notes.

- **Scan receipt** (the sidebar's green row, the rail's capture tile) opens the file picker at once; the chosen file goes to 3a step 2, reading, skipping step 1. Cancelling the picker stays on the current page. Unsaved changes prompt only once a file is chosen. No Scan receipt on a phone; the New order FAB opens step 1. Written in 16a, 3a and 9a.

## Files

- `Components.dc.html`
- `Vendors and categories.dc.html`
- `Icon legend.dc.html`
- `Actions inventory.dc.html`
- `Order create.dc.html`
- `Navigation shell.dc.html`

`styles/check.js` reports the same 84 known findings.

# New order on a phone: 3a steps 1 and 2, 3b and 3c

Answers "We need mobile version of 3a of step 1 and 2", the follow-up "3b, 3c need mobile version also", the note from Claude Code on the step 2 card, and the comment that the suggestion chips are too big on mobile.

## 1. 3a step 1 on a phone

- **The problem:** step 1 was drawn for desktop only. The receipt zone said "Drop receipt here", which a phone cannot do, and the two other ways to start sat in two columns.
- **What changed:** the phone keeps the app's frame: the search top bar and the tab bar with Orders current. The zone reads "Add a receipt", with the formats line under it and no button. The whole zone is the tap target: the same label around the one file input, so the phone's picker offers camera, photos and files. The body reads "Add a PDF or a photo...". Empty order and Copy an order stack in one column, each card full width.
- **Where:** `Order create.dc.html` 3a, "Step 1 · phone", with its notes. `styles/pages/order-create.css`: `.oc-choices--stack` (one column). App: the new-order page in `react/src/pages/` that renders step 1, below 640px.
- **What is still open:** please confirm "Add a receipt" with no button.

## 2. 3a step 2 on a phone

- **The problem:** on a phone the receipt preview kept its desktop size (156 x 220), which left about 160px for the text beside it. The file name was cut to "abc..." and the steps wrapped onto two lines (Claude Code's screenshots).
- **What changed:** the receipt is a large mark (`sp-mark--large sp-mark--photo`) beside the file name and its meta line, showing the receipt's first page cropped. The file name truncates at the card's width. The gauge, the steps and the hint run full width under it. Discard is a full-width outline button at the bottom of the card (`sp-btn--block`), as every button in a phone card is (3c). The same frame as step 1: search top bar and tab bar.
- **Where:** `Order create.dc.html` 3a, "Step 2 · phone", with its notes. App: the reading card on the same page, below 640px.
- **What is still open:** please confirm the mark instead of the preview, and Discard full width.

## 3. 3b Copy an order on a phone

- **The problem:** 3b was drawn for desktop only.
- **What changed:** the picker is a sheet below 640px, the dialog's phone form (c13): the same heading, body, search and two groups, with Cancel as a full-width button at the bottom. Dragging the sheet down is Cancel. Tapping an order opens the copy at once. What you land on is the phone edit screen (Order editing layouts 1c): Back and the title New order with the vendor and Today under it, the copy notice without its own Discard, the items, Order details folded, and the save bar with the total, Discard and Create. No Attachments card until a file is added.
- **Where:** `Order create.dc.html` 3b, "The picker · phone" and "What you land on · phone", with their notes. App: the copy picker and the new-order edit page, below 640px.
- **What is still open:** nothing.

## 4. 3c Scanned before on a phone

- **The problem:** 3c's phone form was drawn only in Mobile screens 7a, not beside its own screen.
- **What changed:** the same screen, now drawn in 3c: Back and the title Scanned before with the file name under it, each choice its own card with a full-width button, and Discard the upload at the end.
- **Where:** `Order create.dc.html` 3c, "Stage 2, replaced · phone". Matches `Mobile screens.dc.html` 7a, unchanged.
- **What is still open:** nothing.

## 5. Suggestion chips are smaller on a phone

- **The problem:** on touch every chip that acts takes the 48px touch height, so "+ Lighting" and "+ New: Seating" stood 48px tall under the 30px chips in the Categories field.
- **What changed:** a new chip variant, `sp-chip--suggestion`, used beside `sp-chip--dashed` on a suggestion under a field. On touch it is drawn at 36px (new token `--chip-h-touch`) with the 48px touch height as an invisible `::before` tap area above and below. Desktop is unchanged. Only suggestion chips change: "Empty" and every other chip that acts stays 48px on touch.
- **Where:** `styles/tokens.css` `--chip-h-touch`. `styles/components.css` `.sp-touch .sp-chip--suggestion:not(.sp-chip--static)` and its `::before`. `Components.dc.html` c6, States note and the chip specimen. `Order create.dc.html`, every suggestion. `react_handoff/Chip.jsx`: `variant="suggestion"` (classes `sp-chip--dashed sp-chip--suggestion`), with its JSDoc. App: `react/src/components/Chip.jsx`, and the category suggestions under the Categories field use `variant="suggestion"`. `styles/check.js` asserts every "+ ..." chip carries the class.
- **What is still open:** nothing.

## later.md: The design does not say yet that the arrow keys page Statistics

- **The problem:** Budget's design says the arrow keys page its months; the Statistics design did not say the same for its periods, though the app does it.
- **What changed:** a note on the period control: the left and right arrow keys step to the previous or next period, as on Budget, and do nothing while a field or a list has the focus, while a modifier key is held, on a custom range, or past the newest period.
- **Where:** `Order statistics.dc.html` 4a, Notes for implementation, before "The period bar wraps rather than squeezing". This settles the later.md entry: please remove it.
- **What is still open:** nothing.

The other two later.md entries (large accounts waiting; a deleted record kept for a while) are left for later, as decided earlier.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Order create.dc.html` - the phone screens for 3a steps 1 and 2, 3b and 3c, and the suggestion chips.
- `Order statistics.dc.html` - the arrow keys note.
- `Components.dc.html` - c6, the suggestion chip.
- `React components.dc.html` - renders `react_handoff/`, unchanged.
- `react_handoff/` - every component, as the React components page loads them. Changed: `Chip.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load, unchanged.
- `styles/tokens.css` - `--chip-h-touch`.
- `styles/components.css` - `sp-chip--suggestion` on touch.
- `styles/doc.css` - what the pages link, unchanged.
- `styles/pages/order-create.css` - `.oc-choices--stack`.
- `styles/pages/order-statistics.css` - what Order statistics links, unchanged.
- `styles/check.js` - the new suggestion chip assertion.

## styles/check.js

0 finding(s) across 27 pages.

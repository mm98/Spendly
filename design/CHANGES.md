# Small buttons that still fill the width on a phone (Brief-phone-small-button-width.md), and buttons stacked on a phone

## Fixed from handoff_phone_small_button_width_fixed

- **Show amounts on a phone shows the cash icon instead of the eye.** The toggle at the end of the Cash flow View row is the same outline icon button, with the same `aria-pressed`, `aria-label` (Show amounts / Hide amounts) and pressed tint. Only its icon changes, to `cash`. Where: `Mobile screens.dc.html`, the three cash flow frames and their note. `Order statistics.dc.html`, the note at 4a. `icons.js` gains `cash` (Tabler outline `icons/outline/cash.svg`, path data unmodified, MIT), registered in `Icon legend.dc.html` 19a after camera. App: add `cash` to the icon register (`react/src/components/icons`) and use it for the toggle in `react/src/pages/Statistics.jsx` on touch. Desktop keeps the labelled button with the eye.

## Fixed from handoff_phone_small_button_width

- **Cash flow keeps its full label; Show amounts is the icon alone on a phone** (the eye, since replaced by cash, see above). The short label "Flow" from `handoff_phone_button_size_fixed` is removed. The problem was that Show amounts, a default button beside the View switch, takes the full width on touch, which squeezed the switch to nothing. On a phone it is now an outline icon button (48px) at the end of the View row, with `aria-pressed` and `aria-label` "Show amounts" or "Hide amounts". Its pressed state is the icon button's pressed tint. Where: `Mobile screens.dc.html`, the three cash flow frames, and the note beside them. `Order statistics.dc.html`, every View switch back to the plain label, with a note at 4a. `styles/components.css`: `.sp-segmented__short`, `.sp-segmented__full` and `.sp-segmented__item[data-short]::after` are removed. App: `react/src/pages/Statistics.jsx` drops the short label and, on touch, renders the toggle as `IconButton variant="outline"` with the eye.
- **The "You already have this order" sheet rises from the foot of the phone.** In Mobile screens 3c it was drawn hanging from the top, under the status bar. The frame now sits the status bar in `.ms-layer` and the sheet at the foot (`ms-device--bottom`), like the other sheet frames. This was a drawing fault only, with no component change.
- **A check for a button squeezing its neighbour.** `styles/check.js` now fails a default `sp-btn sp-flex-none` in a `sp-row-flex` on a touch frame, since on touch it fills the row.

Follow-up to `handoff_phone_button_size_fixed`. Built on `design/` from `mm98/Spendly` main, pulled 2026-11-01T14:31Z. Main's `design/` does not have that package's changes yet, so this package carries them too (small and xsmall at 34px on touch). Every other file is main's. `later.md` on main was read first: its one entry, Recently deleted, is kept for later.

## 1. A small button directly in a card

**The problem.** A card is a flex column, so a button placed in it as its own child stretches to the card's width: 327px on a phone, and full width on desktop too. This happened to Vendor edit and Category edit ("See more in statistics", "See all N orders"), and also to "Archive vendor" (Vendors and categories) and "Open hay.dk" (Bookmarks summary). Card c10 already says that every card action goes in its footer and never loose in the card.

**What changed.** These buttons now sit in `.sp-card__footer`, at its start and at their own width, on every screen. No CSS change was needed for this case: the footer is a row, so it does not stretch the button.

**Where.** `Vendors and categories.dc.html`: 5c and 5f (Spend card, Recent orders card, End of its life card). `Bookmarks.dc.html`: Bookmark summary (two frames). Components c6 note. App: `react/src/pages/VendorEdit.jsx`, `CategoryEdit.jsx`, `BookmarkEdit.jsx` (or wherever the summary card is) wrap the button in `CardFooter`.

**What is still open.** Nothing.

## 2. One button alone in a card footer

**The problem.** `.sp-card__footer > .sp-btn:only-child:not([class*="--text"]) { width: 100%; }` made a single button fill the footer, including small ones, on every screen. On Statistics this hit "Show all 10 categories" and "Edit on category".

**What changed.** The rule now fills only a default-size button. A small or xsmall button alone in a footer keeps its own width, at the footer's start, on every screen.

**Where.** `styles/components.css`: `.sp-card__footer > .sp-btn:only-child:not([class*="--text"], .sp-btn--small, .sp-btn--xsmall)`. Components c6 note.

**What is still open.** Nothing.

## 3. Load more under a card grid

**The problem.** `.sp-touch .sp-list__footer--loose .sp-btn { width: 100%; }` made Load more fill the width on touch (Vendors 361px, and every `ListMore loose`).

**What changed.** On touch, a small or xsmall button in the loose footer keeps its own width and is centred under the grid. A default-size button still fills the width.

**Where.** `styles/components.css`: `.sp-touch .sp-list__footer--loose .sp-btn:not(.sp-btn--small, .sp-btn--xsmall)` and `.sp-touch .sp-list__footer--loose > .sp-btn:is(.sp-btn--small, .sp-btn--xsmall) { align-self: center; }`. App: no change, since `ListMore loose` already uses the small button.

**What is still open.** Nothing.

## 4. Buttons stacked on a phone

**The problem.** The "You already have this order" sheet stacked five full-width buttons on a phone, even where two would fit side by side.

**What changed.** On a phone, buttons sit two to a row. Each one takes half the row (`.sp-dialog__actions` with `sp-btn--block`), and a button left over takes a row of its own. In this sheet the rows are: Open that order and Compare the files, then Open that draft, then Create anyway and Read it again, then Discard.

**Where.** `Order create.dc.html`: the dialog on a phone, and its note. `Mobile screens.dc.html`: 3c. App: the sheet in `react/src/pages/OrderCreate.jsx` (the duplicate dialog) wraps each pair in `.sp-dialog__actions`.

**What is still open.** Nothing.

## Carried from handoff_phone_button_size_fixed

Small and xsmall buttons are 34px on touch, with a 48px tap area that cannot be seen. Send beside the chat field stays 48px. That package's Flow label is withdrawn, as described at the top of this note. See that package's CHANGES.md for the full sections. The files are included here because main's `design/` does not have them yet.

## Files

- `README.md` - the design overview, unchanged from the project root.
- `CHANGES.md` - this note, with the fix at the top.
- `Vendors and categories.dc.html`, `Bookmarks.dc.html` - card actions moved into the footer.
- `Order create.dc.html`, `Mobile screens.dc.html` - sheet buttons in pairs. Mobile screens also gets the cash-icon toggle and the sheet at the foot.
- `Order statistics.dc.html` - the plain Cash flow label, and the note about the cash icon on a phone.
- `Icon legend.dc.html` - `cash` registered in 19a.
- `Components.dc.html` - the c6 notes.
- `styles/components.css` - the footer, loose-footer, small and xsmall rules. The short-label rules are removed.
- `styles/check.js` - asserts: small and xsmall at 34px on touch, buttons on a phone two to a row, a small button keeps its width in a footer and under a grid, and a card action sits in its footer.
- `styles/COMPONENT-STATUS.md` - the 2026-11-01 entries.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-statistics.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/order-create.css`, `styles/pages/icon-legend.css`, `support.js`, `components.js`, `view.js` - unchanged from main.
- `icons.js` - main's, with `cash` added. They are included because the pages load them.

## styles/check.js

0 finding(s) across 28 pages

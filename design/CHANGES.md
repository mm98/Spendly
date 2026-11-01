# A small button alone in a card footer fills it on a computer (Brief-small-button-full-width-on-desktop.md)

Follow-up to `handoff_phone_small_button_width_fixed_2`, which pull request #695 built. Built on `design/` from `mm98/Spendly` main, pulled 2026-11-01T14:58Z. Main's `design/` does not have the earlier packages' changes yet, so this package carries them too. They are listed under "Carried" below. `later.md` on main was read first: its one entry, Recently deleted, is kept for later.

## 1. A small button alone in a card footer, on a computer

**The problem.** The last package said a small button alone in a card footer keeps its own width on every screen. Carsten's choice is that on a computer it fills the footer, as it did before. On a phone it keeps its own width. The app holds this today in its own `app.css`, with `@media (min-width: 640px) { body:not(.sp-touch) .sp-card__footer > .sp-btn--small:only-child { width: 100%; } }`.

**What changed.** A small button alone in a card footer is full width on a computer (640px and wider, and not touch). It has its own width, at the footer's start, on touch and below 640px. An xsmall button keeps its own width everywhere. A text button is unchanged and never fills.

On a computer this reaches Vendor edit and Category edit ("See more in statistics", "See all N orders"), and the Bookmark edit summary ("Open (shop)"). It does not reach the Statistics footers, where those buttons are not alone. Load more under a card grid is also unchanged: it is centred at its own width on touch, as before.

**Where.** `styles/components.css`: the footer fill rule `.sp-card__footer > .sp-btn:only-child:not([class*="--text"], .sp-btn--small, .sp-btn--xsmall)` is unchanged. A new rule beside it reads `@media (min-width: 640px) { .sp-card__footer > .sp-btn--small:only-child:not(.sp-touch *) { width: 100%; } }`. Components c6 note: "Alone in a card footer it has its own width on a phone, at the footer's start, and full width on a computer". `styles/check.js` now checks the phone rule and the computer rule separately. `styles/COMPONENT-STATUS.md`: the 2026-11-01 entry. App: remove the stand-in rule from `react/src/styles/app.css`.

**What is still open.** Nothing.

## Carried from handoff_phone_small_button_width_fixed_2

These are unchanged from that package, apart from the footer rule above:

### Fixed from handoff_phone_small_button_width_fixed

- **Show amounts on a phone shows the cash icon instead of the eye.** The toggle at the end of the Cash flow View row is the same outline icon button, with the same `aria-pressed`, `aria-label` (Show amounts / Hide amounts) and pressed tint. Only its icon changes, to `cash`. Where: `Mobile screens.dc.html`, the three cash flow frames and their note. `Order statistics.dc.html`, the note at 4a. `icons.js` gains `cash` (Tabler outline `icons/outline/cash.svg`, path data unmodified, MIT), registered in `Icon legend.dc.html` 19a after camera. App: add `cash` to the icon register (`react/src/components/icons`) and use it for the toggle in `react/src/pages/Statistics.jsx` on touch. Desktop keeps the labelled button with the eye.

### Fixed from handoff_phone_small_button_width

- **Cash flow keeps its full label; Show amounts is the icon alone on a phone** (the eye, since replaced by cash, see above). The short label "Flow" from `handoff_phone_button_size_fixed` is removed. The problem was that Show amounts, a default button beside the View switch, takes the full width on touch, which squeezed the switch to nothing. On a phone it is now an outline icon button (48px) at the end of the View row, with `aria-pressed` and `aria-label` "Show amounts" or "Hide amounts". Its pressed state is the icon button's pressed tint. Where: `Mobile screens.dc.html`, the three cash flow frames, and the note beside them. `Order statistics.dc.html`, every View switch back to the plain label, with a note at 4a. `styles/components.css`: `.sp-segmented__short`, `.sp-segmented__full` and `.sp-segmented__item[data-short]::after` are removed. App: `react/src/pages/Statistics.jsx` drops the short label and, on touch, renders the toggle as `IconButton variant="outline"` with the eye.
- **The "You already have this order" sheet rises from the foot of the phone.** In Mobile screens 3c it was drawn hanging from the top, under the status bar. The frame now sits the status bar in `.ms-layer` and the sheet at the foot (`ms-device--bottom`), like the other sheet frames. This was a drawing fault only, with no component change.
- **A check for a button squeezing its neighbour.** `styles/check.js` now fails a default `sp-btn sp-flex-none` in a `sp-row-flex` on a touch frame, since on touch it fills the row.

Follow-up to `handoff_phone_button_size_fixed`. Built on `design/` from `mm98/Spendly` main, pulled 2026-11-01T14:31Z. Main's `design/` does not have that package's changes yet, so this package carries them too (small and xsmall at 34px on touch). Every other file is main's. `later.md` on main was read first: its one entry, Recently deleted, is kept for later.

### 1. A small button directly in a card

**The problem.** A card is a flex column, so a button placed in it as its own child stretches to the card's width: 327px on a phone, and full width on desktop too. This happened to Vendor edit and Category edit ("See more in statistics", "See all N orders"), and also to "Archive vendor" (Vendors and categories) and "Open hay.dk" (Bookmarks summary). Card c10 already says that every card action goes in its footer and never loose in the card.

**What changed.** These buttons now sit in `.sp-card__footer`. On a phone they are at its start, at their own width; on a computer they fill it (section 1 of this package). No CSS change was needed for this case: the footer is a row, so it does not stretch the button.

**Where.** `Vendors and categories.dc.html`: 5c and 5f (Spend card, Recent orders card, End of its life card). `Bookmarks.dc.html`: Bookmark summary (two frames). Components c6 note. App: `react/src/pages/VendorEdit.jsx`, `CategoryEdit.jsx`, `BookmarkEdit.jsx` (or wherever the summary card is) wrap the button in `CardFooter`.

**What is still open.** Nothing.

### 2. One button alone in a card footer

**The problem.** `.sp-card__footer > .sp-btn:only-child:not([class*="--text"]) { width: 100%; }` made a single button fill the footer, including small ones, on every screen. On Statistics this hit "Show all 10 categories" and "Edit on category".

**What changed.** The rule now fills only a default-size button. A small or xsmall button alone in a footer keeps its own width, at the footer's start. (Section 1 of this package changes this: on a computer, a small one now fills the footer.)

**Where.** `styles/components.css`: `.sp-card__footer > .sp-btn:only-child:not([class*="--text"], .sp-btn--small, .sp-btn--xsmall)`. Components c6 note.

**What is still open.** Nothing.

### 3. Load more under a card grid

**The problem.** `.sp-touch .sp-list__footer--loose .sp-btn { width: 100%; }` made Load more fill the width on touch (Vendors 361px, and every `ListMore loose`).

**What changed.** On touch, a small or xsmall button in the loose footer keeps its own width and is centred under the grid. A default-size button still fills the width.

**Where.** `styles/components.css`: `.sp-touch .sp-list__footer--loose .sp-btn:not(.sp-btn--small, .sp-btn--xsmall)` and `.sp-touch .sp-list__footer--loose > .sp-btn:is(.sp-btn--small, .sp-btn--xsmall) { align-self: center; }`. App: no change, since `ListMore loose` already uses the small button.

**What is still open.** Nothing.

### 4. Buttons stacked on a phone

**The problem.** The "You already have this order" sheet stacked five full-width buttons on a phone, even where two would fit side by side.

**What changed.** On a phone, buttons sit two to a row. Each one takes half the row (`.sp-dialog__actions` with `sp-btn--block`), and a button left over takes a row of its own. In this sheet the rows are: Open that order and Compare the files, then Open that draft, then Create anyway and Read it again, then Discard.

**Where.** `Order create.dc.html`: the dialog on a phone, and its note. `Mobile screens.dc.html`: 3c. App: the sheet in `react/src/pages/OrderCreate.jsx` (the duplicate dialog) wraps each pair in `.sp-dialog__actions`.

**What is still open.** Nothing.

### Carried from handoff_phone_button_size_fixed

Small and xsmall buttons are 34px on touch, with a 48px tap area that cannot be seen. Send beside the chat field stays 48px. That package's Flow label is withdrawn, as described at the top of this note. See that package's CHANGES.md for the full sections. The files are included here because main's `design/` does not have them yet.


## Files

- `README.md` - the design overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `styles/components.css` - the computer fill rule for a small footer button, plus the carried rules.
- `styles/check.js` - the footer assertion split into phone and computer, plus the carried assertions.
- `styles/COMPONENT-STATUS.md` - the 2026-11-01 entries.
- `Components.dc.html` - the c6 notes.
- `Order statistics.dc.html`, `Mobile screens.dc.html`, `Order create.dc.html`, `Vendors and categories.dc.html`, `Bookmarks.dc.html`, `Icon legend.dc.html` - carried from the earlier packages.
- `icons.js` - main's, with `cash` added (carried).
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-statistics.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `styles/pages/order-create.css`, `styles/pages/icon-legend.css`, `support.js`, `components.js`, `view.js` - unchanged from main. They are included because the pages load them.

## styles/check.js

0 finding(s) across 28 pages.

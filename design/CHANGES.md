# Four touch questions from an iPhone run (Brief-iphone-touch)

The app was run as an iPhone 15 (393 x 659, touch). These are the four questions only the design could answer, plus the three "For Claude Design" entries in `later.md`. Desktop does not change, except for one markup change that looks the same: a switch and its line are now one `<label>`.

## 1. A tapped row stays grey on a phone

**The problem.** A phone keeps `:hover` on the last thing tapped. After an order row, a card head or a menu row was tapped and the reader stepped back, the row kept its grey hover fill and looked selected.

**What changed.** Every hover state shows only where a pointer can hover. Each `:hover` rule sits under `@media (hover: hover)`, as the budget line and the amount cell (21a, 21b) already did. That covers fills, borders, colours, reveals (a mark's remove, a card's pick), submenus opening on hover and tooltips shown on hover. Focus rings, the pressed state (`:active`), the selected state and `data-hover` specimens do not change. A rule written as `:is(:hover, :focus-visible)` is split: the focus half stays where it was, the hover half moves under the media query.

**Where.** `styles/components.css`: all 107 hover selectors. `styles/pages/settings.css`: `.st-theme:hover`. `Components c1` note. App: wrap the 4 `:hover` rules in `app.css`, 1 in `pages/home.css` and 1 in `pages/settings.css` the same way. `styles/check.js` now fails on any `:hover` outside `@media (hover: hover)`.

**What is still open.** Nothing.

## 2. Tap areas under 44px on a phone

**The problem.** On the phone a tick box row was 20 to 26px tall, a switch 26px, a light nav row 40px, a segmented option 34px, and a status's pencil and bin 24 x 24 at 36px apart.

**What changed.**
- **Tick box, radio and switch:** on touch the whole row is the target. The control and its label are one `<label>`, at least 44px tall (`--row-h-touch`). The box and the switch keep their drawn size. Ten switches that had a separate `<label for>` beside them are now wrapped in one `label.sp-row-flex`, with the same classes and look.
- **Status pencil and bin:** on a phone they become one actions button (the icon button, three dots, 48px on touch) opening a menu: Rename, and Delete on an added status with no orders. Draft has neither, so it has no button. Desktop keeps the pencil and the bin. See point 3.
- **Light nav row:** on touch it is drawn 44px tall, with the same 6px gap. A name field in a row's place now overlaps the gaps by 2px each side, so no row under it moves.
- **Segmented option:** on touch its press area fills the 48px track: up to the track's edge above and below, and half the 6px gap to each side, so neighbouring areas meet. The drawn option stays 34px. The label clips its own text with the ellipsis, so the option no longer clips and its area can reach outside it.

**Where.**
- `styles/components.css`: `.sp-touch :is(.sp-choice, label.sp-row-flex):has(> :is(.sp-check, .sp-radio, .sp-switch))` after `.sp-choice`; `.sp-touch .sp-nav-item--light` after `.sp-nav-list`, and `.sp-touch .sp-nav-list > .sp-field__wrap`; `.sp-touch .sp-segmented__item`, its `::before` and `> .sp-label` beside the touch press areas (the old shared `::before` rule with `.sp-period__preset` is split; the preset's is unchanged).
- `Components c5` and `c22` notes.
- Markup: `Components`, `Mobile screens 7a`, `Order create`, `Order editing layouts`, `Order list`, `Vendors and categories` (the "Leave out of statistics" switches and their likes). App: every switch whose label is a separate `<label htmlFor>` becomes one `<label>` holding both.
- `styles/check.js` now fails on a switch with a separate `label[for]`.

**What is still open.** Nothing.

## 3. Statuses on a phone

**The problem.** On a phone "built in", the pencil and the two arrows left little room, the order count under the name pushed the name's chip up out of line with the rest, and the Rename editor did not fit on one line.

**What changed.**
- The phone row is the handle, the name's pill (`.sp-pill--truncate`, a long name ends in an ellipsis), "built in" where it applies, and the actions button from point 2. The order count is left out on a phone, so the pill sits in the middle of the row with the rest. Desktop keeps the count.
- The row's reorder control is the drag handle, as on desktop (touch-and-hold, `Components` handle notes). The app's up and down arrows are not part of the drawing.
- Renaming on a phone wraps the row: the name field on the first line, with no drag handle (a row being renamed is not dragged), the four tones on the second, Cancel and Save at the right on the third, at their own width. The row grows while it is renamed and returns to its height on Save or Cancel.

**Where.** `Settings and import 11a`: the new "STATUSES · PHONE" state beside the screen, and two notes. `styles/components.css`: `.sp-touch .sp-list-item--editable:has(> .sp-input)` and its children, after `.sp-list-item--editable`; `.sp-touch .sp-list-item--editable .sp-btn:not(.sp-btn--block)` joins the list of places where a touch button keeps its own width. App: `pages/SettingsStatuses.jsx`, the phone branch of the list row and `StatusEditor`; the wrap rule in `app.css` is replaced by the design's.

**What is still open.** Nothing.

## 4. The bank check's column table on a phone

**The problem.** On a phone the column table was 480px wide and scrolled sideways, the Spendly choice was cut at the screen edge, and nothing showed that the table scrolled.

**What changed.** On a phone the columns are a list, not a table: one block per column, its name and first three values on top, its Spendly choice under it at the full width, a rule between blocks. Nothing scrolls sideways.

**Where.** `Budget 21h`: the new "COLUMNS · PHONE" state and a note. App: `pages/BudgetCheck.jsx`, the column step only; `.bg-sideways` and the 480px minimum go on a phone.

**What is still open.** Nothing.

## later.md: the Ask button's ::after on a phone

**The problem.** After a tap on Ask the button showed as one dark box with no mark: the tooltip's `::after` styles filled the 44px press area, and its `pointer-events: none` let taps through.

**What changed.** On touch a field-end button's `::after` carries no tip: no margin, padding, border or background, `position: absolute`, `pointer-events: auto`, no transition.

**Where.** `styles/components.css`: `.sp-touch .sp-field__trails > .sp-field__trail::after`. `Components c18` note. Remove the rule under "on touch a field-end button's ::after is its press area" from `react/src/styles/app.css`, and the entry "For Claude Design: the order search's Ask button on a phone" from `later.md`.

**What is still open.** Nothing.

## later.md: a field's end buttons sit close to the edge on a phone

**The problem.** On a phone an end button had less space on its right than above and below, and a search field's clear button sat high.

**What changed.** On touch an end button or group sits `(--control-h-touch - --field-trail) / 2` (9px) from the right, a button its field does not centre sits the same from the top, and `.sp-input--trail`, `.sp-input--trail-2`, the chat field and a token field with an end button pad by that inset.

**Where.** `styles/components.css`: the rules after `.sp-touch .sp-field__trails > .sp-field__trail::after`, in place of the old `.sp-touch .sp-input--trail-2`. `Components c3` note. Remove the rules under "on touch a field's end buttons keep their drawn size" from `app.css`, and the entry "For Claude Design: a field's end buttons sit close to the edge on a phone" from `later.md`.

**What is still open.** Nothing.

## later.md: Ask keeps its hover colour after a tap

**The problem.** On a phone, after a tap on Ask it showed the lighter hover green until the next tap elsewhere.

**What changed.** Settled by point 1: Ask's hover rules sit under `@media (hover: hover)`.

**Where.** `styles/components.css`: `.sp-field__trail--ask` hover rules. Remove the rules under "a touch screen keeps a tapped button hovered" from `app.css`, and the entry "For Claude Design: Ask in a search field keeps its hover colour after a tap" from `later.md`.

**What is still open.** Nothing.

## later.md: other entries

"Large accounts still make everyone wait on a few pages" and "A deleted record should not be removed for good at once" are app and server entries outside this brief, so both stay.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - Statuses on a phone and its notes (11a).
- `Budget.dc.html` - the bank check's columns on a phone and a note (21h).
- `Components.dc.html` - notes on c1, c3, c5, c18 and c22, and two switches as one label.
- `Mobile screens.dc.html`, `Order create.dc.html`, `Order editing layouts.dc.html`, `Order list.dc.html`, `Vendors and categories.dc.html` - switches as one label.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets. `components.css` carries every rule above.
- `styles/check.js` - with the two new assertions.
- `styles/pages/settings.css`, `budget.css`, `mobile-screens.css`, `order-create.css`, `order-editing.css`, `order-list.css` - the page stylesheets these pages link.

## styles/check.js

0 finding(s) across 27 pages.

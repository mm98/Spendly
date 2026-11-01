# Smaller buttons on the phone (Brief-phone-button-size.md), and Flow on the Statistics switch

## Fixed from handoff_phone_button_size

- **Section 3, screen reader name (answered):** a screen reader names the option "Cash flow" on a phone as well. Each View switch's Cash flow input carries `aria-label="Cash flow"`, so the accessible name stays the full one while the option shows "Flow". Where: `Order statistics.dc.html`, every View switch and the note beside 4a. App: `react/src/pages/Statistics.jsx`, the Cash flow option's input takes the full label (the existing phrase) as `aria-label`.
- **Section 2, overlapping tap areas (answered):** when two small buttons are stacked less than 14px apart, their tap areas overlap and the nearer button takes the tap. This is accepted. No change.

Built on `design/` from `mm98/Spendly` main, pulled 2026-11-01T14:11Z. Every file here is main's with only the changes below applied. `later.md` on main was read first: its one entry, Recently deleted, is kept for later and nothing in this package settles it.

## 1. The Views card head, and every xsmall button on a phone

**The problem.** More > Views: Edit, and Done while editing, drew 48px high, 4px from the card's top edge, and pushed into the first row ("All orders ... locked"). On touch every button takes `min-height: var(--control-h-touch)` (48px). `.sp-touch .sp-btn--xsmall` set `height: 34px`, but the min-height won. Below 640px the media query gave xsmall no rule of its own at all.

**What changed.** An xsmall button on touch and below 640px draws 34px (`--btn-h-small`) at its own width, with the 48px touch height as an invisible `::before` area above and below, the same as a small button in a card head. This is not limited to card heads, so it also covers Clear all in the Orders filter panel head and Resend in the confirm-your-email banner.

**Where.** `styles/components.css`: `.sp-touch .sp-btn--xsmall`, `.sp-touch .sp-btn--xsmall::before`, and `.sp-btn--xsmall` / `::before` in `@media (max-width: 639.98px)`. Components c6 (the touch note under States). App: `CardHeader actionSize="xsmall"` and `size="xsmall"` need no code change.

**What is still open.** Nothing.

## 2. Small buttons in a page body on a phone

**The problem.** Every `size="small"` button outside a card head or list toolbar drew 48px on a phone, often full width (Vendor edit, Category edit, Order compare, Statistics, Vendors, Ask, Settings > Account and Import, and the dialog and popover commits).

**What changed.**
- A small button on touch and below 640px draws 34px at its own width wherever it stands (page body, card, banner, dialog, popover), with the 48px touch height as an invisible area. The old card-head and toolbar-only exception is replaced by this one rule.
- Small buttons keep their own width. They never fill the column. The width rule already excluded them, so a full-width small button in the app comes from the page's own layout (a stretching flex column or `block`) and should be removed there.
- Ask: the suggested questions follow the rule (34px, own width).
- Ask: Send beside the chat field is the one exception. It stays 48px so the composer row is one height. The selector is `.sp-chat__composer > .sp-btn--small`.
- Small commits in dialogs and popovers (Apply, Cancel, Undo, Rename, Remove, Later, Update) follow the rule.

**Where.** `styles/components.css`: `.sp-touch .sp-btn--small`, `.sp-touch .sp-btn--small::before`, `.sp-touch .sp-chat__composer > .sp-btn--small` (and `::before`), and the same four rules in `@media (max-width: 639.98px)`. The comment above `.sp-touch .sp-btn` is updated. Components c6 notes (States) and the "Touch is the same component" note at the top of Components. App: `react/src/pages/VendorEdit.jsx`, `CategoryEdit.jsx`, `OrderCompare.jsx`, `Statistics.jsx`, `Vendors.jsx`, `Ask.jsx`, `Settings.jsx` (Account, Import). Check each one for a page rule that stretches a small button to full width, and remove it.

**What is still open.** Nothing. Small buttons stacked less than 14px apart have overlapping tap areas, and the nearer button takes the tap. Confirmed as acceptable.

## 3. Cash flow reads Flow on a phone

**The problem.** On a phone, "Cash flow" does not fit its half of the Orders / Cash flow switch on Statistics.

**What changed.** On touch and below 640px the option reads "Flow". "Cash flow" is unchanged on desktop and everywhere else the view is named. This is a new state of the segmented control (c5): the option carries `data-short="Flow"`, and its label holds both forms, `.sp-segmented__full` and `.sp-segmented__short`. The option's measured width (`::after`) uses `data-short` on touch, so selecting an option still does not shift the layout.

**Where.** `Order statistics.dc.html`: every View switch (4a, 4h and the other frames), and the note beside 4a. `styles/components.css`: `.sp-segmented__short`, `.sp-segmented__full`, `.sp-segmented__item[data-short]::after`, under `.sp-touch` and in the 640px query. App: `react/src/pages/Statistics.jsx` (the View switch), plus a short phrase key beside the Cash flow label in `language/en.json` and `da.json`.

**What is still open.** Nothing. The input carries `aria-label="Cash flow"`, so a screen reader reads the full name on a phone too.

## Files

- `README.md` - the design overview, unchanged from the project root.
- `CHANGES.md` - this note, with the fix at the top.
- `Components.dc.html` - c6 touch note, and the "Touch is the same component" note.
- `Order statistics.dc.html` - the Flow short label on every View switch, and its note.
- `styles/components.css` - the small, xsmall and segmented rules above.
- `styles/check.js` - three new assertions: xsmall is 34px on touch and below 640px, and small is 34px on touch and below 640px. These replace the old head-only assertion.
- `styles/COMPONENT-STATUS.md` - the 2026-11-01 entry.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/order-statistics.css`, `support.js`, `components.js`, `view.js` - unchanged from main. They are included because the two pages load them.

## styles/check.js

0 finding(s) across 28 pages

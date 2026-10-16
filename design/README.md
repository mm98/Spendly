# Handoff: answers to the large-order brief

## Overview

Answers to the five questions in "Brief: questions from building one very large order", for pull request mm98/Spendly#479. It follows the handoff "One very large order no longer distorts filters and statistics" and changes nothing it settled. Items 1 to 4 are behaviour states on existing components. Item 5 is a stylesheet fix.

## About the design files

The `.dc.html` files are design references built in HTML, not production code. Recreate the changes in the existing React app with its components. Open the pages in a browser from this folder; they load `support.js` and `styles/`.

## Fidelity

High fidelity. Every control is an existing component (`.sp-switch`, `.sp-field__help`, `.sp-sum`). No token, size or colour changed.

## Answers

### 1. Leave out of statistics on a new order: A

- The switch appears on the new-order form and on the form after a receipt scan, as the last field of Order details. Same markup, label and help text as Edit order 1d. Off by default.
- A copy of an order starts with the switch off, even when the original is left out. The copy is a new purchase.
- Drawn in `Order create.dc.html`, both states of the first section.

### 2. Include switch on the phone Statistics page: A

- **Include N left-out orders** sits under the period select (`sp-window--select`), 8px below it, in the head above the scrolling area.
- Same rules as desktop 4a: shown only when the period holds at least one left-out order, off by default, in the URL as `excluded=include`, not remembered.
- Drawn in `Mobile screens.dc.html`, Statistics.

### 3. Position of the Statistics row in the read view: A

- Order of rows in 1a: Vendor, Date, Kind, Status, the status date, Validated, Categories, Reference, **Statistics**, Note. Note stays last.
- The row reads **Statistics** / **Left out** and appears only when the flag is on. Described in the 1a and 1d notes; not drawn.

### 4. Typing a To amount equal to the end of the Amount scale: A

- Typing exactly the end figure is the same as dragging the handle to the end: the upper bound is open and the field and meta read `0 - 3.700+ kr.` An order above the end is listed.
- A figure above the end behaves as before: accepted, handle parked at the end.
- Stated in the 2b notes, `Order list.dc.html`.

### 5. Lines drawn as a 1px filled box: fixed

Each rule now draws a 1px top border instead of a 1px-high background. Same colour, same thickness, same margins. Copy these rules into the app.

```css
.sp-menu hr { height: 0; border: 0; border-top: 1px solid var(--line-2); margin: var(--sp-6) var(--sp-8); }
.sp-combobox__panel hr { height: 0; border: 0; border-top: 1px solid var(--line-2); margin: var(--sp-4) 0; }
.sp-sidebar__divider { width: 100%; height: 0; margin: var(--sidebar-block-extra) 0; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.09); }
.sp-palette__rule { height: 0; margin: var(--sp-6) 0; border-top: 1px solid var(--line-2); }
.sp-divider::before,
.sp-divider::after { content: ""; flex: 1; height: 0; border-top: 1px solid var(--line); }
.sp-plot__grid > span { height: 0; border-top: 1px solid var(--line-2); }
.sp-plot__grid > span:last-child { border-top-color: var(--line); }
```

The collapsed-sidebar width rule for `.sp-sidebar__divider` (28px) is unchanged. Logged in `styles/COMPONENT-STATUS.md`, 2026-10-16.

## Files

- `Order create.dc.html` - switch in Order details, both states, and its note (item 1)
- `Order editing layouts.dc.html` - 1a field order note, 1d note on row position and copies (items 1, 3)
- `Mobile screens.dc.html` - Include switch on phone Statistics and its note (item 2)
- `Order statistics.dc.html` - 4a note pointing to the phone placement (item 2)
- `Order list.dc.html` - 2b note on the exact end figure (item 4)
- `styles/components.css` - the six divider rules (item 5)
- `styles/`, `support.js`, `icons.js` - needed to open the pages

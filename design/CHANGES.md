# Brief: the picture field on a phone has no name

Built on `design/` from `mm98/Spendly` main at 2026-11-01T16:07Z. `later.md` on main was read first: its one entry, Recently deleted, is kept for later and is not a design fix.

## 1. The filled picture box on a phone has no name

**The problem.** On a phone, a slot that holds a picture draws the picture with Replace and Remove beside it. The box is then no longer the file input's label (the input moved into Replace), and it took no `aria-label`, so `<Mark>` logged "needs a name" on every draw: new and edit vendor, new and edit bookmark, and the line photo on new and edit order.

**What changed.** In that state the box is the picture, named from the slot's own `name`: `role="img"` with `aria-label` "The vendor's image", "The bookmark's picture", or the default "The image". A screen reader reads the picture, then Replace and Remove. Desktop, and a phone while the slot is empty or a file is refused, keep the box as the input's label with no name of its own, as now. No page changes: every page already passes `name`.

**Where.**
- `react_handoff/FileDrop.jsx`, `Slot`: `aria-label={actions ? name : undefined}` on the `<Mark>`; the `name` prop's JSDoc says what it names. Copy into `react/src/components/FileDrop.jsx`.
- Components c17 (the filled phone thumb) and c15 (the line editor's sheet): the drawn image carries `role="img" aria-label="The image"`; a note in c17 states the rule.
- Layout rules 15b: the 375px filled slot, the same.
- `storybook/stories/FileDrop.stories.jsx`: add a filled phone state to `PictureSlot` (a `src`, inside the touch shell), so the story shows this box and its buttons.

**What is still open.** Nothing.

## 2. The same fault elsewhere: the reading spinner on a new order

**The problem.** Checked every `<Mark>` in `react/src` on main for the same case. One more draws with no name: the spinner beside "Reading the lines" in step 2 of a new order (`react/src/pages/OrderNew.jsx`, `Reading`), `aria-hidden="true"` but no `aria-label`. `Mark` warns for it each time the step is drawn, on a phone and a desktop.

**What changed.** The spinner keeps `aria-hidden` and takes the step's own words as its `aria-label`, as the done ticks above it do: `aria-label={doing}`. No new copy.

**Where.**
- Order create 3a, step 2 (both drawings of the reading): the spinner mark carries `aria-label`.
- `react/src/pages/OrderNew.jsx`, `Reading`: `<Mark size="small" fill="plain" aria-hidden="true" aria-label={doing}><Spinner /></Mark>`.

Every other `<Mark>` on main carries an `aria-label`, is `as="label"` over its input (`AttachmentAdd`, the account picture in `SettingsAccount.jsx`), or derives its name from a string child.

**What is still open.** Nothing.

## 3. The checker

`styles/check.js` gains "a box is named": a `<Mark>` in `react_handoff/` with no `aria-label` that is not `as="label"`, a filled phone slot drawn without `role="img"` and `aria-label`, and a spinner mark with no `aria-label`. Run on main's copies it finds the slot (`FileDrop.jsx`, Components c15 and c17) and both Order create spinners.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - c15 and c17 filled phone slot named; c17 note.
- `Layout rules.dc.html` - 15b filled phone slot named.
- `Order create.dc.html` - 3a step 2 spinner named.
- `react_handoff/FileDrop.jsx` - `Slot` names its box on a phone.
- `language/en.json`, `language/da.json` - read by the React components on the pages; unchanged, no new phrase.
- `styles/check.js` - the new assertion.
- `styles/COMPONENT-STATUS.md` - the c17 entry.
- `support.js`, `components.js`, `icons.js`, `view.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/layout-rules.css`, `styles/pages/order-create.css` - what the pages load to open from this folder; unchanged.

## styles/check.js

0 finding(s) across 28 pages.

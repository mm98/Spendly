# Brief: A number box in a field takes its name from the field's label

Answers `Brief-stepper-name.md`. `later.md` has no entries, so nothing else is settled in this pass.

## 1. The Stepper takes its name from the Field's label

**The problem** - Inside a Field, the Stepper's value input was named twice: by the field's label through its id, and by its own `aria-label`. The page had to type the word twice because the Stepper builds its two button names from `aria-label` and the Field handed over only an id. Renaming the label would leave the hidden name saying the old word.

**What changed** - A control that needs the label's text says so with a flag on the component, `Stepper.fieldLabel = true`, the same way it states `fieldRole`. Field hands such a control its label as `fieldLabel`, only when the label is plain text. The Stepper then names its buttons from it ("One step fewer Quantity", "One step more Quantity") and puts no `aria-label` on the value input, so the label is its one name. The page writes `<Field label="Quantity"><Stepper ... /></Field>` with no `aria-label`.

A Stepper outside a Field, or in a Field whose label is not plain text, keeps `aria-label` as now. A Stepper with neither name is reported in the console.

This differs from the brief in one point. The brief proposed handing the label to every control a Field holds. Most controls pass props they do not know on to their element, so each of them would render a `fieldLabel` attribute and React would warn. Only controls that set the flag receive it, and today that is the Stepper alone. Decided in review (decide for me).

**Where** - `react_handoff/Stepper.jsx` (`fieldLabel` prop, the `name` it builds, the value input's `aria-label`, `Stepper.fieldLabel`); `react_handoff/Field.jsx` (`wantsLabel`, and `fieldLabel` in the props handed to the control); `react_handoff/README.md`, the Stepper paragraph; `Components.dc.html` c4, the Stepper note. App: `react/src/components/Stepper.jsx`, `react/src/components/Field.jsx`, and the line's Quantity in `react/src/pages/OrderForm.jsx`, which drops its `aria-label`.

**What is still open** - The drawn steppers name their buttons "Decrease" and "Increase" (Components c4 and c15, Order editing layouts 1b and 1c, Responsive reference, Dark mode and image viewer, States and confirmations), while the component says "One step fewer" and "One step more" of the label. Asked in review: the drawings stay as they are for now. The component's names are the ones the app uses. Nothing to build.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - the Stepper note (c4).
- `react_handoff/Stepper.jsx`, `react_handoff/Field.jsx` - the change.
- `react_handoff/README.md` - the Stepper paragraph.
- `support.js`, `components.js`, `icons.js` - loaded by the page.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles the page links.

## styles/check.js

0 finding(s) across 26 pages.

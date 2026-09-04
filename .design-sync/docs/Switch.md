---
category: Forms
---
A live preference toggle: green with the knob to the right when on, grey with the knob to the
left when off. It states what is true right now, and flipping it has to change something the
reader can see immediately.

## Switch or CheckRow

This is the decision to get right, and Spendly has already made it almost everywhere.

- A **switch** says *this is now on*. Use it only where the effect is immediate and visible —
  most often for a panel it opens and closes right underneath itself.
- A **`CheckRow`** asks *should the next act include this?* — an option read once, when a button
  is pressed. Every binary option in the app today is a `CheckRow`, so a new switch is a design
  decision, not a free choice of control.

Never ship a switch that toggles nothing. A control drawn on, announced on, and wired to nothing
is the one bug a screenshot cannot catch.

## How to compose it

The switch is a real checkbox, so the text beside it should be a `<label htmlFor>` pointing at
its `id`; then clicking the text toggles it with nothing to wire. It has no label of its own, so
`label` gives it its accessible name.

When it opens a panel, point `controls` at that panel's id.

```jsx
<Switch id="budget-on" checked={on} onChange={setOn}
  label="Monthly budget" controls="budget-panel" />
<label htmlFor="budget-on">Monthly budget</label>
...
<FilterSectionBody id="budget-panel" hidden={!on}>...</FilterSectionBody>
```

## Props

- `checked` — controlled; both states are drawn, not just announced
- `onChange(checked)` — gets the new state
- `label` — the accessible name
- `controls` — the id of the panel it shows and hides
- `id` — what a `<label htmlFor>` beside it points at

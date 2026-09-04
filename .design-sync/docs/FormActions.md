---
category: Forms
---
The row of buttons a form or a card ends on. It is the only place an action row is drawn, so
every form in the app closes the same way and at the same button height.

## The two shapes

`split` pushes the children to opposite ends: the way out on the left, the save on the right.
That is the footer of a whole form, and `FormPage` draws it for you — a page built on
`FormPage` never writes one.

Without `split` the buttons sit together at the left, in reading order, verb first. That is a
card's own actions: IMPORT then CANCEL, SAVE LINE then CANCEL.

```jsx
<FormActions split>
  <Button variant="ghost" to="/orders">CANCEL</Button>
  <Button variant="caps" onClick={save}>SAVE CHANGES</Button>
</FormActions>
```

## Keep the pair one height

The two buttons are one pair, so they take one size. A page footer is `variant="ghost"` beside
`variant="caps"`, both 48px. Inside a card both are compact: `variant="ghost compact"` beside
`variant="caps compact"`, both 32px. Mixing a 32px CANCEL with a 48px save draws a footer that
looks broken.

## What else can ride in the row

- A muted note: `<span className="field-help form-actions-note">Unsaved changes</span>`. Use it
  for what the keyboard does, or whether there is anything to save.
- A control pushed to the far end: `<span className="push-end">…</span>`. The line card's
  DELETE LINE sits there, away from the save it must not be mistaken for.

## Props

- `split` — the two ends, for a form's own footer
- `children` — the buttons, in the order they are read

## Example

```jsx
<FormActions>
  <Button variant="caps compact" icon="check" onClick={saveLine}>SAVE LINE</Button>
  <Button variant="ghost compact" onClick={cancel}>CANCEL</Button>
  <span className="field-help form-actions-note">Cmd/Ctrl+Enter saves and opens the line below.</span>
  <span className="push-end">{del.button}</span>
</FormActions>
```

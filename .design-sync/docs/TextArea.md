---
category: Forms
---
The multi-line field, for a note on an order or on a line item. It brings its own taller shell,
so it goes straight inside a `Field`.

## How to compose it

```jsx
<Field label="Note" optional htmlFor="order-note">
  <TextArea id="order-note" aria-label="Note" value={note} onChange={setNote}
    placeholder="Add a note about this purchase..." />
</Field>
```

`onChange` gets the new text, not the event. Do not wrap it in a `FieldShell` — it already has
one, and a second would draw a second border.

## What it is for

Free text a reader writes for themselves: a note, a reminder about a return, what a receipt did
not say. Anything the app reads back and acts on belongs in a field with a shape — a
`TextInput`, a `Combobox`, a `DateInput`.

The box does not grow with its content and does not resize by hand; long text scrolls inside it.

## It has no error state of its own

Unlike `TextInput` and `DateInput`, `TextArea` takes no `invalid` or `describedBy`. Notes are
optional everywhere they appear. If a note ever has to be rejected, the message still goes on
the `Field`, but the red edge will not be drawn.

## Props

- `id`, `value`, `onChange(value)`
- `placeholder`, `aria-label`
- anything else is spread onto the `<textarea>`

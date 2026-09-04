---
category: Forms
---
The plain text input. It carries no border of its own, so it always goes inside a `FieldShell`,
inside a `Field`.

## How to compose it

```jsx
<Field label="Name" htmlFor="category-name">
  <FieldShell>
    <TextInput id="category-name" value={name} onChange={setName}
      aria-label="Category name" aria-required="true" />
  </FieldShell>
</Field>
```

`onChange` gets the new text, not the event. Give the input an `id` and point the `Field`'s
`htmlFor` at the same string; an `id` is generated when you leave it out, but then nothing can
address the field — not the label, not the error, not a password manager.

## Numbers

Nothing in Spendly is `input[type=number]` and nothing should be. Danish decimals use a comma,
which `type=number` refuses: the value comes back empty and `min`/`max`/`step` never run. Use
`inputMode="decimal"` for money and `inputMode="numeric"` for whole pieces — that gets the
numeric keyboard on a phone — and check the text yourself.

## Saying a value is wrong

`invalid` sets `aria-invalid`, which is what makes the surrounding `FieldShell` draw its red
edge, and `describedBy` points at the message the `Field` renders.

```jsx
<Field label="Quantity" htmlFor="item-quantity"
  error={quantity.error} errorId={quantity.errorId}>
  <FieldShell>
    <TextInput id="item-quantity" inputMode="numeric" value={qty}
      invalid={quantity.invalid} describedBy={quantity.describedBy}
      onChange={setQty} aria-label="Quantity" />
    <FieldUnit>pcs</FieldUnit>
  </FieldShell>
</Field>
```

## Placeholders

A required field that names itself takes no placeholder — a name field, a link field. Use one
only where it says something the label cannot, such as `No budget` on a field that may be left
empty. Never put an example value in a placeholder: grey text in a field reads as a value
somebody already filled in.

## Props

- `id`, `value`, `onChange(value)`
- `invalid`, `describedBy`
- `type` — `text` by default; `email`, `password`, `search`, `url`, `tel`
- `inputMode`, `placeholder`, `autoFocus`, `autoComplete`, `aria-label`, `onKeyDown`, `onBlur`
- anything else is spread onto the `<input>`

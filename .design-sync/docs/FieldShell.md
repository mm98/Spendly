---
category: Forms
---
The bordered box a control sits in. It carries the border, the height, the background and the
red edge when the value inside is rejected, so a bare `TextInput` needs one around it.

## How to compose it

Put the control inside, plus anything that rides inside the border with it: an `Icon` at the
front, a `FieldUnit` at the end, `Chip`s before the input.

```jsx
<Field label="Price paid" htmlFor="item-price">
  <FieldShell>
    <TextInput id="item-price" inputMode="decimal" value={price} onChange={setPrice}
      aria-label="Price paid" />
    <FieldUnit>kr.</FieldUnit>
  </FieldShell>
</Field>
```

Components that already own their shell — `Combobox`, `DateInput`, `TextArea` — must not be
wrapped in a second one.

## The red edge

The shell draws it by itself: it reacts to `aria-invalid="true"` on any control inside it, which
`TextInput`'s `invalid` prop sets. Nothing on the shell has to be told.

## Variants

Pass them through `variant` (or `className`, which is joined the same way):

| Variant | Use |
|---|---|
| `field-shell-area` | Taller box for a textarea. `TextArea` sets this itself. |
| `field-shell-date` | Room for the calendar glyph. `DateInput` sets this itself. |
| `field-shell-chips` | Chips wrap onto more lines and the box grows with them. |
| `field-shell-no-chevron` | With `field-shell-chips`, when no list opens from the field. |

`as` picks the element: `div` by default, `label` when the whole box should be clickable, which
is how the file picker works.

## Props

- `variant`, `className` — extra classes
- `as` — the element to render
- `children` — the control and its trimmings; anything else is spread onto the element

## Example

```jsx
<FieldShell className="field-shell-chips field-shell-no-chevron">
  {aliases.map(a => <Chip key={a} label={`Remove alias ${a}`} onRemove={...}>{a}</Chip>)}
  <TextInput id="vendor-aliases" value={query} onChange={setQuery}
    aria-label="Add alias" placeholder="Add alias..." />
</FieldShell>
```

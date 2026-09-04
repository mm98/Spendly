---
category: Chips
---
States where an order got to — Ordered, Delivered, Returned. It is a `<span>` and never a
control: it reports a fact the reader changes somewhere else.

It draws a dot before its word. With no `tone` the dot and wash are the settled green
reading, which is what Ordered and Delivered both take. `tone="warning"` is the amber one,
for a status that wants a second look.

## Tones

`warning` is the **only** tone the stylesheet defines (`.chip-status-warning`). Any other
word renders a class with no rule behind it and fails silently — it does not error. This is
not `KpiCard`'s `good | bad | neutral`, and not `Note`'s `positive | warning`.

## Sizes

One modifier is in use: `className="chip-matched"` shrinks the chip from 28px to 24px so it
fits inside a field. That is how the scan form flags a vendor it recognised, passed through
`Combobox`'s `trail`.

## Props

- `children` — the status word
- `tone` — `"warning"`, or omitted
- `className` — `chip-matched` for the in-field size; anything else is spread onto the span

## Example

```jsx
<StatusChip>Delivered</StatusChip>
<StatusChip tone="warning">Returned</StatusChip>

<Combobox trail={<StatusChip className="chip-matched">matched</StatusChip>} ... />
```

## Related

`Chip` for a value the reader can remove; `SavingChip` for a number against retail.

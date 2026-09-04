---
category: Forms
---
Two fields side by side, in equal columns, stacking on a phone. It is the only way two fields
share a row in Spendly — never a hand-rolled grid.

## How to compose it

Exactly two `Field`s inside. The pair aligns their top edges, so a field with help text and one
without still line up at the label.

```jsx
<FieldPair>
  <Field label="Date" htmlFor="order-date">
    <DateInput id="order-date" label="Order date" value={date} onChange={setDate} />
  </Field>
  <Field label="Status" group>
    <Segmented options={orderStatuses} value={status} onChange={setStatus} label="Status" />
  </Field>
</FieldPair>
```

## Choosing a variant

The variant only changes what happens as the window narrows; on a desktop all three look the
same.

- **no variant** — two columns, stacking at the phone breakpoint. The default, and right for
  most pairs.
- **`field-pair-keep`** — stays two columns on a phone. Only for short values that still fit
  half a phone width, such as a From/To date range or a min/max amount.
- **`field-pair-stack-early`** — drops to one column sooner than the default, for two fields
  that each need room to read, such as two comboboxes in a filter panel.

## What does not belong in a pair

A field carrying the longest string on a form — a vendor name, a category name, a link — holds a
row by itself. Half a row is exactly where it has least room.

## Props

- `variant` — `field-pair-keep` or `field-pair-stack-early`
- `children` — two `Field`s

## Example

```jsx
<FieldPair variant="field-pair-keep">
  <Field label="From" htmlFor="filter-from">
    <DateInput id="filter-from" label="From date" value={from} onChange={setFrom} />
  </Field>
  <Field label="To" htmlFor="filter-to">
    <DateInput id="filter-to" label="To date" value={to} onChange={setTo} />
  </Field>
</FieldPair>
```

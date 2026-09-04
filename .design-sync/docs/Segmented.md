---
category: Forms
---
A row of segments where exactly one is on: a status, a page size, a chart period. It looks and
announces like tabs, so it behaves like them — the click selects, the arrow keys move the
selection, and only the selected segment is in the tab order.

## How to compose it

A segmented control is a group of buttons, so its `Field` takes `group` — that makes the field a
`<div>` instead of a `<label>`, because a label around several buttons labels only the first.

```jsx
<Field label="Status" group>
  <Segmented options={orderStatuses} value={status} onChange={setStatus} label="Status" />
</Field>
```

Inside a `Field` the control fills the width and stands 48px tall, so it matches the fields above
and below it. Outside one it is inline and sized to its labels, which is how the statistics
compare switch is drawn.

## When to reach for it, and when not

Use it for a short, fixed, ordered list the reader should see all of at once: three statuses,
seven page sizes, two things to compare against. Past roughly seven segments, or when the list
is searched rather than scanned, use a `Combobox` instead — two controls asking the same kind of
question must not be drawn two ways.

**Read the options left to right before shipping one.** The order is a claim about time or size.
Ordered / Delivered / Returned is the life of an order; any other order says something untrue
about it.

## Data

`options` is an array of strings, and those strings are both the labels and the values. `value`
must be one of them or nothing is selected. Numbers are passed as strings and converted back in
`onChange`.

## Props

- `options` — the segments, in order
- `value` — the selected option
- `onChange(option)` — gets the chosen string
- `label` — the accessible name of the whole control
- `compact` — default `true`; smaller padding and type. Ignored inside a `Field`.
- `tablist` — default `true`; announce as a tab list

## Example

```jsx
<Field label="Rows per page" group
  help="How many rows the order, vendor and category lists show before the pager.">
  <Segmented options={['5', '10', '15', '20', '25', '50', '100']}
    value={String(pageSize)} onChange={v => save({ pageSize: Number(v) })}
    label="Rows per page" />
</Field>
```

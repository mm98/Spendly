---
category: Forms
---
A date field: a native date input inside a field shell, with the calendar glyph that opens the
picker. Use it for every date in the app — an order date, a delivery date, a filter range.

## How to compose it

It brings its own shell, so it goes straight inside a `Field` with no `FieldShell` around it.

```jsx
<Field label="Date" htmlFor="order-date">
  <DateInput id="order-date" label="Order date" value={date} onChange={setDate}
    aria-required="true" />
</Field>
```

## The value is always ISO

`value` is `YYYY-MM-DD`, or `''` for an empty field, and `onChange` hands back the same shape.
Never a formatted Danish date. A half-typed date also arrives as `''`, so a "required" check
catches a malformed date at the same time.

How the date is *drawn* is the browser's, not the app's: the native control follows the
operating system, not the account's date format setting. Do not try to make it print
`14.08.2026`.

## label and trail

- `label` is the accessible name of the input itself, e.g. `Order date` or `From date`. Set it
  even when the `Field` already has a label, so the name says *which* date.
- `trail` is a short note pinned beside the calendar glyph, rendered as a `FieldUnit`. The order
  form passes `today` when the chosen date is today's.

## Saying a date is wrong

Same as every other control: `invalid` plus `describedBy`, with the message on the `Field`.

```jsx
<Field label="Date" htmlFor="order-date"
  error={dateField.error} errorId={dateField.errorId}>
  <DateInput id="order-date" label="Order date" value={date}
    invalid={dateField.invalid} describedBy={dateField.describedBy} onChange={setDate} />
</Field>
```

## Props

- `id`, `value`, `onChange(value)`
- `label` — the input's accessible name
- `trail` — a short note beside the glyph
- `invalid`, `describedBy`
- anything else is spread onto the `<input type="date">`

## Related

Two dates in a row go in a `FieldPair variant="field-pair-keep"`, which keeps them side by side
on a phone.

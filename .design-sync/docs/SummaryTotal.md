---
category: Rows
---
The bottom line of a summary panel — one step larger and heavier than the `SummaryRow`s it
closes.

## Composing it

It always follows a tight divider, which is what separates the parts from their sum:

```jsx
<SummaryRow label="Items subtotal" value="1.284,50 kr." />
<SummaryRow label="Discount" value="-120,00 kr." />
<SummaryRow label="Shipping" value="39,00 kr." />
<CardDivider className="card-divider-tight" />
<SummaryTotal value="1.203,50 kr." />
```

One per panel. Two totals in one card is two claims about which figure is the answer.

## Settled or still being built

`estimate` marks a total that is not final — a create or scan form's rail, where nothing has
been saved and one more line changes the figure. Say it in the label as well
(`label="Estimated total"`), so the row states in words what the styling states in weight.

Drop both on a record that already exists: an order's own page is showing a fact, not a
preview.

## Props

- `label` — defaults to "Total"
- `value` — the figure, formatted
- `estimate` — marks a total still being built

A saving line under the total is a separate `field-help summary-saved` line, not a second
total.

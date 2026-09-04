---
category: Rows
---
One line of a summary panel: a label on the left, its answer on the right. It is the arithmetic
under an item list, and the fact list in a record's details rail.

## Composing it

Rows stack directly in a `CardBody`. Under an item list, close with a tight divider and a
`SummaryTotal`:

```jsx
<CardBody variant="card-body-tight">
	<SummaryRow label="Items subtotal" value="1.284,50 kr." />
	<SummaryRow label="Discount" value="-120,00 kr." />
	<SummaryRow label="Shipping" value="39,00 kr." />
	<CardDivider className="card-divider-tight" />
	<SummaryTotal value="1.203,50 kr." />
</CardBody>
```

In a details rail the same row states facts rather than money — status, date, vendor, kind,
reference — one row each.

## What to pass

`value` is whatever answers the label, already formatted — a figure, a word, or a node. Money
keeps the øre where the figure is a total someone could check against a receipt
(`1.284,50 kr.`) and drops to whole units where it is a summary (`18.420 kr.`). A discount line
is written with its own minus: `-120,00 kr.`. A row whose answer is a link passes the link:

```jsx
<SummaryRow label="Vendor" value={<Link className="summary-row-link" to="/orders/all">Bilka</Link>} />
<SummaryRow label="Saved vs retail" variant="summary-row-value-saving" value="110,28 kr. (19,3%)" />
```

`variant` takes class words that tone the answer, the way `Card` takes them. There is one today,
`summary-row-value-saving`, which makes the answer green.

Draw a row only where there is a value for it. A row reading "Discount" over nothing claims
a discount that was never given.

## Props

- `label` — the name of the fact
- `value` — the figure or value, formatted
- `className` — an extra modifier where one line needs its own treatment

The arithmetic has to add up on screen: subtotal, then the adjustments, then the total. Do
not print a partial sum the rows above it do not reach.

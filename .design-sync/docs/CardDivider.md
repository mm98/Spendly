---
category: Cards
---
The inset hairline inside a card. It goes between the header band and the body, and between
one body block and the next. It is never drawn on its own or between two cards.

Every `CardHeader` is followed by one. There is no variant of a card where the header runs
straight into the body.

## Props

- `className` — `card-divider-tight` or `card-divider-gap` where the default spacing is wrong.
  Most callers pass nothing.

## Example

```jsx
<Card aria-label="Order details">
	<CardHeader title="Order details" />
	<CardDivider />
	<CardBody variant="card-body-page">
		<SummaryRow label="Vendor" value="Bilka" />
	</CardBody>
	<CardDivider />
	<CardBody variant="card-body-page">
		<SummaryRow label="Total" value="1.284 kr." />
	</CardBody>
</Card>
```

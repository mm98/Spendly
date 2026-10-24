---
category: Data
---
The head of a summary, or of a card that opens one: a mark, a name, one line under it, and the chevron when the card is a link.

## Props

- `mark`: a `Mark` (usually `size="large"` holding an `Icon`)
- `title`: the name
- `subtitle`: one line under the name
- `chevron`: an `Icon` such as `chevron-right`, shown at the far end when the card is a link

## Rules

- Takes no `className` or `style`.
- Put it in a `Card`. Give the chevron only when the card has `to`.

## Example

```jsx
<Card to="/orders/new?source=empty">
	<SumHead
		mark={<Mark size="large" aria-hidden="true"><Icon name="file-text" size={24} /></Mark>}
		title="Empty order"
		subtitle="Type the details yourself."
		chevron={<Icon name="chevron-right" size={14} />}
	/>
</Card>
```

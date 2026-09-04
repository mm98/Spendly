---
category: Cards
---
The band above a group of cards: a `SectionLabel` on the left, the actions for the whole group
on the right. It sits outside the cards, so use it when an action applies to several cards
rather than to one — a `CardHeader` carries the actions that belong to a single card.

It is a flex row with the two ends pushed apart and a 40px minimum height, so it lines up with
the card headers below it.

## What the caller decides

- **The label.** Always a `SectionLabel`, never a bare heading element.
- **The actions.** One control can sit directly inside. Two or more must be wrapped in
  `<span className="row-inline">`, or they will be pushed apart from each other too.

## Props

- `children` — the label and the actions
- anything else is spread onto the `<div>`

## Example

```jsx
<SectionHeader>
	<SectionLabel>Your cards</SectionLabel>
	<span className="row-inline">
		<Button variant="caps compact" icon="check">DONE</Button>
		<Button variant="pill">CANCEL</Button>
	</span>
</SectionHeader>
```

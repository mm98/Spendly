---
category: Surfaces
---
Two columns of equal width, each keeping its own height: two wells in one card, two fields, two cards.

## Props

- `children`: the two halves

## Rules

- Takes no `className` or `style`.
- Two children. Each keeps its own height; they are not stretched to match.

## Example

```jsx
<Halves>
	<Field label="First name"><TextField value={first} onChange={setFirst} /></Field>
	<Field label="Last name"><TextField value={last} onChange={setLast} /></Field>
</Halves>
```

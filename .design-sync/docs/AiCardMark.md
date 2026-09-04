---
category: Cards
---
The brand receipt glyph that closes `AiCard`'s action row. It is decoration and is hidden from
screen readers, so it never carries meaning the reader needs.

It is drawn in the app's green on a dark fill and has no look of its own on a light background
— use it only inside `AiCard`, as the last child.

It pushes itself to the right end of the row with its own margin, so put it after the buttons
and add no spacer of your own.

## Props

- `size` — width and height in pixels. Defaults to 44, the full card's size. The New order rail
  uses `size={34}`.

## Example

```jsx
<AiCard headline="Scan receipts, skip typing" body="A photo or PDF becomes a draft order.">
	<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
	<AiCardMark />
</AiCard>
```

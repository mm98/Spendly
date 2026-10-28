---
category: Lists
---
One row for every list in the product. What varies is what the row carries: a handle, a mark, a count, actions, a chevron.

## Props

- `variant`: `'default'` | `'outline'` | `'primary'` | `'stack'` (two lines instead of a row) | `'top'` | `'add'` (the add row, a button) | `'carried'` (mid-drag) | `'picked'` (picked up from the keyboard) | `'card'` | `'sticky'` (the card row that stays put while the page scrolls: a form's commit bar)
- `color`: `'default'` | `'warning'` | `'danger'` | `'success'`
- `mark`: a `Mark` at the start
- `handle`: the drag handle's icon, such as `<Icon name="grip-vertical" />`; `handleLabel` says what it moves (default `'Reorder'`). A row with a handle is drawn inside a `ReorderList`, which moves it.
- `count`: a count that leads the row's text, or `'!'` for an attention row that counts nothing
- `actions`: controls at the end, such as a `ListItemRemove`
- `chevron`: at the very end, such as `<Icon name="chevron-right" />`
- `selected`: for the `outline` and `card` variants
- `opens`: a row its list opens on a click: the pointer and the hover fill
- `editable`: a row that turns into a field keeps one height
- `setting`: a row that holds a setting keeps its ground when an option in it is checked
- `onClick`: the row renders a button
- `to`: the row renders a link
- `onLongPress`: on touch, a row held still opens its record menu: this opens it

## Parts

- `ListItemRemove`: a control that shows when its row is hovered or focused, and stays on touch. Goes in `actions`.
- `Announce`: something said to a screen reader after a change. Read out, not drawn.

## Motion

- Inside `Rows` (or a `ReorderList`, which holds its own), a row added later drops in, a row removed fades where it stood, and the rows below glide up. After a sort or a filter each row glides to its new place.

## Rules

- Takes no `className` or `style`.
- `selected` belongs to the `outline` and `card` variants.
- A row that can be acted on renders a button (`onClick`, or `variant="add"`) or a link (`to`). A row that only states something is a plain block.
- An `add` row keeps the handle's column empty, so it lines up under rows that can move.

## Example

```jsx
<ListItem variant="card" mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>} onClick={open}>
	<Stacked>
		<Line>
			<span className="sp-title sp-truncate">Indbo Møbler</span>
			<span className="sp-grow" />
			<span className="sp-amount">4.310,00</span>
		</Line>
		<Line><span className="sp-meta">SPENDLY-447 · 08/08/2026</span></Line>
	</Stacked>
</ListItem>
```

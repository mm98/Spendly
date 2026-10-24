---
category: Lists
---
A list the reader puts in order by hand. A row is carried by its handle and the other rows make room as it passes. From the keyboard, Space or Enter picks a row up, the arrows move it one place, Space puts it down and Escape puts it back. Each move is read out.

## Props

- `items`: the rows' records, in their saved order
- `keyOf`: a record's key, such as `item => item.id`
- `nameOf`: what a record is called, read out as it moves, such as `item => item.name`
- `onMove(items, item, to)`: the new order, called once when `item` is put down in a new place, at `to`. Putting a row down where it was calls nothing.
- `children`: a function that draws one row: `item => <ListItem handle={...} handleLabel={...}>...</ListItem>`

## Rules

- It draws no box of its own: put it inside the page's list element, such as `<div className="sp-stack sp-gap-8">`.
- Each row is a `ListItem` or a `NavItem` with a `handle` and a `handleLabel`, such as `Move Housing`.
- The page keeps the order: set `items` to the new order in `onMove`.
- A row added to `items` drops in, and a row removed fades out while the rows below glide up. Put no `Rows` around it.
- On touch, a row is carried after the handle is held still for a moment, so a scroll that starts on a handle still scrolls.

## Example

```jsx
const [accounts, setAccounts] = useState([{ id: 'a', name: 'Housing' }, { id: 'b', name: 'Food' }])
<div className="sp-stack sp-gap-8">
	<ReorderList items={accounts} keyOf={a => a.id} nameOf={a => a.name} onMove={next => setAccounts(next)}>
		{a => (
			<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${a.name}`}>
				<span className="sp-title sp-grow">{a.name}</span>
			</ListItem>
		)}
	</ReorderList>
</div>
```

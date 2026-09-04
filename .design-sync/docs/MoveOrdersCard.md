---
category: Cards
---
The card in the rail of an edit form that moves a record's orders somewhere else. It sits
beside `DeleteCard`, and it is what makes a delete possible: a vendor or a category that still
has orders on it cannot be removed, so the orders have to go somewhere first.

The move is confirmed, never undone. Nothing records which orders moved, so there is nothing
to put back.

## Props

- `what` — `"vendor"` or `"category"`, singular and lowercase. It writes every label.
- `from` — the name they move away from, named in the question.
- `count` — how many orders would move. Zero renders the sentence with no control.
- `groups` — the list to choose from, in the Combobox's shape.
- `onMove` — called with the chosen option after the reader confirms.
- `children` — the sentence under the heading.

## Example

```jsx
<MoveOrdersCard what="vendor" from={vendor.name} count={vendor.orderCount}
	groups={vendorGroups} onMove={target => moveOrders(vendor.id, target.id)}>
	Bilka has 14 orders. Move them to another vendor before removing it.
</MoveOrdersCard>
```

Nothing is disabled when no target is chosen: the reader is told what is missing where they
would fix it, the same way every other form in the app rejects.

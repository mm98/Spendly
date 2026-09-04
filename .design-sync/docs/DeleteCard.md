---
category: Cards
---
The delete control in the rail of an edit form, for a record that has no page of its own to put
it on. One card, so no two forms invent a different place for the same act.

Use it only on an edit form, never on a create form: there is nothing to delete yet.

## Pairing it with useDelete

The card draws the button and the confirmation dialog; the hook owns both.

```jsx
const del = useDelete({
	what: 'vendor',
	detail: 'Bilka has 18 orders on it.',
	onDelete: remove
})

<DeleteCard what="vendor" del={del}>
	A vendor that still has orders on it cannot be removed: the orders would point at nothing.
</DeleteCard>
```

`useDelete` reads the account's "ask before deleting" setting live, so the same act asks the
same question on every screen. Never build your own confirm around this card.

## What the caller decides

- `what` — the record in words, lower case. It is uppercased into the header ("Delete vendor")
  and the button ("DELETE VENDOR"), so pass `"vendor"`, not `"Vendor"`.
- The sentence — one or two lines saying what removing it does and what stops it. Say what
  survives ("Removing a category does not remove its orders") as well as what goes.

## Props

- `what` — the record in words
- `children` — the sentence
- `del` — the object `useDelete` returns; the card reads `del.button` and `del.dialog`

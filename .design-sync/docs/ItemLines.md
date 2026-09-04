---
category: Forms
---
The whole items block on an order: the list of lines, the card a line opens into when it is
edited, the dashed row that adds one, and the totals under it. Reach for it for any editable
list of lines — everything about editing, validating, reordering, photographing and deleting a
line is already inside it.

## How to compose it

The host owns the array and is handed a new one on every change. It holds no copy of the list.

```jsx
<ItemLines items={draft.items} onItemsChange={items => update({ items })}
  heading={false} onAnnounce={toast} photoOf={photoOf}
  error={itemsTried && !draft.items.length ? 'An order needs at least one item.' : ''}
  onPhotoPick={pickPhoto} onPhotoClear={clearPhoto} />
```

An item is `{ id, title, quantity, price, retail?, note? }`. `price` and `retail` are per piece,
in the account's currency as plain numbers; the component formats them and works out the line
totals and the saving. A line added in the card gets an id of its own, which is what
`onPhotoPick` is handed.

## heading: who names the list

- `heading={false}` where the card around it already carries the name and the count in its
  header band — otherwise the list is named twice with the count printed twice under it.
- `heading` left on where the list is a section inside a wider form with no card band of its
  own. It then draws the name, the count and the hint about how the list is worked.

`label` is the word it calls itself in that row and in what is announced. Default "Items".

## Pictures

`photoOf(item)` returns `{ present, src }` or `{}`. It exists because this component has no
opinion about where a picture comes from: a file picked in this session, an attachment already
on the server, or both — the host combines whatever it knows into one answer. `onPhotoPick(id,
file)` and `onPhotoClear(id)` are how the host is told to keep it.

## The rejection

`error` is the message for the list as a whole — "An order needs at least one item." — drawn
where a field's own rejection would be, above the list. Set it only after a submit. A rejection
of one field inside the open card is drawn under that field, and this component does that
itself.

## What it decides for you

- Editing in place: the row becomes a card at its own index, so nothing above the list moves
  and the scroll position holds.
- Validation of the four fields, and what a half-finished card does when the reader clicks
  another row: an empty card closes, a valid one saves, and only an invalid one asks.
- Reordering, by dragging a grip or with the arrow keys — and grips appear only once there is
  more than one line to move.
- Deleting a line, through the same ask-before-deleting setting every other delete in the app
  reads.
- The totals row: how many items, what was paid, and what was saved against retail.

None of that is passed in, and none of it should be rebuilt around it.

## Props

- `items`, `onItemsChange(items)`
- `onAnnounce(message)` — pass the page's toast, so the screen has one live region
- `error` — the list-level rejection
- `photoOf(item)`, `onPhotoPick(id, file)`, `onPhotoClear(id)`
- `label` — default "Items"
- `heading` — default `true`

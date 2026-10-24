---
category: Lists
---
The foot of a list that grows by pages: "Showing 20 of 64", and Load more while more remain.

## Props

- `shown`: how many records are loaded
- `total`: how many there are
- `pageSize`: the foot shows only when `total` is more than this (default `0`)
- `onMore`: called when Load more is pressed
- `loose`: takes the grid's width, for a set of cards with no list around it
- `locale`: whose way of grouping thousands the counts use
- `children`: sits beside the count

## Rules

- Takes no `className` or `style`.
- Renders nothing while `total` is not more than `pageSize`.
- Load more is gone once `shown` reaches `total`, never disabled.
- After Load more, focus goes to the first record it brought.
- `List` draws its own; use `ListMore` under `Records` or a set of `ListItem` cards.

## Example

```jsx
<ListMore loose shown={20} total={64} pageSize={20} onMore={loadNext} />
```

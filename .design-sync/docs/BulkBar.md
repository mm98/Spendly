---
category: Lists
---
What can be done to the records picked: the count, then the actions. It takes the place of the summary line after the first pick.

## Props

- `count`: the count line, such as `'3 selected'`
- `onClear`: clears the selection; called from the box (or from the close button in `head`)
- `selectAll`: leads the bar with the box that selects the page: `{ selectedCount, total, noun, onToggleAll }`. Without it the bar leads with a checked box that clears the selection.
- `loose`: carries its own border, for a set with no list around it
- `head`: stands in for a phone's top bar, with a close button at the end. Inside the app shell it moves into the top bar's place.
- `children`: the actions, usually small `Button`s

## Rules

- Takes no `className` or `style`.
- `List` draws its own bulk bar; use `BulkBar` over `Records` or a page's own set.

## Example

```jsx
<BulkBar loose count="4 of 12 selected" selectAll={{ selectedCount: 4, total: 12, noun: 'orders', onToggleAll }}>
	<Button variant="outline" size="small">Set status</Button>
	<Button color="danger" size="small" iconStart="trash">Delete</Button>
</BulkBar>
```

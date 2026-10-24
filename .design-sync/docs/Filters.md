---
category: Lists
---
What is filtering a list, one removable `Crumb` each, and Clear all. It also lays out a facet's values as `Chip`s.

## Props

- `onClear`: shows a Clear all button that calls it
- `children`: `Crumb`s, or facet `Chip`s

## Parts

- `Crumb`: one filter. `children` is its text (text only). `name` is what its remove button says ("Remove …"); the text when absent. `onRemove` is called by the × and by Backspace on the crumb. `onOpen` makes it a button that opens that level, with no ×; this is for an earlier level in `Crumbs`.

## Rules

- Takes no `className` or `style`.
- A crumb is text only, never a mark.
- When a crumb or Clear all is removed, focus moves to the next crumb's remove, else the one before, else the control after the row.

## Example

```jsx
<Filters onClear={clearAll}>
	<Crumb name="the date range" onRemove={clearDates}>1 Aug - 31 Aug 2026</Crumb>
	<Crumb onRemove={clearVendor}>Indbo Møbler</Crumb>
</Filters>
```

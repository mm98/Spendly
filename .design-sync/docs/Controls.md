---
category: Lists
---
The bar above a list: search first, then pickers and the one button, each at its own width.

## Props

- `children`: the controls, such as `SearchInput`, a Filters `Button`, a sort `Combobox` and a `Segmented` view switch

## Rules

- Takes no `className` or `style`.
- Search comes first.

## Example

```jsx
<Controls>
	<SearchInput value={q} onChange={setQ} placeholder="Search orders…" aria-label="Search orders" />
	<Button variant="outline">Filters</Button>
	<Combobox variant="sort-end" prefix="Sort" value="Newest first">{sortOptions}</Combobox>
</Controls>
```

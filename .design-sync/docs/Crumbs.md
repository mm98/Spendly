---
category: Lists
---
The drill path: the root as text, then a `Crumb` for every level drilled into.

## Props

- `root`: the start of the path, as text
- `children`: one `Crumb` per level

## Parts

- `Crumb`: one level. Earlier levels take `onOpen` (they open that level and have no ×); the last level takes `onRemove` and shows a ×. Every level can take `onRemove` for Backspace. `name` is what the remove button says. Text only.

## Rules

- Takes no `className` or `style`.
- A crumb is text only, never a mark.

## Example

```jsx
<Crumbs root="All spend">
	<Crumb key="c" onOpen={openFurniture} onRemove={dropFurniture}>Furniture</Crumb>
	<Crumb key="v" name="Indbo Møbler" onRemove={dropVendor}>Indbo Møbler</Crumb>
</Crumbs>
```

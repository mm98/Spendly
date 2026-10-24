---
category: Forms
---
A grid of cells to pick one from: colour swatches or icon tiles. The arrow keys walk the grid, and it is one Tab stop.

## Props

- `swatches`: colour names (`'green'`, `'green-2'` … `'green-5'`, `'amber-ink'`, `'amber-2'`, `'red-ink'`, `'ink-6'`) or colour values
- `icons`: `{ name, icon, label?, loading? }[]`; `icon` is the element (`<Icon name="lamp" />`), `loading` draws a placeholder tile
- `value`, `onChange(nameOrColour)`: receives the swatch, the icon's `name`, or the custom colour
- `custom` with `customIcon`: a last swatch that opens the platform's colour picker (swatches only)
- `search`, `onSearch(text)`, `searchLabel`, `noun`: a search above the tiles (icons only); `noun` (plural) names the count read out
- `more` with `onMore`: a last "+42" cell
- `empty`: the text shown instead of a grid with no cells
- `aria-label`: names the set

## Rules

- Takes no `className` or `style`.
- `swatches` or `icons`, never both. `custom` belongs to swatches; a search belongs to icons. Each mistake is reported.
- It is a set, so in a `Field` its label becomes a legend.

## Example

```jsx
<Field label="Colour">
	<Picker aria-label="Colour" swatches={['green', 'green-3', 'amber-ink', 'red-ink']} value={colour}
		onChange={setColour} custom customIcon={<Icon name="plus" />} />
</Field>
```

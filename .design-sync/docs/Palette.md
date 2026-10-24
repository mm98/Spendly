---
category: Navigation
---
The search window over the page: a query line, results in groups, and the keys at its foot. On a phone it fills the screen.

## Props

- `value`, `onChange`: the query; `onChange` receives the text
- `placeholder`, `label`: the field's placeholder and its accessible name
- `count`: the result count beside the query ("5 results")
- `foot`: the key hints at the foot, as a list of short strings (`['↑↓ move', '↵ open', 'esc close']`)
- `activeId`: the id of the row the arrow keys are on
- `inputRef`: a ref to the field
- `screen`: the phone form: the search field with Cancel beside it; rows lose figures and keys; no foot
- `onCancel`: the Cancel button, in `screen` only
- `children`: `PaletteGroup`, `PaletteRow`, `PaletteRule` and `PaletteAll`

## Parts

- `PaletteGroup`: the small title over a group of rows.
- `PaletteRule`: the rule between two groups.
- `PaletteRow`: one record or action. `icon` or `thumb` (a picture's address, or `true` for an empty box) leads it; `action` gives the icon a solid mark; `plain` a lighter name; `match` is marked in the name; `meta` follows the name; `value` (an amount), `note` or `kbd` end it; `selected`.
- `PaletteAll`: the link from a group to all of its records ("All 9 orders from Bilka"); `selected`.

## Rules

- Takes no `className` or `style`.
- On a desktop it sits in a `Scrim` with `dialog`, over the page.
- A long name stays on one line and ends in an ellipsis.

## Example

```jsx
<Palette value={text} onChange={setText} count="5 results" label="Search or run a command" foot={['↑↓ move', '↵ open', 'esc close']}>
	<PaletteGroup>Vendors</PaletteGroup>
	<PaletteRow icon="building-store" match={text} meta="14 orders" selected>Bilka</PaletteRow>
	<PaletteRule />
	<PaletteGroup>Orders</PaletteGroup>
	<PaletteRow thumb match={text} meta="19/08" value="3.980,00 kr.">Bilka · SPENDLY-441</PaletteRow>
	<PaletteAll>All 9 orders from Bilka</PaletteAll>
</Palette>
```

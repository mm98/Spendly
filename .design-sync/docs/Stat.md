---
category: Data
---
One figure and the words around it: a label above, and a delta, a meta line or a help line under it.

## Props

- `figure`: the number, already formatted, e.g. `'61.480,00 kr.'`
- `large`: the bigger figure
- `color`: `'default'` | `'success'` | `'zero'` (a figure that holds nothing, such as a saving of 0, stays grey)
- `label`: the name above the figure
- `delta`: a change, in green under the figure (e.g. "Saved 8.240,00 kr.")
- `meta`: the quiet line that says what the figure is measured against
- `help`: the same line said as a field's help; `helpColor`: `'default'` | `'warning'` | `'success'` | `'danger'`
- `bare`: no box of its own; the parts sit straight in the card or row that holds them, and the label is a quiet line

## Rules

- Takes no `className` or `style`.
- A card's name is its `CardHeader`. A figure in a card with a header leaves out `label`.

## Example

```jsx
<Card>
	<Stat label="August" figure="61.480,00 kr." delta="Saved 8.240,00 kr." />
</Card>
```

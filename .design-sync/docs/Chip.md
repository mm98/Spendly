---
category: Actions
---
A small labelled tag: a category on an order, a filter that is on, a suggestion to add, or a facet value to pick.

## Props

- `variant`: `'outline'` (default) | `'solid'` | `'dashed'` (missing or to add, e.g. "No category", "+ New: Garden") | `'suggestion'` (the dashed chip a reader taps to add a value under a field; larger on touch) | `'pill'` | `'facet'` (a value to pick in a filter)
- `color`: `'default'` | `'danger'` | `'success'`
- `onClick`: makes the chip a button. Without it, and outside `facet`, the chip is static text and does not look clickable.
- `trail`: an element after the text, e.g. an `IconButton` that clears the filter, or a dot
- Facet only:
  - `selected` with `onSelect(checked, value)` (controlled), or `defaultSelected` (uncontrolled)
  - `inputType`: `'checkbox'` (default) | `'radio'`
  - `name`: required for radios, so they form one group
  - `value`: what is stored; the text when absent
  - `count`: a live count after the name
  - `disabled`: a value with nothing behind it, shown greyed in its place

## Rules

- Takes no `className` or `style`.
- `disabled` belongs to a facet chip only.
- A facet chip needs its text as a plain string: its selected width is reserved from it, so picking does not move its neighbours.
- A radio facet needs a `name`.
- A chip with a `trail` is not itself a control: do not give it `onClick` as well.
- Plain text is cut with "…" when the chip runs out of room.

## Example

```jsx
<div className="sp-row-flex sp-gap-8">
	<Chip>Decor</Chip>
	<Chip variant="dashed" onClick={addCategory}>+ New: Garden</Chip>
	<Chip variant="solid" trail={<IconButton icon="x" size="small" aria-label="Clear the vendor filter" />}>Vendor: IKEA</Chip>
	<Chip variant="facet" selected={on} onSelect={setOn} count="12">Decor</Chip>
</div>
```

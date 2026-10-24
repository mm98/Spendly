---
category: Forms
---
A legend over a set of controls, such as radios, checkboxes or a pair of bounds. As a `facet`, it is one group of a filter rail that folds.

## Props

- `legend`: the set's name
- `children`: the controls
- `facet`: draws the group as a filter rail does: its head is a button that folds the group, with a chevron
- `count`: text at the end of a facet's head ("24 total")
- `meta`: text at the end of a facet's head when its controls name themselves, as a range does
- `aria-describedby` and other fieldset attributes

## Parts

- `FieldGroupValues`: a facet's values; past the list's height they scroll inside the group.
- `FieldGroupMore`: the "Show 20 more" button under the values; `onClick`.
- `FieldGroupPanel`: what a facet opens under its values, as the date facet's custom range. It shows while a chip marked `data-preset="custom"` in the group is picked.

## Rules

- Takes no `className` or `style`.
- `count` and `meta` belong to a facet only. Otherwise they are reported.
- A folded facet is remembered on the device, by its legend.
- `Field` makes a `FieldGroup` itself when its child is a set (Picker, RangeSlider, Segmented).

## Example

```jsx
<FieldGroup facet legend="Vendor" count="24 total">
	<FieldGroupValues>
		<Choice control={<Check checked onChange={toggle} />}>Bilka · 9</Choice>
		<Choice control={<Check checked={false} onChange={toggle} />}>IKEA · 6</Choice>
	</FieldGroupValues>
	<FieldGroupMore onClick={showMore}>Show 20 more</FieldGroupMore>
</FieldGroup>
```

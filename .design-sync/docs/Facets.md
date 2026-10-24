---
category: Lists
---
The facet rail beside a list: one `FieldGroup facet` for each thing the list can be filtered by.

## Props

- `children`: `FieldGroup`s with `facet`, each holding `Choice`s with a `Check` and a live count

## Rules

- Takes no `className` or `style`.
- A value with nothing behind it stays in place, disabled, not hidden.
- A long group puts its values in `FieldGroupValues` and shows more with `FieldGroupMore`.

## Example

```jsx
<Facets>
	<FieldGroup facet legend="Status">
		<Choice control={<Check checked onChange={toggle} />}>
			Approved<span className="sp-grow" /><span className="sp-field-group__count">18</span>
		</Choice>
	</FieldGroup>
	<FieldGroup facet legend="Vendor" count="14 total">
		<FieldGroupValues>{vendorChoices}</FieldGroupValues>
		<FieldGroupMore onClick={showMore}>Show 10 more</FieldGroupMore>
	</FieldGroup>
</Facets>
```

---
category: Forms
---
One of a set, where picking one unpicks the others. The native radio input, restyled.

## Props

- `name`: the set it belongs to (needed)
- `checked` with `onChange(event)`, or `defaultChecked`
- `value`, `disabled` and other native radio attributes

## Rules

- Takes no `className` or `style`.
- Every radio of one set shares a `name`.
- Its text goes beside it in a `Choice`; the set goes in a `FieldGroup` with a legend.

## Example

```jsx
<FieldGroup legend="Where the amount comes from">
	<Choice variant="row" control={<Radio name="source" checked={src === 'receipt'} onChange={() => setSrc('receipt')} />}>The receipt total</Choice>
	<Choice variant="row" control={<Radio name="source" checked={src === 'lines'} onChange={() => setSrc('lines')} />}>The sum of the lines</Choice>
</FieldGroup>
```

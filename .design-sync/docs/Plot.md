---
category: Data
---
The frame a bar chart sits in: the amounts up the side, gridlines, an optional limit line, and the `Bars` inside.

## Props

- `axis`: the labels up the side, top first, e.g. `['30k', '20k', '10k', '0']`
- `gridlines`: how many lines across, default `4`; match it to the number of labels
- `limit`: `{ at, label }`; `at` is how far down from the top the line stands, as a CSS length such as `'27%'`
- `children`: one `Bars` with `variant="plot"`

## Rules

- Takes no `className` or `style`.
- Name the limit in a `Legend` under the plot (`series="limit"`), not on the line.

## Example

```jsx
<Card>
	<CardHeader name="Spend by month" aside="May to Sep 2026" />
	<Plot axis={['30k', '20k', '10k', '0']} limit={{ at: '27%', label: 'Monthly limit 22.000 kr.' }}>
		<Bars variant="plot" columns={columns} />
	</Plot>
	<Legend><LegendItem series="limit">Monthly limit 22.000 kr.</LegendItem></Legend>
</Card>
```

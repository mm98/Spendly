---
category: Data
---
The key under a chart that says what each series is, and names the limit line.

## Props

- `children`: `LegendItem`s

## Parts

- `LegendItem`: one key and its name. `series`: `1` (default) | `2` | `3` | `4` | `'limit'` (the dashed limit line of a `Plot`). `children`: the name.

## Rules

- Takes no `className` or `style`.
- Draw a legend only when a chart has more than one series, or a limit line.
- It goes under the chart, so it is read after it. The limit is named here, not on the line.

## Example

```jsx
<Legend>
	<LegendItem series={1}>Spend</LegendItem>
	<LegendItem series={4}>Not yet complete</LegendItem>
	<LegendItem series="limit">Monthly limit 22.000 kr.</LegendItem>
</Legend>
```

---
category: Ask
---
A chart in an Ask answer: the framed block a table uses, the chart's name and its period or total, then the chart, or a line saying why it could not be made.

## Props

- `name`: what the chart shows, e.g. `Spending per month`.
- `meta`: the period or the total, e.g. `Apr - Sep 2026`.
- `failed`: why the chart could not be made; shown in red in place of the chart.
- `children`: the chart: `Bars` (with `Legend` when it has two series), or `Donut` and `Shares` inside `ChatShares`.

## Parts

- `ChatShares`: the `Donut` beside its `Shares` where there is room, above them where not.

## Rules

- Takes no `className` or `style`.
- A chart that could not be made draws nothing: `failed` and `children` are not used together.
- There is no smaller chart: use the library's `Bars`, `Donut` and `Shares`.
- No column drills in, so `Bars` columns carry `label` and `readout` (a `ChartTip`); `open` is the column a finger tapped.

## Example

```jsx
<ChatChart name="Spending per month" meta="Apr - Sep 2026">
	<Bars columns={[
		{ key: 'aug', tick: 'Aug', height: 100, label: 'Aug 2026, 9.840,00 kr.', readout: <ChartTip title="Aug 2026" value="9.840,00 kr." /> },
		{ key: 'sep', tick: 'Sep', height: 80, label: 'Sep 2026, 8.080,00 kr.', readout: <ChartTip title="Sep 2026" value="8.080,00 kr." /> }
	]} />
</ChatChart>
```

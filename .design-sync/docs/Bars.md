---
category: Data
---
A bar chart: one column per step (a month, a week, a day), drawn plain, stacked, paired or muted, with the names of the steps under it.

## Props

- `columns`: the steps, each `{ key, height, tick, ... }`
  - `height`: 0 to 100; `tick`: the name under the column (labels are thinned to fit, the last is always shown)
  - `segments`: `[{ key: '1'|'2'|'3'|'4', share }]` for a stacked column
  - `pair`: two heights side by side, the second muted
  - `muted`, `future` (a step still to come), `inert` (opens nothing among columns that do)
  - `from`, `to`: the first and last day the column counts, as ISO dates; always both
  - `tip`: the readout shown on hover or focus (a `ChartTip`)
  - `readout` with `label`: the readout and screen-reader name of a column that opens nothing
- `variant`: `'default'` | `'plot'` (inside `Plot`) | `'card'` (the plot at a card's height) | `'spark'` (the small bars of a figure card)
- `days`: one bar per day
- `selected`: the key of the pressed column
- `onSelect(key, from, to)`: makes each column a button
- `open`: the key of the column a finger tapped; its `readout` stays shown
- `loading`: grey placeholder columns

## Rules

- Takes no `className` or `style`.
- A column with `from` and no `to` (or the other way) is reported. `from` after `to` is reported.
- The chart writes its own heights. Nothing in it sets a colour, a size or a radius.
- An answer's readouts (`readout`, `open`) show inside a `ChatChart`.

## Example

```jsx
<Plot axis={['30k', '20k', '10k', '0']} limit={{ at: '27%', label: 'Monthly limit 22.000 kr.' }}>
	<Bars
		variant="plot"
		selected="aug"
		onSelect={(key, from, to) => openMonth(from, to)}
		columns={[
			{ key: 'jul', height: 51, tick: 'Jul', from: '2026-07-01', to: '2026-07-31' },
			{ key: 'aug', height: 81, tick: 'Aug', from: '2026-08-01', to: '2026-08-31' }
		]}
	/>
</Plot>
```

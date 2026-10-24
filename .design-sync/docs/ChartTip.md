---
category: Data
---
The readout of one chart step: its name and total, one row per series, and a quiet line under them.

## Props

- `title`: the step's name, e.g. "August 2026" (cut with an ellipsis when long)
- `value`: the step's total
- `rows`: `[{ key, series?, name, value }]`; `series` is `1`-`4` and draws that series' key; a row without `series` (an order count) has no key
- `note`: the quiet line under the rows, e.g. "18 orders · click to open"

## Rules

- Takes no `className` or `style`.
- `Bars` places it beside the column it reads: pass it as a column's `tip` or `readout`, not on its own on a page.

## Example

```jsx
<ChartTip
	title="August 2026"
	value="24.310 kr."
	rows={[
		{ key: 'a', series: 1, name: 'Havemøbler', value: '9.480 kr.' },
		{ key: 'b', series: 2, name: 'Boligtilbehør', value: '6.810 kr.' }
	]}
	note="18 orders · click to narrow down"
/>
```

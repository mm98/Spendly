---
category: Dates
---
The stepper for a period: the window's name in one box, with an arrow on each side.

## Props

- `label`: the window's name ("August 2026", "Q3 2026", "Week 33")
- `unit`: `'week'` | `'month'` (default) | `'quarter'` | `'year'` | `'days30'`; sets the box width
- `onPrevious`, `onNext`: what each arrow does. An arrow without one is disabled
- `previousLabel`, `nextLabel`: the arrows' names for screen readers (default "Previous window", "Next window")
- `touch`: larger arrows for touch

## Rules

- Takes no `className` or `style`.
- An arrow with nowhere to go is disabled, never hidden, so the box keeps its width.
- Give the arrows names with the unit: "Previous month", not "Back".

## Example

```jsx
<PeriodWindow unit="month" label="August 2026" previousLabel="Previous month" nextLabel="Next month"
	onPrevious={showJuly} onNext={showSeptember} />
```

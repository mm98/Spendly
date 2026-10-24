---
category: Dates
---
A range of days: quick ranges, From and To fields, two months, the day count, and Cancel and Apply.

## Props

- `from`, `to`: ISO dates
- `onChange`: receives `(from, to)` as ISO dates
- `quick`: replaces the quick ranges, as `{ label, value: [from, to] }[]`. Default: Today, This week, This month, This year
- `min`, `max`: ISO dates; days outside are disabled
- `minDays`: the shortest range, counted inclusively (1 or more); a shorter pick is widened
- `unavailable`: a function `(isoDate) => boolean` that blocks single days
- `onApply`: Apply was pressed
- `onCancel`: Cancel or Escape; the range goes back to what it was when opened
- `showWeeks`: ISO week numbers (default `true`)
- `locale`: a language tag (`'da-DK'`)
- `single`: the touch form - heading, From and To, the months scrolling, the day count and Apply, with no Cancel

## Parts

- `RangeSheet`: on touch, the sheet over the page that holds a `single` range picker. `onClose` runs when the reader taps outside or presses Escape; it does not apply.

## Rules

- Takes no `className` or `style`.
- `from` after `to`, a bound outside `min`/`max`, or a bound on a blocked day is reported.
- The quick ranges are part of the control: replace them with `quick`, never pass an empty list.
- The count, Cancel and Apply belong to the control; a page does not add its own.

## Example

```jsx
<RangePicker from={from} to={to} max="2026-10-24" locale="da-DK"
	onChange={(a, b) => setRange([a, b])} onApply={apply} onCancel={close} />

<RangeSheet onClose={close}>
	<RangePicker single from={from} to={to} onChange={setRange} onApply={apply} />
</RangeSheet>
```

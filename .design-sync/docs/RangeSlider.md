---
category: Forms
---
Two handles on one track that pick a low and a high bound, with a box under each bound to type it. Given one number instead, it is a single slider: one handle, and one box.

## Props

- `value`: `[low, high]` for a range, or one number for a single value
- `onChange(value)`: receives the same shape it was given: both bounds kept in order, or the one number
- `min`, `max`: the ends of the track
- `step`: a dragged or arrowed bound lands on a step (default 1)
- `stops`: values at evenly spaced points instead of `min`/`max`, so the track is spaced by them, not by value
- `open`: the top end means "and above": shown with a `+`, and a larger typed value is kept
- `entry`: the boxes under the track where an exact figure is typed (default `true`); `false` leaves only the track
- `label`: names the handles and boxes ("Amount, from", "Amount, to")
- `format(n)`: how a bound is written in its box; `locale` names how typed text is read

## Rules

- Takes no `className` or `style`.
- `value` must be one number or two bounds. Anything else is reported.
- It is a set of inputs, so in a `Field` its label becomes a legend over the set.
- A typed bound is kept as typed until the box is left or Enter is pressed.

## Example

```jsx
<Field label="Amount between">
	<RangeSlider value={bounds} onChange={setBounds} min={0} max={6000} step={100} label="Amount" />
</Field>

<Field label="Closest amount">
	<RangeSlider value={limit} onChange={setLimit} min={0} max={500} step={10} label="Difference" />
</Field>
```

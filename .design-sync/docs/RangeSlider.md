---
category: Forms
---
Two handles on one track that pick a low and a high bound, with a box under each bound to type it.

## Props

- `value`: `[low, high]`, always two numbers
- `onChange([low, high])`: receives both bounds, kept in order
- `min`, `max`: the ends of the track
- `step`: a dragged or arrowed bound lands on a step (default 1)
- `stops`: values at evenly spaced points instead of `min`/`max`, so the track is spaced by them, not by value
- `open`: the top end means "and above": shown with a `+`, and a larger typed value is kept
- `label`: names the handles and boxes ("Amount, from", "Amount, to")
- `format(n)`: how a bound is written in its box; `locale` names how typed text is read

## Rules

- Takes no `className` or `style`.
- `value` must be two bounds. Anything else is reported.
- It is a set of inputs, so in a `Field` its label becomes a legend over the set.
- A typed bound is kept as typed until the box is left or Enter is pressed.

## Example

```jsx
<Field label="Amount between">
	<RangeSlider value={bounds} onChange={setBounds} min={0} max={6000} step={100} label="Amount" />
</Field>
```

---
category: Data
---
A ring of shares, one slice per share in its series colour, with the whole named in the hole. A `Shares` list beside it says what each slice is.

## Props

- `shares`: `[{ series: 1|2|3|4, value }]`, values as shares of 100
- `figure`: the whole, in the hole
- `label`: a quiet line under the figure
- `loading`: a grey ring that holds the place until the shares arrive
- `aria-label`: every share in words, e.g. "Indbo Møbler 46%, IKEA 27%"

## Rules

- Takes no `className` or `style`.
- Four series at most. Fold the rest into an "Other" share on series 4.
- Keep the figure short; the hole is small.

## Example

```jsx
<Donut
	shares={[{ series: 1, value: 61 }, { series: 2, value: 39 }]}
	figure="16.080"
	label="kr. in August"
	aria-label="Bilka 61%, IKEA 39%"
/>
```

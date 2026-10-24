---
category: Ask
---
Spendly's answer inside a `ChatMessage`: a working line while it comes, a failure with Try again, or the reply itself.

## Props

- `state`: `'answered'` (default, draws `children`) | `'working'` (a spinner and `doing`) | `'failed'` (says Spendly could not answer, with a Try again button)
- `doing`: what Spendly is doing while `working`. Default `'Reading your orders'`; a maker says its own, e.g. `'Making your Excel file'`, `'Drawing your chart'`.
- `onRetry`: called by Try again when `failed`.
- `children`: the answer: `p`, `ul`, links to records, `<span className="sp-amount">` for amounts, `ChatFigures` for a table, `ChatFiles` and `ChatChart` for what Ask made.

## Rules

- Takes no `className` or `style`.
- `state` must be one of the three values.
- `children` are drawn only when `answered`.

## Example

```jsx
<ChatMessage mark={<SpendlyMark />}>
	<ChatReply state="failed" onRetry={askAgain} />
</ChatMessage>
```

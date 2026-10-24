---
category: Ask
---
One message in the Ask conversation: its mark outside the bubble, the bubble, something after it, and the time under it.

## Props

- `mine`: the reader's own message, at the right. Default `false` (Spendly's, at the left).
- `mark`: the mark beside the bubble: `<SpendlyMark />` for an answer, the reader's own round `Mark` for a question.
- `end`: what follows the bubble, e.g. `<ChatSave />` beside a question.
- `time`: the time read under the message, e.g. `09:41`. An answer being written has none.
- `sentAt`: the ISO moment of `time`.
- `children`: `ChatQuestion` for the reader's, `ChatReply` for Spendly's.

## Rules

- Takes no `className` or `style`.
- A `time` needs its `sentAt`.
- Placed inside `ChatThread`, which lines messages up left and right.
- A message is at most three quarters of the column wide, unless it holds a chart.

## Example

```jsx
<ChatThread>
	<ChatMessage mine mark={me} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave saved onClick={toggle} />}>
		<ChatQuestion>Which vendor did I spend the most at in August?</ChatQuestion>
	</ChatMessage>
	<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:18">
		<ChatReply><p>Indbo Møbler, with <span className="sp-amount">24.310,00 kr.</span></p></ChatReply>
	</ChatMessage>
</ChatThread>
```

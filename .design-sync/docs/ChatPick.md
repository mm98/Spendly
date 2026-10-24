---
category: Ask
---
A saved or example question as a small button: pressing it uses the question, and the x beside it removes it.

## Props

- `question`: the question's text. One line, cut with … past 320px; the whole question is its tooltip.
- `onChoose`: the question was pressed.
- `onRemove`: adds the x that removes it. Left out, there is no x (as in What Ask can do).
- `disabled`: the question cannot be pressed, e.g. no questions left today. Default `false`.

## Rules

- Takes no `className` or `style`.
- On the empty Ask page, saved questions sit in `ChatExamples` under the empty state.

## Example

```jsx
<ChatExamples>
	<ChatPick question="How much did I spend at Bilka in September?" onChoose={send} onRemove={unsave} />
</ChatExamples>
```

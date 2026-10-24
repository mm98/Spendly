---
category: Utilities
---
A dashed row with a plus that adds one more of the rows above it: a budget row, a group, an account.

## Props

- `onClick`
- `children`: what it adds, e.g. "Add a row to Home"
- native button attributes (`aria-*`, `data-*`)

## Rules

- Takes no `className` or `style`.
- The plus is drawn by the component; pass only the words.
- It sits at the end of the rows it adds to.

## Example

```jsx
<AddRow onClick={addRow}>Add a row to Home</AddRow>
```

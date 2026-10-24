---
category: Utilities
---
A key as the reader sees it on their keyboard, beside the words for what it does.

## Props

- `accent`: a key inside a surface that is already green
- `children`: the key's text, e.g. `'S'`, `'?'`, `'⌘K'`

## Rules

- Takes no `className` or `style`.
- The words for the shortcut sit beside it, in `sp-subtitle`.

## Example

```jsx
<div className="sp-row-flex sp-gap-8">
	<Kbd>S</Kbd>
	<span className="sp-subtitle">focuses the search</span>
</div>
```

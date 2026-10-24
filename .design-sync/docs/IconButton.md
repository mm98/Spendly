---
category: Actions
---
A button that is only an icon: a row's menu, a clear, a remove, a back arrow.

## Props

- `icon` (required): an icon name from the register (see `Icon`), e.g. `'dots-vertical'`, `'x'`, `'trash'`; an element passes through as it is
- `aria-label` (required): what the button does, e.g. "Remove line"
- `variant`: `'bare'` (default) | `'outline'` | `'quiet'`
- `size`: `'row'` (default) | `'small'` | `'field'` (inside a field's end) | `'xsmall'`
- `danger`: red ink, for a destructive action
- `to`: an in-app route, renders a link; `href`: an outside address
- any native button attribute (`onClick`, `disabled`, `aria-expanded`, `aria-haspopup`)

## Rules

- Takes no `className` or `style`.
- Without `aria-label` it logs an error: a glyph names nothing.
- A control that goes somewhere is a link (`to` or `href`); one that acts in place is a button.
- An action with words is a `Button`.

## Example

```jsx
<div className="sp-row-flex sp-gap-8">
	<IconButton icon="dots-vertical" aria-label="This order" />
	<IconButton icon="x" size="small" aria-label="Clear the vendor filter" />
	<IconButton icon="trash" danger aria-label="Remove line" />
</div>
```

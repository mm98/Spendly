---
category: Actions
---
The button for one action: solid for the main action on a surface, outline beside it, text for the quiet way out.

## Props

- `variant`: `'solid'` (default) | `'outline'` | `'text'`
- `color`: `'primary'` (default, green) | `'warning'` | `'danger'` (a destructive action)
- `size`: `'standard'` (default) | `'small'` | `'xsmall'` (renders at small on touch)
- `border`: `'line'` (default) | `'inherit'` (takes the border colour of what it sits on)
- `fullWidth`: fills its container
- `iconStart`, `iconEnd`: an icon name from the register (see `Icon`), e.g. `'plus'`, `'chevron-right'`, `'trash'`
- `to`: an in-app route, renders a link; `href`: an outside address
- any native button attribute (`onClick`, `disabled`, `type`, `aria-*`)

## Rules

- Takes no `className` or `style`. A look the props cannot express is a missing variant.
- One solid button per surface. Cancel is `variant="text"`, never a second solid.
- Labels say the action and its object: "Save order", "Delete order", not "OK".
- An icon-only action is `IconButton`, not a Button without text.

## Example

```jsx
<div className="sp-row-flex sp-gap-12">
	<Button iconStart="plus">Add line</Button>
	<Button variant="outline">Duplicate</Button>
	<Button variant="text">Cancel</Button>
</div>
```

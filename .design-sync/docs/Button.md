---
category: Actions
---
The app's one button. What you pass decides which element renders, so the control always
matches what it does.

Pass `to` for an in-app route and it renders a react-router link. Pass `href` for a URL
outside the app and it renders a plain anchor, so middle-click and open-in-new-tab work.
Pass neither (with `onClick`) and it renders a real `<button>`. Never fake a link with a
button that calls `window.open`.

## Variants

`variant` is a space-separated list, each word becoming a `button-<word>` class:

| Variant | Use |
|---|---|
| `primary` | The one action a screen is for. At most one per view. |
| `outline` | The paired secondary action, usually Cancel. |
| `ghost` | A quiet action inside a card or row. |
| `caps` | Uppercase label, for short destructive or administrative actions. |
| `compact` | Smaller padding. Combine, e.g. `ghost compact`. |
| `block` | The full-width action that closes a card. Carries its own card surface, so it is used **alone**, never with `primary` (see below). |
| `pill` | Rounded filter or range switch. |
| `invert` | For placing on a dark surface such as `AiCard`. |
| `link` / `link-invert` | Reads as text, still a real control. |

`block` is a standalone treatment, not a modifier. `.button-block` sets its own background
and is declared after `.button-primary` at equal specificity, so `variant="primary block"`
renders the plain card-surface button and silently loses the green. Write `variant="block"`.

## Props

- `variant` — space-separated variant words, default `''`
- `to` — in-app route; renders a link
- `href` — external URL; renders an anchor
- `icon` / `iconAfter` — an `Icon` name placed before or after the label
- `children` — the label
- `className` — extra classes; anything else is spread onto the element

## Example

```jsx
<Button variant="primary" icon="plus" to="/orders/new">NEW ORDER</Button>
<Button variant="outline" onClick={cancel}>CANCEL</Button>
```

## Related

`IconButton` for a bare icon control, `ButtonLink` for a text-weight link.

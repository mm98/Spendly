---
category: Actions
---
A square control carrying a glyph and nothing else. Because there is no text inside it, the
`label` is the only thing that names it — always pass one, and say what it does to what:
"Edit order", "Remove Saved vs retail", "Download bilka-kvittering.pdf".

Like `Button`, what you pass decides the element: `to` renders a react-router link, `href` a
plain anchor (so `download` and `target` ride through `...rest`), and neither renders a real
`<button>`.

## Variants

`variant` is **one word**, appended to `icon-button-`. It is not space-split the way
`Button`'s is, so a second class has to be spelled in full.

| Variant | Size | Use |
|---|---|---|
| `arrow` *(default)* | 32px | Nearly every call: edit, delete, back, settings, a pager step |
| `clear` | 26px | A dismiss pushed to the end of its row (a toast, the update bar) |
| `send` | 40px, filled dark | The one submit-shaped glyph action, e.g. upload on the scan page |
| `reorder` | 28px | Controls on a card being rearranged |

```jsx
<IconButton variant="reorder icon-button-reorder-remove" icon="close" label="Remove Saved vs retail" />
```

That is the only two-class case in the app: `icon-button-reorder-remove` inks the glyph red.

`disabled` is dimmed on `reorder` and on pager arrows. Elsewhere a disabled icon button looks
exactly like an enabled one, so do not rely on it to say a control is unavailable.

## Props

- `variant` — `arrow` (default) | `clear` | `send` | `reorder`
- `icon` — an `Icon` name
- `label` — the accessible name; required in practice
- `to` — in-app route; renders a link
- `href` — external URL; renders an anchor
- `className`, `onClick`, `disabled`; anything else is spread onto the element

## Example

```jsx
<IconButton icon="pencil" label="Edit order" to={`/orders/${id}/edit`} />
<IconButton icon="trash" label="Delete order" onClick={ask} />
<IconButton icon="download" href={fileUrl} label={`Download ${file.name}`} download />
```

## Related

`Button` when there is a label to show, `ButtonLink` for a text-weight action.

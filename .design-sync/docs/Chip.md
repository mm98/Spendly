---
category: Chips
---
A value the reader put there and can take away: a category on an order, a filter on a list,
an alias on a vendor. It is the only chip in the app that is ever a control.

Pass `onRemove` and it renders a real `<button>` with a cross, and `label` names it
("Remove filter Bilka"). Pass no `onRemove` and it renders a `<span>` with no cross. Never
draw a cross the chip cannot honour — a chip that shows one and removes nothing is worse as
a button than it was as a span: reachable by keyboard, and inert.

## Where it goes

| Place | Form |
|---|---|
| Categories on a saved order | span, no `onRemove` |
| Filters standing on a list | button, `onRemove`, closed by a `ButtonLink` reading CLEAR ALL |
| Values inside a field being edited | button, `onRemove`, inside the field, not above it |

Inside a field, put the chips in the shell with the input, not in a row above it:
`<FieldShell className="field-shell-chips">` (add `field-shell-no-chevron` when there is no
dropdown). The shell wraps to a second line as chips are added, so a field with values still
lines up with the field beside it. `Combobox` takes the same set through its `chips` prop.

## Props

- `children` — the label. One line; it is cut with an ellipsis rather than widening the chip
  past its container.
- `onRemove` — the remove handler. Its presence is what makes the chip a button.
- `label` — the button's accessible name. Say what is removed, not "remove".
- `icon` — an `Icon` name, drawn after the label and before the cross.
- `className` — extra classes; anything else is spread onto the element.

## Example

```jsx
{filters.map(f => (
	<Chip key={f.key} label={`Remove filter ${f.label}`} onRemove={() => drop(f)}>
		{f.label}
	</Chip>
))}
<ButtonLink onClick={clearAll}>CLEAR ALL</ButtonLink>
```

## Related

`StatusChip` states where an order got to, `SavingChip` states a number against retail,
`TagChip` labels a promo. None of those three is interactive, and none of them shares this
one's tone or class vocabulary.

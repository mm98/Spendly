---
category: Navigation
---
A panel that rises from the bottom of a phone screen over a dimmed page, for a short choice or a form.

## Props

- `children`: the content, spaced in a column: a `sp-heading` title, fields, then a full-width commit
- `handle`: the grip at the top (default `true`). Pulled down far enough, it closes the sheet.
- `onDismiss`: called when the sheet is pulled closed. Without it, a press on the `Scrim` under it closes it.
- `ref`: a ref to the sheet box

## Rules

- Takes no `className` or `style`.
- Put it right after a `Scrim`, which dims the page under it.
- Give it `role="dialog"`, `aria-modal="true"` and an `aria-label`.
- A pull that does not reach the closing distance springs back.

## Example

```jsx
<Scrim />
<Sheet role="dialog" aria-modal="true" aria-label="Set a status" onDismiss={close}>
	<span className="sp-heading">Set a status</span>
	<FieldGroup>
		<Choice variant="row"><Radio name="status" defaultChecked />Approved</Choice>
		<Choice variant="row"><Radio name="status" />Returned</Choice>
	</FieldGroup>
	<Button fullWidth>Apply</Button>
</Sheet>
```

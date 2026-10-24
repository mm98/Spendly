---
category: Overlays
---
A decision that stops the page and cannot be answered by ignoring it: a question, what it costs, and the way out beside the commit.

## Props

- `children`: `DialogTitle`, then `DialogBody` (or plain words, which become the body), then `DialogActions`
- `onCancel`: what Escape and a press on the backdrop do
- `scrim`: `true` (default) puts the dialog over a dimmed page; `false` draws only the panel, in flow
- `aria-label`: a name, when there is no `DialogTitle`

## Parts

- `DialogTitle`: what the dialog asks, as its heading. It names the dialog.
- `DialogBody`: what the decision costs, stated in full.
- `DialogActions`: the way out and the commit. It spaces and aligns its own buttons; a `sp-grow` span between them pushes them to the two ends; `fullWidth` buttons share it in halves.
- `Scrim`: the dimmed backdrop a dialog or a sheet sits over; `dialog` centres a dialog in it. `Dialog` draws its own; use `Scrim` yourself only around `Dialog scrim={false}`.

## Rules

- Takes no `className` or `style`.
- A dialog with no `DialogActions` is reported.
- Below 640px the dialog is a sheet from the bottom edge.
- Title says the question ("Delete this order?"); the body names what goes with it; the commit names the action ("Delete order"), and the way out is outline or text.

## Example

```jsx
<Dialog onCancel={close}>
	<DialogTitle>Delete this order?</DialogTitle>
	<DialogBody>SPENDLY-447 from Indbo Møbler, 3.980,00 kr. Its 4 lines and 3 attachments go with it.</DialogBody>
	<DialogActions>
		<Button variant="outline" onClick={close}>Keep it</Button>
		<span className="sp-grow" />
		<Button color="danger" iconStart="trash" onClick={remove}>Delete order</Button>
	</DialogActions>
</Dialog>
```

---
category: Ask
---
What Ask can do: a part for each kind of thing Ask makes, with its formats on one line and one example question to pick. Shown in a `Dialog` on a computer and a `Sheet` on a phone.

## Props

- `makes` (required): the kinds, as the server lists them: `{ name, formats: string[], example, off? }`. With `off`, the part shows why nothing of that kind is made here, in place of formats and example.
- `disabled`: the example questions cannot be picked. Default `false`.
- `onChoose`: receives the example question picked.

## Rules

- Takes no `className` or `style`.
- Each example is a `ChatPick` without a remove button.
- Picking an example puts it in the field; it is not sent.

## Example

```jsx
<Dialog onCancel={close}>
	<DialogTitle>What Ask can do</DialogTitle>
	<ChatHelp onChoose={choose} makes={[
		{ name: 'Files', formats: ['Excel', 'CSV', 'Word', 'PDF'], example: 'Make an Excel file of my orders in October' },
		{ name: 'Charts', formats: ['Bar chart', 'Donut chart'], example: 'Show my spending per month as a chart' }
	]} />
	<DialogActions><Button variant="outline" onClick={close}>Close</Button></DialogActions>
</Dialog>
```

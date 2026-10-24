---
category: Forms
---
A row of a list opened for editing in place: a title with move and delete buttons, its fields, and Cancel and the commit button.

## Props

- `title`: the head ("Row 2 of 4 in Housing")
- `what`: the thing edited, used in the button names ("Move the row up", "Delete the row")
- `children`: the `Field`s; two or more sit in two columns, one fills the width
- `commit`: the commit button's text ("Save row", "Add group")
- `onCommit`, `onCancel`: Enter commits, Escape cancels
- `onCommitNext`: Ctrl or Cmd with Enter saves and opens the next line
- `onMoveUp`, `onMoveDown`, `onDelete`: each shows its button in the head; `first` / `last` disable a move
- `saving`: the commit reads "Saving…" and is disabled; a second Enter does nothing
- `hint`: the key hint left of the buttons (default "Enter saves · Escape cancels")
- `photo`: a photo slot beside the fields, in place of the head
- `sheet`: in a sheet: one column, and Cancel and the commit share the row with no hint
- `handle`: keeps an empty drag column so the row's text stays in line

## Parts

- `Totals`: the line under a list of items, with what they come to, then the saving.

## Rules

- Takes no `className` or `style`.
- Enter and Escape go to an open picker inside it first.

## Example

```jsx
<LineEditor title="Row 2 of 4 in Housing" what="row" commit="Save row"
	onMoveUp={up} onMoveDown={down} onDelete={remove} onCommit={save} onCancel={cancel}>
	<Field label="Name"><TextField value={name} onChange={setName} /></Field>
	<Field label="Expected each month" unit="kr."><NumberField value={amount} onChange={setAmount} /></Field>
</LineEditor>
```

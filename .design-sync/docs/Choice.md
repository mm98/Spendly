---
category: Forms
---
A box (`Check`, `Radio` or `Switch`) with its text beside it, inside one label, so a click on the text picks the box.

## Props

- `control`: the box, e.g. `<Check />`
- `children`: the text
- `variant`: `'default'` | `'row'` (a full-width row, tinted when picked) | `'described'` (a bold title with a description under it)
- `description`: the line under the title; only with `variant="described"`
- `descriptionTone`: `'meta'` (default) | `'help'`

## Rules

- Takes no `className` or `style`.
- A `description` needs `variant="described"`. Otherwise it is reported.
- `Field` makes a `Choice` itself when its child is a box.

## Example

```jsx
<Choice variant="described" control={<Radio name="import" checked onChange={pick} />}
	description="Rows that match an existing order are skipped.">Skip duplicates</Choice>
```

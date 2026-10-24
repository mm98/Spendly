---
category: Forms
---
A field of typed values shown as chips, each with its own remove button, and an input after them to add one more.

## Props

- `value`: the list of values (default `[]`)
- `onChange(values)`: receives the whole new list
- `placeholder`: in the add input ("Add…")
- `marked`: one value drawn in green, as the name that matched
- `trails`: maps a value to a mark drawn before its remove, e.g. a status dot
- `end`: a button at the field's right end; the chips keep clear of it
- `children`: `ComboboxOption`s offered in a panel as the reader types; with `onSearch(text)` to filter them and `noun` (plural) for the count read out
- `danger`: marks the input invalid
- `id`, `aria-label`: go on the add input

## Rules

- Takes no `className` or `style`.
- Only Enter or a new line ends a value, never a comma: a name can hold one.
- Backspace in the empty input removes the last value. A pasted list adds one value per line.
- The same value is never added twice.

## Example

```jsx
<Field label="Other names for this vendor">
	<TokensField value={names} onChange={setNames} placeholder="Add…" />
</Field>
```

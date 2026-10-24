---
category: Forms
---
A checkbox. The box is the native input, restyled, so its states are the element's own.

## Props

- `checked` with `onChange(event)`, or `defaultChecked`
- `indeterminate`: some of a set is picked
- `disabled`, `name`, `value`, `aria-label` and other native checkbox attributes

## Rules

- Takes no `className` or `style`.
- Its text goes beside it: wrap it in `Choice`, or put it in a `Field`, which does that.
- A checkbox waits for the form's save. A change that applies at once is a `Switch`.
- Alone, as in a list row, it takes an `aria-label`.

## Example

```jsx
<Choice control={<Check checked={attached} onChange={ev => setAttached(ev.target.checked)} />}>Attached</Choice>
```

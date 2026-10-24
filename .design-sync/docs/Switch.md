---
category: Forms
---
An on/off switch whose change applies at once, so the form has nothing to save.

## Props

- `checked` with `onChange(event)`, or `defaultChecked`
- `disabled`, `name` and other native checkbox attributes

## Rules

- Takes no `className` or `style`.
- A switch applies at once. A choice that waits for Save is a `Check`.
- Its text goes beside it: wrap it in `Choice`, or put it in a `Field`.

## Example

```jsx
<Choice control={<Switch checked={compare} onChange={ev => setCompare(ev.target.checked)} />}>Compare with July</Choice>
```

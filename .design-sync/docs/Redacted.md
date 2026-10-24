---
category: Utilities
---
An amount held back from view: a bar of one length, so its width says nothing about the figure.

## Props

None. It takes no props.

## Rules

- Takes no `className` or `style`.
- Screen readers read it as "Hidden".
- It stands where the figure would be: in a `Stat`'s `figure`, in a sentence, in a `Pill`.

## Example

```jsx
<Stat label="Left over" figure={hidden ? <Redacted /> : '1.480 kr.'} />
```

---
category: Forms
---
A password input with a button at its end that shows or hides what was typed. Placed inside a `Field`.

## Props

- `value`, `onChange(text)`: `onChange` receives the text, not the event
- `autoComplete`: `'current-password'` on sign in, `'new-password'` when one is chosen
- `placeholder`, `disabled`, `name` and other native input attributes

## Rules

- Takes no `className` or `style`.
- The eye button is the component's own. It is not passed in, and it starts hidden.
- The label and messages come from the surrounding `Field`.

## Example

```jsx
<Field label="Password" required>
	<PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
</Field>
```

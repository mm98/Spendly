---
category: Forms
---
A one-line or multi-line text input. Always placed inside a `Field`, which gives it its label, message and slots.

## Props

- `value`, `onChange(text)`: `onChange` receives the text, not the event
- `type`: `'text'` (default) | `'email'` | `'tel'` | `'url'`
- `multiline` with `rows` (default 3): a textarea
- `variant`: `'default'` | `'empty'` (dashed, nothing entered yet) | `'readonly'` | `'stretch'` (the height of its row)
- `code`: the text is a sign-in or recovery code, a key, or an address to paste. It is set in the monospaced face, so every character is the same width, a code does not shift as it is typed, and 0 and O read apart. Goes with any variant: `variant="readonly" code` for a key shown to be copied
- `fullWidth`: takes all the room it is given: the width of its column, or what is left in its row. Inside a `Field`, set it on the `Field`
- `action`: one icon button at the field's end, `{ icon, label, expanded, onClick }`
- `placeholder`, `disabled`, `readOnly`, `name`, `autoComplete` and other native input attributes

## Rules

- Takes no `className` or `style`.
- The label, help, warning and error come from the surrounding `Field` (`label`, `message`, `messageType` `'hint' | 'quiet' | 'warning' | 'danger'`, `required`, `lead`, `trail`, `unit`, `kbd`).
- A field never changes size with its value.
- Numbers use `NumberField`, passwords `PasswordField`, search `SearchInput`, dates `DateField`.

## Example

```jsx
<Field label="Vendor" required>
	<TextField value={vendor} onChange={setVendor} />
</Field>
<Field label="Email" messageType="danger" message="An email needs an @.">
	<TextField type="email" value={email} onChange={setEmail} />
</Field>
```

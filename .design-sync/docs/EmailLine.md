---
category: Utilities
---
An email address on one line: the part before the @ shortens with "…" when there is no room, and the @domain never does, since the domain says which account it is.

## Props

- `email` (required): the address
- `tone`: `'plain'` (default) | `'meta'` (small, grey) | `'nav'` (under a navigation item's name)

## Rules

- Takes no `className` or `style`.
- Inside a sentence, an email is text with `sp-break`, not an `EmailLine`.

## Example

```jsx
<EmailLine email="mikkel.munk@lomwas.dk" tone="meta" />
```

---
category: Forms
---
The one search field: a search mark at its start, the text, and a clear button once there is text.

## Props

- `value`, `onChange(text)`: `onChange` receives the text; the clear button calls it with `''` and puts focus back
- `placeholder`, `aria-label`: name what is searched ("Search orders")
- `kbd`: a key hint at the end, e.g. `<Kbd>⌘K</Kbd>`; shown only while the field is empty and has no `ends`
- `icon`: the lead mark's icon name (default `'search'`)
- `clear`: `false` hides the clear button (default `true`)
- `ends`: controls after the clear button at the field's end, e.g. `AskTrail`
- `name` (default `'search'`), `inputRef`, and other native input attributes

## Parts

- `AskTrail`: the Ask button at a search field's end, passed in `ends`. Off by default; `on` (green, pressed);
  `busy` (a spinner, Stop on hover or focus, `onStop`); `spent` (disabled, no questions left today). `onToggle` switches it.

## Rules

- Takes no `className` or `style`.
- The field keeps the room for its clear button whether or not there is text. A field never changes size with its value.
- There is no other search component. Search inside a facet or a picker is this one too.

## Example

```jsx
<SearchInput value={query} onChange={setQuery} placeholder="Search orders" aria-label="Search orders"
	ends={<AskTrail on={asking} onToggle={toggleAsk} />} />
```

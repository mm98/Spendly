---
category: Forms
---
The one dropdown in the app: type to search, results in headed groups, and an optional
create row at the foot. Every picker uses it, so a second dropdown pattern anywhere would
break the promise the help text makes.

Put it inside a `Field` so it gets a label, and give both the same `id`/`htmlFor`.

## Data shape

`groups` is an array of `{ heading, options }`, where each option is `{ id, label }`.
Headings are the section titles in the open list, e.g. Favourites then All vendors.

## Choosing a mode

- **Searchable** (default) — the user types and the list filters. Handle `onChange` for
  the typed text and `onSelect` for a chosen option.
- **Pick-only** (`pickOnly`) — sort orders, currencies, date formats: chosen from, never
  typed into. Still a real input, but with no caret and no mobile keyboard.

## Props

- `value` — the current text or the selected option's label
- `onChange(text)` — the user typed
- `onSelect(option)` — the user chose a row
- `groups` — `[{ heading, options: [{ id, label }] }]`
- `action` — label for the create row, e.g. `CREATE VENDOR`. It appears only once
  something is typed that does not already match an option.
- `placeholder`, `label`, `id`, `required`
- `invalid` / `describedBy` — error state, paired with the `Field`'s `error`
- `leadingIcon` — an `Icon` name shown inside the field
- `chips` — selected values rendered inside the shell rather than above it, so a field
  with values still lines up with the field beside it
- `trail` — content pinned to the right of the input
- `pickOnly` — see above

## Example

```jsx
<Field label="Vendor" htmlFor="order-vendor">
  <Combobox id="order-vendor" label="Vendor" placeholder="Search vendors..."
    value={draft.vendor} onChange={setVendor} onSelect={pickVendor}
    action="CREATE VENDOR" groups={vendorGroups} required />
</Field>
```

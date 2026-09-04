---
category: Rows
---
The row of chips under the toolbar, one per filter that is on. A chip is the only place a
filter is stored, so removing one turns that filter off and the count above the list moves.

## Composing it

Between `ListToolbar` and the filter panel, inside the filters card:

```jsx
<FilterChips chips={chips} focusRef={searchField}
	onRemove={chip => refilter({ ...filters, ...chip.clear })}
	onClearAll={clearAll} />
```

Derive `chips` from the query string rather than listing them — deriving is what keeps the
row and the filters from disagreeing. One entry per filter that is actually set:

```js
if (filters.status !== 'Any') chips.push({ key: 'status', label: filters.status, clear: { status: 'Any' } })
if (filters.vendorId) chips.push({ key: 'vendor', label: 'Vendor: ' + vendorName, clear: { vendorId: '' } })
```

Any extra field on a chip rides along and comes back in `onRemove`, which is how the app
carries what each chip turns off.

## What it draws, and what it does not

With `chips` empty the component renders nothing at all — no row, no empty state. So there
is no "no filters" state to design for.

With at least one chip it draws every chip plus CLEAR ALL. Removing a chip announces the
change and the number of filters still active, and moves focus to the next chip, or to
`focusRef` when the last one goes. Pass the search field's ref, the same one `ListToolbar`
gets: removing a chip takes away the element focus was on.

CLEAR ALL clears the filters and the keyword. It keeps the sort, because a sort is not a
filter.

## Labels

The label is the whole of what the reader is told, so name the filter and its value where
the value alone would not read: `Vendor: Bilka`, `Category: Groceries`, `From 100 kr.`,
`1 Aug - 31 Aug`. A status or a kind is its own word and needs no prefix.

Resolve ids to names before labelling. A chip reading "Vendor: v-bilka" states the storage,
not the choice.

## Props

- `chips` — `[{ key, label, ...anything you need back }]`
- `onRemove` — receives the whole chip
- `onClearAll` — clears the filters, keeps the sort
- `focusRef` — where focus lands when the last chip goes

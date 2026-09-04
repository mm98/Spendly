---
category: Rows
---
The band the working lists open with: one search field, an optional FILTERS disclosure, and
the app's one sort control. Use it above any list that searches and sorts.

## Composing it

On the two entity lists it stands bare on the page, above the list's card. On All orders it
sits in its own card with the filter panel under it:

```jsx
<Card aria-label="Search and filters">
	<CardBody variant="card-body-filters">
		<ListToolbar query={query} onQuery={setQuery} searchRef={searchField}
			placeholder="Search vendor, note or item text..." label="Search orders"
			sortLabel="Sort orders" sorts={sorts} sortValue={currentSort.label} onSort={resort}
			filters={{ open, panelId: 'filter-panel', onToggle: () => setOpen(o => !o) }} />
		<FilterChips chips={chips} focusRef={searchField} onRemove={...} onClearAll={...} />
		<FilterSection id="filter-panel" hidden={!open}>...</FilterSection>
	</CardBody>
</Card>
```

## State lives in the URL

`query`, the sort and the page belong in the query string, not in component state: a
filtered list is a place you can link to, and every link into these pages speaks that
string. Derive the props from the URL and write the URL back in the handlers.

## The three controls

- **Search.** `placeholder` names everything the search matches — a field promising only the
  name is lying about what it does. `label` is its own label, since it has no visible one.
- **Filters.** Pass `filters` only where there is a panel to open. `open` is the state, and
  the button's chevron turns with it. A list whose only filter is the keyword must not draw
  a disclosure over an empty panel.
- **Sort.** `sorts` is `{ id, label }` and `sortValue` is the current option's **label**, not
  its id — it is what the closed control displays. Label the column and the direction both:
  an option reading "Spend" that means highest-first names half of what it does. Offer both
  directions of every ranking column; a name column offers only A to Z, because that is the
  direction that finds a record.

The sort re-sorts through whatever produces the list, not by reordering the rows on screen —
the page holds one page of many.

## Props

- `query`, `onQuery`, `placeholder`, `label` — the search field
- `sorts`, `sortValue`, `onSort`, `sortLabel` — the sort control
- `filters` — `{ open, onToggle, panelId }`, the FILTERS disclosure
- `searchRef` — where focus lands after a filter chip is removed; pass the same ref to
  `FilterChips`

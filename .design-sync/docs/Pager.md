---
category: Rows
---
The pager every long list ends with: the range sentence on the left, PREVIOUS and NEXT on
the right. One component, so the sentence, the disabling and the page-of-pages note cannot
drift between the lists.

## Composing it

Inside the list's own card body, after the rows — including when the list is empty, so the
sentence still answers:

```jsx
<CardBody variant="card-body-tight">
	{rows.map(...)}
	<Pager from={from} to={to} matched={matched} page={page} pages={pages} onPage={setPage} />
</CardBody>
```

Where the page holds the whole list client-side, `paginate(listed, page, pageSize)` returns
exactly these fields, so `<Pager {...paged} onPage={setPage} />` is the usual call.

## Every prop is a number

`from`, `to`, `matched`, `page`, `pages` are numbers. `to` here is the last row on this page
— it is not a route, and this component never links anywhere.

- `from`/`to` — the slice showing, counted from 1 in the whole filtered set
- `matched` — how many rows the filter matched in total, not how many are on screen
- `page`/`pages` — the position. With `pages` 1 the position note is left off, because a
  one-page list has no position worth stating.

With `matched` 0 the sentence reads "Nothing to show" rather than "Showing 0 to 0 of 0".

## The buttons

They disable at the ends and nowhere else — that is the one honest reason to disable a
control here, and it is the only place in the app where a disabled button is visibly
disabled. Keep the page in the URL with the rest of the list state, and reset to page 1
whenever the search, the sort or a filter changes: page 4 of a list that just changed shape
is a position in the old answer.

## Props

- `from`, `to`, `matched`, `page`, `pages` — the numbers above
- `onPage` — receives the page number to go to

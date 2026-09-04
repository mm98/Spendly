---
category: Rows
---
A wrapper that remembers a list's query string for the length of the visit, and puts it back
when the page is reached with a bare URL. It draws nothing.

## Where it goes

Around a listing page in the route table, never inside the page:

```jsx
{ path: 'all', element: <ListState name="all-orders"><AllOrders /></ListState> }
```

`name` is that list's own storage key — one per listing page ("all-orders", "all-vendors",
"all-categories", "wishlist"). Two lists sharing a name restore each other's filters.

## What it does

The query string stays the only source of truth. This is a memory of the last one,
consulted in exactly one case: arriving with nothing in the URL.

- A URL that carries state wins outright. `?vendor=bilka` from a chart legend row means that
  vendor, never the last thing the tab was looking at.
- CLEAR ALL leaves an empty query, which is stored as empty and restored as empty — clearing
  stays cleared.
- The memory belongs to the tab and dies with it. Two tabs on two different filters keep
  their own, and nothing follows the account to another device.

Restoring is a redirect during render, so the unfiltered list is never requested: the page
below mounts already carrying the restored query.

## What it looks like

Nothing. It renders its children untouched, so a wrapped list is identical to an unwrapped
one. There is no visual state, no loading state and nothing to style — do not put a spinner,
a border or a heading around it.

## Props

- `name` — the list's storage key
- `children` — the listing page

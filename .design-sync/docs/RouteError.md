---
category: Feedback
---
The card a route shows when rendering it threw. Set it as a route's `errorElement`; it is not a
component a page composes into itself.

```jsx
{ path: '/orders/:id', element: <OrderDetail />, errorElement: <RouteError /> }
```

## What it draws

A single `Card` holding an `EmptyState` with the `alert` icon, one sentence — "This page did not
load. Reloading the page usually fixes it." — and a `Button variant="outline"` reading "Reload"
that calls `window.location.reload()`.

## What it decides for you

- **It takes no props.** The router hands it the thrown error through `useRouteError`, and the
  card is the same whatever was thrown.
- **The message stays generic.** The reader is not the person who can act on a stack trace, so
  the card says what to do, not what broke. The error itself only reaches the browser console,
  and only in development.
- **Reloading is the only recovery offered**, because a throw during render is a bug rather than
  a state the app can route around.

Without an `errorElement` on the route, a throw during render takes the whole app to a blank
white screen — React unmounts everything above the nearest error boundary, and a router with
none has nothing to stop at. That is the defect this exists to prevent, so every route gets it.

## Previewing it

`RouteError` only renders inside a **data router** (`createBrowserRouter` / `createHashRouter` /
`createMemoryRouter` with `RouterProvider`). Under a plain `<MemoryRouter>` its `useRouteError`
call throws "useRouteError must be used within a data router" and the card never appears.

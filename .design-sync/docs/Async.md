---
category: Feedback
---
The wrapper every region that reads from the API is drawn inside: it shows the wait, shows the
failure, and hands you the data once it is there. Reach for it whenever a card or a page section
is filled from `useApi` — never render a frame with nothing in it, because an empty list reads as
"no orders" rather than "not loaded yet".

## How to compose it

`state` is the object `useApi` returns, passed straight through. `children` is a **function**,
not markup: `Async` calls it with `state.data` only once that data exists, so the function can
read the record without guarding for `undefined`.

```jsx
const state = useApi(getOrdersOverview)

<Async state={state} label="Loading your orders"
	skeleton={<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>}>
	{data => <OrderList orders={data.orders} />}
</Async>
```

## The three things it draws

1. **`state.error` is set** — a `Card` holding an `EmptyState` with the `alert` icon. The sentence
   is "Nothing here." for a 404 and "That did not load." for anything else, followed by the
   error's own message. You do not write this text and you cannot change it.
2. **`state.data` is `undefined`** — the wait. With a `skeleton` it renders that; without one it
   renders a `Waiting` card carrying `label`.
3. **`state.data` is present** — `children(state.data)`, in a region marked busy while a
   background refetch is running. The last good render stays on screen through a refetch, so the
   layout never collapses under the reader.

## Choosing between `skeleton` and no skeleton

Pass a `skeleton` wherever the loaded region is more than a couple of hundred pixels tall — a
region shaped like its own eventual content keeps everything under it from jumping when the data
lands. Build it out of `SkeletonCard`, `SkeletonRows`, `SkeletonKpiRow` and `SkeletonBlock`, and
match its heights to the real card's. Leave `skeleton` out for a small, fixed-size card or a
one-off page, and the plain `Waiting` card shows instead.

## Props

- `state` — `{ data, error, loading }` from `useApi`
- `children` — `(data) => ReactNode`, called only when data is present
- `label` — what is being waited for, e.g. `"Loading your statistics"`. Defaults to `"Loading"`
- `skeleton` — the stand-in region for the wait

Nothing else is spread onto the element, and there is no `className`.

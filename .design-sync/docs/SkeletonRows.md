---
category: Feedback
---
A run of `count` waiting rows, and nothing else — no card, no header, no divider. Drop it
straight into the body the loaded rows will fill, so a list keeps its height while it loads.

```jsx
<Async state={state} label="Loading recent scans" skeleton={<SkeletonRows count={3} />}>
	{scans => <InsetPanel>{scans.map(renderScan)}</InsetPanel>}
</Async>
```

## Choosing the count

Match how many rows the loaded list normally opens with, not how many it could hold:

- **3** — a short panel inside a wider page, like Recent scans or an order's item list
- **6** — a full list page (All orders, All vendors, All categories), which pages at that size
- **4** — the default, and a sensible middle where you do not know

## Composing it

Rows need a body around them. Two shapes cover the app:

```jsx
{/* Inside a card that is already on screen */}
<CardBody variant="card-body-tight"><SkeletonRows count={3} /></CardBody>

{/* As a whole card, when the card is loading too */}
<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>
```

Use `bodyVariant="entry-list card-body-tight"` where the loaded rows are `EntryRow`s.

## Props

- `count` — how many rows. Defaults to `4`

Each row is a `SkeletonRow` and takes no configuration of its own.

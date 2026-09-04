---
category: Feedback
---
One shimmering bar, sized by the caller. It is the piece every other skeleton is built from, and
the thing to reach for directly when a waiting shape does not fit `SkeletonCard`,
`SkeletonRows` or `SkeletonKpiRow` — a page title, a stray figure, a panel of your own.

It owns the shimmer and nothing else: no margin, no layout, no size of its own. Give it a width
and a height that match whatever it stands in for.

```jsx
<SkeletonBlock width={180} height={34} style={{ margin: '4px 0 18px' }} />
```

## Sizes the app uses

- A page title: `width={180} height={34}`
- A line of body text: `width="90%" height={12}` (the last line of a block shorter, `"55%"`)
- The round mark at the head of a row: `round width={36} height={36}`
- A panel standing in for a chart: `width="100%"` and the chart's real height

`width` and `height` take either a number of pixels or a CSS string, so a percentage works and is
usually what you want for text inside a card.

## Props

- `width` — number of pixels, or a string like `"55%"`
- `height` — normally a number of pixels
- `round` — draws a circle instead of a bar
- `className` — `skeleton-line`, `skeleton-panel`, `skeleton-row-amount`, `skeleton-kpi-value`
- `style` — merged after width and height, for margins

The shimmer animates on a loop and cannot be turned off.

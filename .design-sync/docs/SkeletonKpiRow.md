---
category: Feedback
---
The four-across summary tiles a page opens with, before their figures arrive — the waiting form
of a `.kpi-row` of `KpiCard`s. Statistics, Vendors and Categories all open with it.

It draws the same grid the loaded tiles use, so the row lands in exactly the same place and at
the same height when the numbers come in. Like the real KPI row, it drops to two tiles per line
on a narrow window.

```jsx
<Async state={state} label="Loading your statistics"
	skeleton={<>
		<SkeletonBlock width={180} height={34} style={{ margin: '4px 0 18px' }} />
		<SkeletonKpiRow />
		<SkeletonCard bodyHeight={210} />
	</>}>
	{view => <Statistics view={view} />}
</Async>
```

## Composing it

It is a row, so give it the page's full width — never a card body. It normally sits directly
under the page title and above the first chart card, which is the order the loaded page draws in.

Each tile is a label bar over a taller value bar, matching a `KpiCard`'s label and figure. There
is no waiting form of the comparison line under the figure, and none is needed: the tile's height
is set by the grid.

## Props

- `count` — how many tiles. Defaults to `4`, which is what every page using it shows. Only change
  it where the loaded row genuinely has a different number of tiles.

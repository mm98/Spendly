---
category: Feedback
---
A whole card shaped like the one about to replace it: header band, divider, then a body of text
bars and a panel. Pass it to `Async`'s `skeleton` so the region keeps its height while the data
is in flight and nothing under it jumps when the answer lands.

It is built from the real `Card`, `CardHeader`, `CardDivider` and `CardBody`, so its padding,
header height and hairline are exactly a loaded card's.

```jsx
<Async state={state} label="Loading your orders"
	skeleton={<SkeletonCard lines={2} bodyHeight={330} />}>
	{data => <SpendCard data={data} />}
</Async>
```

## The two body shapes

**Lines then a panel** is the default and covers most cards: `lines` text bars (each a little
shorter than the last, so the block reads as text) followed by a `bodyHeight`-tall panel standing
in for a chart or a figure. Set `bodyHeight` to the height the loaded card actually has —
measure it rather than guessing, since that number is the whole point of the component.

**Your own children** is for a body that is not text-then-chart: pass `SkeletonRows` for a list,
or your own `SkeletonBlock`s for a form. `children` replaces `lines` and `bodyHeight` entirely
and still sits inside the same real `CardBody`, so the padding stays right.

```jsx
<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>
```

## Shapes the app uses

| Waiting for | Call |
| --- | --- |
| A chart card | `<SkeletonCard bodyHeight={250} />` |
| Home's hero | `<SkeletonCard lines={2} bodyHeight={450} />` |
| An edit form | `<SkeletonCard lines={6} />` |
| A list page | `<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={6} /></SkeletonCard>` |
| A list of entry rows | `<SkeletonCard bodyVariant="entry-list card-body-tight"><SkeletonRows count={3} /></SkeletonCard>` |
| A card with no header | `<SkeletonCard title={false} lines={2} />` |

## Props

- `title` — draws the header band and the divider under it, with a 140px shimmering bar where
  the card's title will be. Defaults to `true`; pass `false` where the loaded card has no
  header
- `bodyHeight` — pixel height of the panel after the lines
- `lines` — how many text bars. Defaults to `0`
- `bodyVariant` — class words for the `CardBody`, written in full
- `className` — class words on the `Card`
- `children` — a body of your own, replacing `lines` and `bodyHeight`

The card is hidden from screen readers; `Async` marks the region busy for it.

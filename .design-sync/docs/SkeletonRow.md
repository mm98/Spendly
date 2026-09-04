---
category: Feedback
---
One waiting row: a round mark on the left, two lines of text, a figure on the right — the shape
every list of records in the app shares, so it stands in for `EntryRow`, `OrderRow`,
`CategoryRow` and `EntityRow` alike.

**It takes no props.** Its height comes from the same row padding the loaded rows use, so a card
full of these is exactly as tall as the card that replaces it.

You will almost always want `SkeletonRows` instead, which draws a run of them. Reach for a single
`SkeletonRow` only where exactly one row is coming.

```jsx
<Card aria-label="Recent scans">
	<CardHeader title="Recent scans" />
	<CardDivider />
	<CardBody variant="card-body-tight"><SkeletonRow /></CardBody>
</Card>
```

## Where to put it

Inside the body the loaded rows will fill — normally a `CardBody` with
`variant="card-body-tight"`, or `variant="entry-list card-body-tight"` for a list of entry rows.
The row draws no card, no divider and no spacing above itself.

## Props

None. Anything passed is ignored.

---
category: Charts
---
A 40px dial reading "<done>/<total>", with the ring drawn to exactly that fraction. It is the
onboarding dial on the dark card.

## It belongs on a dark surface

The hole is painted in the dark card's own colour and the unfilled part of the ring is white at
22%. On a light card the figure inside it disappears. Put it on an `AiCard`, or on nothing.

```jsx
<AiCard headline="Finish setting up Spendly"
	body="Two steps left: add your first vendor, then scan a receipt so Spendly can read the lines for you.">
	<ProgressRing done={1} total={3} />
	<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
</AiCard>
```

## Counts, not a percentage

`done` and `total` are step counts and the ring does the division, so "0/3" draws an empty ring
and "3/3" a closed one. `total` of 0 draws an empty ring rather than dividing by zero.

Pass the real counts. A fixed fraction would read the same at every step, which is the failure
this component exists to avoid.

## Props

- `done` — steps finished
- `total` — steps in total

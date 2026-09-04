---
category: Cards
---
The summary tile used four-across at the top of Statistics: one figure, what it measures,
and how it compares.

A tile carries either `amount` (a number, formatted in the account's currency) or `value`
(an already-formatted string, because a count is not money). Pass one, not both.

The comparison line and the note are drawn only when given. A tile for the oldest stretch
of time on record has nothing to compare against, and an arrow with no sentence after it
claims a comparison that was never made, so leave `delta` off rather than inventing one.

## Props

- `label` — what the figure measures, e.g. "Spent"
- `amount` — a number, rendered as currency
- `value` — a pre-formatted string, for counts
- `delta` — the comparison sentence, e.g. "8% more than August"
- `trend` — `up` | `down` | `level`, picks the arrow. `level` draws none.
- `tone` — `good` | `bad` | `neutral`, picks the colour
- `note` — a quiet line under the figure

`trend` and `tone` are separate on purpose: spending less is a good `down`, earning less
is not. Do not derive one from the other.

## Example

```jsx
<KpiCard label="Spent" amount={12480} delta="8% more than August" trend="up" tone="bad" />
<KpiCard label="Orders" value="34" note="Across 4 vendors" />
```

---
category: Chips
---
Labels a promo or a suggestion — the small coloured word above a tip's heading. Not
interactive, and not a filter: it names what kind of thing the block under it is.

It always draws a glyph, so `icon` is required in practice: with no name, or an unknown one,
`Icon` throws. Give every tag a glyph.

## Tones

Two, and only two: `pink` (the default) and `blue` (`.chip-tag-pink`, `.chip-tag-blue`).
Anything else renders an unstyled chip and does not error. Use pink for a nudge the reader
can act on now, blue for a capability of the app.

## Props

- `icon` — an `Icon` name. Required.
- `tone` — `"pink"` (default) or `"blue"`
- `children` — the tag's words, sentence case: "Quick wins", "AI scan"

It takes no `className` and spreads nothing: those four props are the whole surface.

## Example

```jsx
<TagChip icon="bolt">Quick wins</TagChip>
<span className="promo-title">Name that vendor</span>
<p>3 orders have a shop name Spendly could not match.</p>
```

## Note

Nothing in `react/src` renders this today — the pattern it was drawn for lives in the
prototype. Treat the doc above as the contract, not as evidence of a call site.

## Related

`Chip` for a value the reader can remove; `StatusChip` for an order's status.

# Spendly - changes since handoff_2026_10_04d_changes

Copy these files over handoff_2026_10_04d_changes. Decisions are in `Brief 15 answers.md`.

## 1. Bookmark card head on a phone: chips level, one card height

On touch, the acting category chip in `sp-record__head--chips` keeps the chip's own height (`--field-trail`), the same as the "+N" label chip beside it, so the two sit level. Its touch target is a `::before` hit area `--control-h-touch` tall, centred on the chip. The head no longer grows, so a bookmark card on a phone is the same height with two categories, one or none.

- `styles/components.css`, beside the `sp-record__head--chips` rules:
  - `.sp-touch .sp-record__head--chips > .sp-record__chips > .sp-chip:not(.sp-chip--static)`: `height: var(--field-trail); min-height: 0; position: relative; overflow: visible;`
  - the same selector `::before`: the hit area. `overflow` is lifted so it is not clipped; the label inside still truncates with an ellipsis.
- `.sp-touch .sp-chip:not(.sp-chip--static)` (Brief 10, point 4) is unchanged everywhere else.
- Mobile screens, Bookmarks frame: drawn in touch mode; Linen bedding set has two categories (Textiles, +1), Outline Sofa has none. Note added.
- Logged in `styles/COMPONENT-STATUS.md`.

**What the app changes**
- Take the new components.css. Drop any workaround for the chip heights in the bookmark head.

## Files

- `Mobile screens.dc.html`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`
- `Brief 15 answers.md`

`styles/check.js` reports 84 findings, the same known set as handoff_2026_10_04d_changes.

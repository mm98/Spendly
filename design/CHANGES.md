# Spendly - changes since handoff_2026_10_04l_changes

Copy these files over handoff_2026_10_04l_changes. Decisions are in `Brief 19 answers.md`.

## 1. Card grid: a minimum-width token, one grid everywhere (Brief 19)

- `styles/tokens.css`: new `--card-min-w: 280px`.
- `styles/components.css`:
  ```css
  .sp-cards.sp-cards--fluid { grid-template-columns: repeat(auto-fill, minmax(min(var(--card-min-w), 100%), 1fr)); }
  ```
  The `min(..., 100%)` lets a single card take the full width below 280px instead of overflowing.
- No maximum card width.
- Every card grid in the app is `.sp-cards--fluid`: Order list 2c, Bookmarks 22a (both grids), the phone Bookmarks frame in Mobile screens. Responsive reference shows the token.
- One column below 572px (two cards and one gap), two from 572, as many as fit above. No query. Bookmarks 22a's "one column below 640px" is replaced by this.
- The four-across `.sp-cards` base and its two container queries are unchanged; no page in the app draws them now.

**What the app changes**
- Read `--card-min-w` in `.sp-cards--fluid` (replace the 280px literal and add `min(..., 100%)`).
- Use `.sp-cards--fluid` for the Bookmarks cards as well as Orders.

## 2. Record card, picked state: one green edge

A picked card (`.sp-record:has(input:checked)`) only turns its own 1px border `--green`. The inset 1px green shadow is removed: the photo strip painted over it, so the edge read thin beside the photos and double below them.

```css
.sp-record:has(input:checked) { border-color: var(--green); }
```

Order list 2c's note updated.

**What the app changes**
- Remove the `box-shadow` from the picked record card.

Both are logged in `styles/COMPONENT-STATUS.md`.

## Files

- `Order list.dc.html`
- `Bookmarks.dc.html`
- `Mobile screens.dc.html`
- `Responsive reference.dc.html`
- `Brief 19 answers.md`
- `styles/tokens.css`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js` reports 0 findings.

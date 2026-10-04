# Spendly - changes since handoff_2026_10_04c_changes_fixed

Copy these files over handoff_2026_10_04c_changes_fixed.

## 1. Bookmark cards: categories in the head

The categories move from their own row under the name into the card head, right of the name. Every bookmark card is one row shorter.

- New variant `sp-record__head--chips` on `.sp-record__head`, in `styles/components.css` (unlayered, beside the record rules). The `.sp-chip` and `.sp-record` rules themselves are unchanged.
- The chip column takes what it needs, at most a third of the head's width, on one line, aligned right. The name takes the rest and truncates as before.
- The first category is an `sp-chip` (a button that sets the category filter, as before) and truncates when it must. Further categories show as one static chip, `sp-chip sp-chip--static`, reading "+N" with `aria-label="Also Seating"` (the names it stands for). The bookmark page lists them all.
- A bookmark with no category has no chip column; the head is the plain `sp-record__head`.
- The order card is unchanged and keeps its chip row.
- Pages: Bookmarks (all cards, 22a notes updated), Mobile screens (the Bookmarks frame).
- Logged in `styles/COMPONENT-STATUS.md`.

**What the app changes**
- Render bookmark cards with the categories in the head as above, and remove the separate chip row.

## Files

- `Bookmarks.dc.html`
- `Mobile screens.dc.html`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js` reports 84 findings, the same known set as handoff_2026_10_04c_changes_fixed.

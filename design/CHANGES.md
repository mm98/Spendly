# Spendly - brief 10 answers (fixed)

**Fixed in this package:** the phone order card drops the reference and the status. It is two lines: vendor and amount, then date and items with the saving under the amount. This replaces handoff_2026_10_03m_changes.

Copy these files over handoff_2026_10_03l_changes_fixed_fixed.

`Brief 10 answers.md` answers the five topics, numbered as the brief.

**Stylesheet changes the app takes (components.css)**
- `.sp-touch .sp-chip:not(.sp-chip--static)` - only a chip that acts takes the touch height (4).
- `.sp-shell--touch .sp-shell__body > .sp-empty:not(.sp-empty--dashed) { padding: 0; }` - one gutter on New order (5).

**What the app changes**
- Statistics order table: Load more writes `?pages=` like the other lists. Show all and Show top 8 stay out of the address (2).
- Phone order card: two lines - vendor and amount, then date and items with the saving. No reference, status or category (3).
- Remove both app.css workarounds (4, 5).

## Files

- `Mobile screens.dc.html`
- `Order statistics.dc.html`
- `Order list.dc.html`
- `Components.dc.html`
- `styles/components.css`
- `Brief 10 answers.md`

`styles/check.js` reports 82 known findings, unchanged.

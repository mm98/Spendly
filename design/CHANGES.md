# Spendly - changes since handoff_2026_10_04k_changes

Copy these files over handoff_2026_10_04k_changes. Decisions are in `Brief 17 answers.md`.

## 1. Stats row: the narrow step (`.sp-stats--fold`)

`styles/components.css`, beside `.sp-stats`:

```css
.sp-stats--fold {
  --stats-fold: 996px;
  grid-template-columns: repeat(auto-fill, minmax(clamp(
    calc((100% - 3 * var(--sp-12)) / 4 - 0.1px),
    (var(--stats-fold) - 100%) * 999,
    calc((100% - var(--sp-12)) / 2 - 0.1px)
  ), 1fr));
}
.sp-touch .sp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
```

- Four across while the row is at least **996px** (four stats of 240 and three 12px gaps), two by two below it. The row is 998 in a 1280 shell, so Statistics folds as soon as the shell is narrower.
- It answers to the row's own width, not the window, with no wrapper or container. The row is always four or two, never three over one.
- On a phone every stats row is two by two (`.sp-touch .sp-stats`); this covers the import figures. The desktop import figures stay four across.
- Order statistics: the three stats rows carry `sp-stats--fold`; a specimen at 880 is drawn under 4a, with a note.

**What the app changes**
- Add `sp-stats--fold` to the Statistics stats rows. Remove the app's own narrow rule outside the layer.

## 2. Empty handle column: no grab cursor

`.sp-list-item__handle:empty { cursor: auto; }`, beside the handle rule. A handle with its grip keeps `grab`. Budget 21d's note says so.

**What the app changes**
- Nothing beyond the new components.css, as long as the empty handle renders with no children.

Both are logged in `styles/COMPONENT-STATUS.md`.

## Files

- `Order statistics.dc.html`
- `Budget.dc.html`
- `Brief 17 answers.md`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js` reports 0 findings.

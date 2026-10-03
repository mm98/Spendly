# Spendly - brief 11 answers (fixed again)

**Fixed in this package:** on desktop the notice that asks is now two rows, like the phone: the words take the full width and the two buttons sit on the row under them, at the right. The words no longer squeeze beside the buttons. `.sp-toast--asks` is a grid; the touch rules only change the button row to equal halves. This replaces handoff_2026_10_03n_changes_fixed.

**Fixed in this package:** on desktop the notice that asks centred its mark and buttons on the whole block, so with the list of changes the mark floated beside the bullets. `.sp-toast--asks { align-items: flex-start; }` keeps them level with the title. This replaces handoff_2026_10_03n_changes.

Copy these files over handoff_2026_10_03m_changes_fixed.

`Brief 11 answers.md` answers the two points, and the "what changed" list added to the update notice.

**Stylesheet changes the app takes (components.css)**
- `.sp-touch .sp-toast--asks` and its children - the phone layout of the notice that asks. Drop the four app.css workaround rules (1).
- `.sp-toast__changes` - the list of what changed in "A newer version is available".

**What the app changes**
- "A newer version is available" shows up to three lines from the new version's release notes, and no list when there are none.
- Order statistics: the order table text says one page (Rows per page) (2).

## Files

- `States and confirmations.dc.html`
- `Order statistics.dc.html`
- `styles/components.css`
- `styles/doc.css` (the 361px specimen width)
- `Brief 11 answers.md`

`styles/check.js` reports 84 known findings: the 82 from before, plus the two phone notices, which repeat the desktop notices' "stacked pair truncates" finding (their words wrap by design).

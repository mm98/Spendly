# Spendly - changes since the brief 5 package

Copy these files over the brief 5 package (handoff_2026_10_03d_changes). Nothing else changed.

- **Behaviour gaps closed.** Every action whose outcome no note stated now has one, in its own section: 20a, 20c, 2a, 2e, 3a, 3c, 8a, 8b, 4a, 5l, 21g, 21h, 7b, 11b, 6a, 6c, 6d, 6e. `Behaviour gaps.md` lists them all in one place.
- **Category names are unique** (6c). A name that exists is an error, compared without case. Keep both is gone; Use Decor puts the existing category in place of the new one.
- **Attachment strip** (Order create 3a): the strip carries 4px of room inside its scroll box, so tile outlines are no longer clipped. The Add files tile hovers with a green dashed edge and tint, no outline (`label.sp-mark--add:hover`).

## Files

- `styles/components.css`
- `Auth and first run.dc.html`
- `Order list.dc.html`
- `Order create.dc.html`
- `Duplicate and alerts.dc.html`
- `Order statistics.dc.html`
- `Vendors and categories.dc.html`
- `Budget.dc.html`
- `Mobile screens.dc.html`
- `Settings and import.dc.html`
- `States and confirmations.dc.html`
- `Behaviour gaps.md`

`styles/check.js` is unchanged and reports the same 84 known findings.

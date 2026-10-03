# Spendly - brief 4 answers

Copy these files over the 3 October part 2 package. Nothing else changed.

1. **Account menu (9c).** On the window, not in the sidebar. `.sp-sidebar__menu` is fixed at the account block's box; `--up` hangs the menu above it at the block's width, 4 above; `--side` opens it right of the avatar on the rail, 4 clear, bottom edges aligned. The app's rules are taken as written.
2. **New order arrow menu.** It goes. New order is a plain row everywhere. 16a and 3b no longer mention a split; 3b lists two ways into the copy dialog. Remove the arrow, its menu and `.sp-nav-split` from the app.
3. **Rail labels (9b, 9f).** The c18 chip to the right of the icon, 6 clear, centred on it, on hover and keyboard focus. On the window: `.sp-tip--float` (position fixed, translateY(-50%)); the app sets left to the icon's right + 6 and top to its centre. `data-tip` is removed from every rail item. 9f draws the label. This replaces the app's above-the-icon placement.
4. **Phone selection bar (c11, c12).** `.sp-bulkbar--head` takes the top bar's slot, edge to edge, sticky at the top while the list scrolls; `.sp-touch:has(.sp-bulkbar--head) .sp-topbar--touch { display: none }`. The top bar returns when the selection clears. c12's touch specimen carries the class.
5. **Failed card (6b).** Drawn. It keeps its full height (`.sp-hold`), keeps its label, shows the red c19 alert under it ("This month did not load" / "Check the connection and try again.") and **Try again** (outline, small) in its footer. Try again turns the card back into its skeleton; nothing else reloads.

## Files

- `styles/components.css`
- `Navigation shell.dc.html`
- `Components.dc.html`
- `States and confirmations.dc.html`
- `Order create.dc.html`
- `Actions inventory.dc.html`

`styles/check.js` reports the same 84 known findings.

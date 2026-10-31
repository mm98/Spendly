# The order panel holds still

Answers the report that the right panel on an order moves a bit when the page scrolls and then settles.

## 1. The panel stays where it is on load

**The problem** - On an order, scrolling moved the right panel (Details, Totals) up about 45px, under the top bar, before it stopped. `.sp-panel` is sticky at `top: var(--sp-16)`, measured from the window's top edge. In the app the window scrolls and the top bar is pinned at top 0 (`app.css`, `.sp-shell--viewport .sp-shell__page > .sp-topbar`), so the panel slid under the bar before sticking, and the Details card's head was hidden.

**What changed** - The panel does not move when the page scrolls: it holds the place it has on load, 16px under the top bar, level with the top of the item list. A panel taller than the window keeps that top; its foot shows when the list ends.

Add to `react/src/styles/app.css`, beside the top bar rule, using the bar height the section nav already uses:

```css
/* the panel holds the place it has on load: 16 under the pinned top bar (Order editing layouts, Edit order) */
.sp-shell--viewport .sp-panel {
	top: calc(var(--sp-12) + var(--control-h) + var(--sp-12) + 1px + var(--sp-16));
}
```

Below 900 the panel is static, as now (`components.css`, `.sp-shell__body--split > .sp-panel`); the rule changes nothing there.

**Where** - Order editing layouts, Edit order notes ("The rail holds still", replacing the note that said the content column is the scroll container). App: `react/src/styles/app.css`. It applies to every page with `sp-panel` in a split body, the order page and the order list's panel alike.

**What is still open** - Nothing.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Order editing layouts.dc.html` - the panel note.
- `support.js`, `view.js`, `components.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/order-editing.css` - what the page loads, unchanged from main.

## styles/check.js

28 finding(s) across 28 pages. All are "one tweak bar on every page": main's pages carry Theme and Scheme but not Language. Not changed in this package.

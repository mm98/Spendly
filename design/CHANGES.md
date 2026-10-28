# A name uses the row's free space before it is cut

The brief: on a phone, the AI assistants token row cut its name to "Claude on m..." while the row had empty room left of Remove. A text is never shortened while there is space for it. Only the name is concerned; nothing else in the row gives up room.

## 1. The token name takes the free space before Remove

- **The problem:** `react/src/pages/SettingsAssistants.jsx` puts `<span className="sp-grow" />` after `<Stacked>`. `Stacked` renders `sp-stacked sp-stacked--fill`, which is `flex: 1`, and the spacer is `flex: 1` too, so the two split the free space in half. The name was cut at half the room, with the other half empty before Remove. The design drew the row with a plain `sp-stacked` and the spacer, which does not split, so the design did not show the fault.
- **What changed:** the name and its date line are the filling text column with Remove after it and no spacer. "Claude on my laptop" shows in full on a phone; only a name longer than the room left of Remove ends in an ellipsis. Remove keeps its size, and the row keeps its 12px gap. No other element changes size.
- **Where:**
  - App: `react/src/pages/SettingsAssistants.jsx`, `AssistantsCard`, the token row: remove `<span className="sp-grow" />` after `</Stacked>`. `SettingsPasskeys.jsx` already has no spacer there.
  - `styles/components.css`: new `.sp-stacked--fill + .sp-grow { display: none; }`, beside `.sp-stacked--fill`. A spacer left after a filling column anywhere in the app no longer takes half the room. Copy it into `react/src/styles/components.css`.
  - Settings and import 11a and 11e (every token row, and the iPhone passkey row) and Mobile screens 7a (AI assistants page): the rows are drawn as `sp-stacked sp-stacked--fill`, as `Stacked` renders, with no spacer. 11e has a new note, "The name uses the row's free space before it is cut".
  - `styles/check.js`: new assertion, "a filling text column has no spacer after it".
- **Measured:** 316px row on a phone, "Made 21. okt. 2026 · last used today": the name column is 213px, the name shows in full, and Remove stays 92px.
- **What is still open:** nothing.

## later.md entries left as they are

- **A deleted record should not be removed for good at once:** an idea on hold until the user asks; not a design fix for this pass.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Settings and import.dc.html: the token and passkey rows, and the 11e note.
- Mobile screens.dc.html: the AI assistants page rows (7a).
- support.js, components.js, icons.js: what the pages load to open.
- styles/components.css: the `.sp-stacked--fill + .sp-grow` rule.
- styles/tokens.css, styles/doc.css: shared styles, unchanged.
- styles/pages/settings.css, styles/pages/budget.css, styles/pages/mobile-screens.css: the page styles the two pages link, unchanged.
- assets/two-step-qr.svg, assets/shop-logo.svg: images the pages draw.

## styles/check.js

0 findings across 28 pages.

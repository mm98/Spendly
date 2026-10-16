# Handoff: phone Statistics period select height

## Overview

Answer to "Brief: the phone Statistics period select is squashed when the Include switch shows". The period select ("Year · 2026" between the two arrows) is now the touch control height, 48px, with or without the "Include N left-out orders" switch under it. It follows the handoff "answers to the large-order brief" and changes nothing it settled.

## About the design files

The `.dc.html` file is a design reference built in HTML, not production code. Recreate the change in the existing React app. Open the page in a browser from this folder; it loads `support.js` and `styles/`.

## Fidelity

High fidelity. No token, size or colour changed. The select returns to the height it already had without the switch.

## The change

`flex: 1 1 0` is removed from `.sp-window--select`. It was written for a row, but the select never sits in a row: the head is a block, and with the switch it is a column (`sp-stack sp-gap-8`), where a basis of 0 collapsed the height. `width: 100%` fills the width in both cases, so the rule needs no context-specific override.

Before:

```css
.sp-window--select { display: flex; width: 100%; flex: 1 1 0; min-width: 0; overflow: visible; }
```

After:

```css
.sp-window--select { display: flex; width: 100%; min-width: 0; overflow: visible; }
```

The brief's proposal, `.sp-stack > .sp-window--select { flex: none; }`, is not used. It would keep a rule that has no job and add a second one to cancel it in one parent.

## Result

- Phone app: the select is 48px (`.sp-touch .sp-window`) in every period. The switch, when shown, sits 8px under it.
- Drawing (Mobile screens, Statistics): 42px in both states.
- `.sp-window--select` is used only in the phone Statistics period. Nothing else changes.

## Files

- `styles/components.css` - the `.sp-window--select` rule
- `Mobile screens.dc.html` - Statistics, both states (with and without the switch)
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`, `support.js`, `icons.js`, `components.js` - needed to open the page, nothing else

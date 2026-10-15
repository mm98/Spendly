# Handoff: Needs a look above Drafts on Home

## Overview

On Home, the Needs a look card now sits above the Drafts card, on desktop and on the phone. A warning about a limit or a missing delivery is seen before a draft that waits to be checked. This answers `BRIEF.md` in this folder.

Nothing else changes. No card's markup, head, cap, link, spacing or style is touched. Only the order of two existing cards changes.

## About the design files

The `.dc.html` files are design references built in HTML. They show the intended layout and behaviour; they are not production code. Recreate the change in the existing React app (`react/src/pages/Home.jsx`) using its existing components.

## Fidelity

High fidelity. The cards are the existing library components, unchanged.

## The change

### Desktop Home, left column (`DesktopHome`)

Before: Drafts, Needs a look, Recent orders.
After: **Needs a look, Drafts, Recent orders.**

Reference: `Home.dc.html`, frame 10a.

### Phone Home (`PhoneHome`)

Before: This month, Drafts, Needs a look, Recent orders.
After: **This month, Needs a look, Drafts, Recent orders.**

Reference: `Mobile screens.dc.html`, frame 10a.

## Behaviour

- Needs a look is absent when it has nothing to show, as before. Drafts then heads the left column on desktop, and sits directly under This month on the phone. No gap or placeholder is left where the card would be.
- Drafts is absent when there are no drafts, as before. Recent orders then follows Needs a look directly.
- With both absent, the column is Recent orders alone (phone: This month, Recent orders).
- The order is fixed. It does not change with the number of alerts or drafts.

## Implementation

Swap the two card elements in both `DesktopHome` and `PhoneHome`. Each card keeps its own render condition. No props, state, data fetching or styles change.

## Notes updated in the design

- Home 10a, Drafts note: "newest scan first, at most 3, under Needs a look. When Needs a look is absent, Drafts heads the column."
- Mobile screens 10a: "Drafts sits under Needs a look, the order of the desktop Home (10a), and directly under This month when Needs a look is absent".

## After the change

Render the README shots `docs/home.png` and `docs/phone.png` again; both show Home.

## Files

- `Home.dc.html`: desktop Home, frame 10a
- `Mobile screens.dc.html`: phone Home, frame 10a
- `styles/`, `support.js`, `components.js`, `icons.js`: needed only to open the two pages in a browser
- `BRIEF.md`: the original request

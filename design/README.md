# Handoff: Settings section nav divider stays static

## Overview

On Settings, the section nav (the list of panes inside the content column) and the 1px divider on its right edge scroll with the pane today. They should stay put: only the pane scrolls, and the divider always reaches the bottom of the window.

Nothing else changes. No markup, copy, pane order, spacing, colour or component is touched.

## About the design files

`Settings and import.dc.html` is a design reference built in HTML, not production code. Recreate the change in the existing React app's Settings page using its existing layout.

## Fidelity

High fidelity. The nav keeps its current values: 208px wide, `--card-pad` padding, `--sp-2` gap between items, 1px `--line-3` divider on the right.

## The change

- The section nav column is exactly the height of the window below the top bar.
- It does not scroll. Either `position: sticky; top: 0` inside the scroll area with that height, or a fixed column beside the scrolling pane.
- The divider is the nav column's own `border-right: 1px solid var(--line-3)`, so it spans that full height.
- Only the pane (the card column, 640px cap) scrolls.

## Behaviour

- **Pane shorter than the window:** the divider still runs to the bottom of the window.
- **Pane longer than the window, scrolled:** the nav and the divider stay where they are; the cards move.
- Do not draw the divider on an element that scrolls with the pane, or on one sized to the pane's content. The first scrolls away, the second ends partway down.
- Below roughly 900px the section nav is a select above the cards, as before; there is no divider there.
- The sticky save bar at the bottom of the content column is unchanged.

## Reference

- `Settings and import.dc.html`, frame 11a: the note "The section nav and its divider stay put; only the pane scrolls."
- `styles/pages/settings.css`, `.st-subnav`: `position: sticky; top: 0` beside the existing `border-right`. The mockup does not scroll, so it looks the same as before.

## Files

- `Settings and import.dc.html` - Settings, 11a
- `styles/pages/settings.css` - the `.st-subnav` rule
- `styles/`, `support.js`, `icons.js` - needed only to open the page in a browser

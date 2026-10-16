# Handoff: switch knob centred on touch

## Overview

Answer to "Brief: the switch knob is not centred on a phone". On touch screens the switch knob now has a 3px gap on every side, off and on. Desktop is unchanged. The pass also measured the other touch controls and corrected two stale comments.

## About the design files

The `.dc.html` file is a design reference built in HTML, not production code. Recreate the change in the existing React app. Open the page in a browser from this folder; it loads `support.js`, `icons.js`, `components.js` and `styles/`.

## Fidelity

High fidelity. No token, size or colour changed. Only the knob's offset on touch moves.

## The change

`styles/components.css`, touch block. The track is 26px high and the knob 20px, so the gap is 3px each side. There is no 3px spacing token, so the value is written as a plain `3px` with a comment that derives it from the two sizes.

Before:

```css
.sp-touch .sp-switch::after { width: 20px; height: 20px; top: var(--sp-2); left: var(--sp-2); }
```

After:

```css
/* the 26px track less the 20px knob leaves 3px each side; no token is 3px */
.sp-touch .sp-switch::after { width: 20px; height: 20px; top: 3px; left: 3px; }
```

`.sp-touch .sp-switch:checked::after { transform: translateX(18px); }` is unchanged: 3 + 18 + 20 leaves 3px on the right of the 44px track.

## Result

Measured with the phone screens forced to touch size:

- Off: top 3px, bottom 3px, left 3px.
- On: top 3px, bottom 3px, right 3px.
- Desktop (34 x 20 track, 16px knob): 2px all round, as before.

It reaches every switch on a touch screen: Statistics (Include left-out orders, Compare), Order form (Leave out of statistics), Orders filters (Has attachments, Discounted only) and Set status (Also set delivery date to today), Settings, import settings, Budget, and Dark mode in the side menu.

## Other touch controls checked

Measured at touch size, nothing else changed:

- Range slider: handles 18px on the 4px rail, centred on the rail's centre line; the green span ends at each handle's centre; the 48px hit area is centred on the handle. Desktop handles (14px) are centred the same way.
- Checkbox, radio, buttons, icon buttons, chips, stepper, segmented control, combobox trigger, period presets, inputs: children centred.
- Token field (`.sp-tokens`): tags sit 8.7px from the top and 9.3px from the bottom, a sub-pixel rounding of the `padding-block` calc. Left as it is.

## Comments corrected

Two comments in `styles/components.css` said 44px for a hit area that is `--control-h-touch`, 48px. The values were already right; only the comments were stale:

- `.sp-touch .sp-track__handle::after`: now "carries a --control-h-touch (48px) target".
- The small-control press area (`.sp-icon-btn--small`, `.sp-icon-btn--field`, `.sp-crumb__remove`, `.sp-list-item__handle`, `.sp-slot__remove`, `.sp-toast__undo`): now "inside a --control-h-touch (48px) press area".

## Open question

Components, Selecting rows, says "The checkbox and its 44px hit padding stop propagation". No rule in `styles/components.css` gives a checkbox a hit area. Either the app builds it outside the stylesheet, or the note is out of date. Not changed here.

## Files

- `styles/components.css` - the `.sp-touch .sp-switch::after` rule and the two comments
- `Mobile screens.dc.html` - the phone screens that carry switches; drawn at desktop control heights, so the touch knob is not visible in the drawing
- `styles/`, `support.js`, `icons.js`, `components.js` - needed to open the page

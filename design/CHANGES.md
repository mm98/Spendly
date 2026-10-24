# Search field ends: the shortcut key hint and Ask with no questions left

Two faults at the end of a search field, both seen on a phone-sized field and both in `styles/components.css`.

## 1. The shortcut key hint sits high in a touch field

**The problem.** The top bar's search field shows the `⌘K` hint at its end. The hint was pinned to the desktop field height (36px, `--control-h`), so in the 48px touch field (`--control-h-touch`) it sat in the top 36px instead of the middle.

**What changed.** The hint is centred on the field's real height, whatever that height is. No value changes.

**Where.**
- `styles/components.css`, `.sp-field__kbd`: `top: 0; height: var(--control-h)` is now `top: 50%; transform: translateY(-50%)`.
- Every page with the top bar's search field (Home, Ask Spendly, Vendors and categories, Components, the Navigation shell). The markup is unchanged.
- App: `react/src/styles/components.css`, the same selector. `SearchInput` in `react/src/components/Inputs.jsx` needs no change.

**What is still open.** Nothing.

## 2. The Ask button with no questions left sits below the search field

Settles the later.md entry "The Ask button with no questions left sits below the search field". Please remove it from `later.md`.

**The problem.** With no questions left today, `AskTrail spent` wraps the disabled button in a span carrying its tooltip (a disabled button takes no pointer events). The rule that places the field's end controls, `.sp-field__trails > .sp-field__trail`, only reaches a button directly in the group, so the wrapped button kept the lone trail's corner placement and dropped below the field.

**What changed.** The tooltip span is a row item of the field's end, and the button inside it sits as the other end buttons do. It looks the same as before: disabled, at `--fade-disabled`, at the field's end, with the tooltip "No questions left today. Resets at midnight." on hover and focus.

**Where.**
- `Order list 2b`, the specimen "No questions left today": now drawn with the span, as `AskTrail` renders it, and the note "When no questions are left today" names the span.
- `styles/components.css`, added beside `.sp-field__trails > .sp-field__trail`:
  ```css
  .sp-field__trails > span[data-tip] { position: relative; display: flex; }
  .sp-field__trails > span[data-tip] > .sp-field__trail { position: relative; top: auto; right: auto; transform: none; }
  ```
- App: `react/src/styles/components.css`, the same two rules after `.sp-field__trails > .sp-field__trail`. `AskTrail` in `react/src/components/Inputs.jsx` needs no change.

**What is still open.** Nothing.

## Stylesheet version

Every page now links `styles/components.css?v=v20261024b`, so a browser holding the earlier copy loads the new one.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order list.dc.html` - Order list 2b, the redrawn specimen and its note.
- `support.js`, `components.js` - load the page.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/order-list.css` - the page's other stylesheets, unchanged.
- `styles/components.css` - both fixes.
- `styles/check.js` - two new assertions: "a shortcut hint is centred in its field" and "a wrapped trail sits in its row".

## Check

`styles/check.js`: 0 finding(s) across 27 pages

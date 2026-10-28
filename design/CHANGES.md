# Bookmark category tag uses free space before it is shortened

The brief: on a bookmark card, the category tag in the head is held to a third of the width even when the name is short, so "Løbesko, str. 42" sits beside "Clot..." instead of "Clothing". A text is never shortened while there is space for it.

## 1. The category tag takes the space the name leaves free

- **The problem:** `.sp-record__head--chips > .sp-record__chips` had `max-width: 33.333%`, so the chips never passed a third of the head, whatever the name left free. A short name with a long category truncated the category beside empty space.
- **What changed:** the chips take the space the name leaves free and show in full when it is there ("Clothing", "Hobby"). Only when the name and the chips together do not fit are the chips limited, and then to a third, with the name keeping the other two thirds, as before. A long name beside a short category ("Textiles") still gives the name everything the category does not need. The "+N" chip and the touch height are unchanged.
- **How the rule does it:** both the name and the chips start at their own width (`flex-basis: auto` on the name, `max-content` on the chips). When they overflow, the chips give way first (shrink factor 100000), and stop at the smaller of their own width and a third of the head: `width: 33.333%` with `min-width: auto` makes the automatic minimum `min(own width, 33.333%)`. The name then gives way and truncates. Measured on a 332px head: short name and "Clothing and shoes" gives the chips 158px, untruncated; long name and long category gives the chips 111px (a third), the category truncated; long name and "Textiles" gives the chips 57px.
- **Where:**
  - `styles/components.css`: `.sp-record__head--chips > .sp-record__chips` is now `flex: 0 100000 max-content; width: 33.333%; min-width: auto;` (was `flex: 0 1 auto; max-width: 33.333%; min-width: 0;`), and a new `.sp-record__head--chips > .sp-stacked { flex: 1 1 auto; }` gives the name its own width as its basis in this head only. Other `sp-grow` and `sp-stacked` uses are not touched. The chip rules inside (`> .sp-chip`, `> .sp-chip--static`, the touch rules) are unchanged.
  - Bookmarks 22a, the note on categories, and Components, the Bookmark card head note, now state the rule.
  - `styles/COMPONENT-STATUS.md` logs the change (2026-10-28).
  - App: `react/src/pages/Bookmarks.jsx`, every `Record` with `headChips` (the cards, desktop and phone, and the loading placeholder card) picks the rule up from the stylesheet; no markup change. Copy the two rules into the app's stylesheet if it holds its own copy. The order card does not use this head and is not changed. Storybook: the `Record` story with `headChips` shows the new behaviour without changes.
- **What is still open:** nothing.

## later.md entries left as they are

- **A deleted record should not be removed for good at once:** an idea on hold until the user asks; not a design fix for this pass.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Bookmarks.dc.html: 22a with the updated categories note.
- Components.dc.html: the Bookmark card head note.
- support.js, components.js: what the pages load to open.
- styles/tokens.css, styles/doc.css: shared styles, unchanged.
- styles/components.css: the new `.sp-record__head--chips` rules.
- assets/shop-logo.svg: the logo mark drawn in Components.

## styles/check.js

0 findings across 28 pages.

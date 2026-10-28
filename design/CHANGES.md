# On a bookmark card, the name comes before the category tag

The brief: a name always comes before a tag. With the last change (`handoff_bookmark_tag_width`) a short name shows its category in full, but a long name is still cut beside a category that keeps a third of the head: on a phone "A bookmark name so long t..." (208px) beside "Favourite with l..." (109px).

## 1. The category gives way to the name, down to three letters

- **The problem:** `.sp-record__head--chips > .sp-record__chips` had `width: 33.333%` as the floor of its automatic minimum, so while the chips were wider than a third, the name was cut first.
- **What changed:** when the name and the category do not fit together, the category gives way first, down to its smallest chip, and the name takes the rest. The name is cut only when the category is already at that size. A short name still shows the category in full, and a category narrower than the smallest chip ("Tøj") is never widened or cut. The "+N" chip and the touch height are unchanged.
- **The smallest chip (chosen here):** three letters and the ellipsis, "Fav..." from "Favourite". That is `4ch` at the chip's type size (`--t-11`) plus the chip's padding and border: `calc(4ch + 2 * var(--sp-8) + 2px)`, 46px in the drawn font. With a "+N" beside it the floor adds the gap and a "+N" chip: `calc(6ch + 4 * var(--sp-8) + 4px + var(--sp-6))`. No new spacing value; the floor is made of the chip's own padding, border and gap.
- **Measured on a 332px head:** short name and "Clothing and shoes": chips 124px, untruncated. Long name and "Favourite with long name": chips 46px, the category cut to three letters, the name takes 276px. Long name and "Hobby": "Hob..." at the floor. "Short" and "Tøj": "Tøj" in full. "Palissade Lounge Chair" with "Decor" and "+1": both in full.
- **Where:**
  - `styles/components.css`: `.sp-record__head--chips > .sp-record__chips` is now `flex: 0 100000 max-content; width: calc(4ch + 2 * var(--sp-8) + 2px); min-width: auto; font-size: var(--t-11);` (`font-size` sets the `ch`; the chips already set their own type size, so nothing renders differently). New: `.sp-record__head--chips > .sp-record__chips:has(> .sp-chip--static) { width: calc(6ch + 4 * var(--sp-8) + 4px + var(--sp-6)); }`. `.sp-record__head--chips > .sp-stacked { flex: 1 1 auto; }` and the chip rules inside are unchanged.
  - Bookmarks 22a, the note on categories, and Components, the Bookmark card head note, state the rule.
  - `styles/COMPONENT-STATUS.md` logs the change (2026-10-28).
  - App: `react/src/pages/Bookmarks.jsx`, every `Record` with `headChips` (the cards on desktop and phone, and the loading placeholder card) takes the rule from the stylesheet; no markup change. Copy the rules into the app's stylesheet if it holds its own copy. The order card does not use this head. Storybook: the `Record` story with `headChips` (`storybook/stories/List.stories.jsx`) needs no change; a story with a long name and a long category would show the floor.
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
- styles/components.css: the `.sp-record__head--chips` chips floor.
- assets/shop-logo.svg: the logo mark drawn in Components.

## styles/check.js

0 findings across 28 pages.

# Segmented: the marker's slide, a small size, and the reorder notes

## Fixed from design_handoff_segmented_small

- Section 4 left the dark mode copy of Spend by month at the default size, waiting for a decision. It is now small too, as every other card head switch: `Dark mode and image viewer.dc.html`, the Spend by month card, Bar shape. The page and its `styles/pages/dark-mode.css` join the package.

## 1. The segmented control's green did not slide

- **The problem:** picking an option in the segmented control moved the green at once, while the sidebar's current row slides to the row picked. The marker was in place and animated, but every option clips its own content (`overflow: hidden`, kept so a long label ends in an ellipsis), so the marker was cut away while it travelled in from the option it left.
- **What changed:** the option holding the marker no longer clips; its label clips its own text instead, as the touch variant already did. At rest nothing looks different.
- **Where:** Components c5. `styles/components.css`, motion section: `.sp-segmented__item:has(> .sp-marker)` and `.sp-segmented__item:has(> .sp-marker) > .sp-label`. In the app, `react/src/components/Segmented.jsx` already moves the marker with `layoutId`; the CSS rule is what lets it be seen.
- **What is still open:** nothing.

## 2. The two segmented specimens in c5 were one radio group

- **The problem:** the desktop and the touch specimens both used `name="c5-seg"`, so picking in one cleared the other.
- **What changed:** the touch specimen is `c5-seg-touch`. Design page only.
- **Where:** Components c5.
- **What is still open:** nothing.

## 3. Segmented takes `size="small"`

- **The problem:** a segmented control in a card head stood at the field height, 42px, taller than the small buttons beside it.
- **What changed:** a small size, beside the default:
  - height `--btn-h-small` (34px), the small button's;
  - inset and gap `--sp-4`, so an option is 24px tall;
  - option padding `0 --sp-8`, label `--t-12`;
  - on touch it keeps 34px, as the small button does, and each option reaches a 48px press area.
- **Where:** Components c5 (desktop and touch specimens), React components r4 (Segmented). `styles/components.css`: `.sp-segmented--small`, `.sp-segmented--small > .sp-segmented__item`, `.sp-touch .sp-segmented--small` and its `::before`. `react_handoff/Segmented.jsx`: a `SIZE` map, the `size` prop (`default` | `small`) and its JSDoc line; app file `react/src/components/Segmented.jsx`.
- **What is still open:** nothing.

## 4. A segmented control in a card head is small

- **The problem:** the same card head drew its switch at the field height.
- **What changed:** the switch in a card head is `size="small"`.
- **Where:** Order statistics 4a (Spend by month) and 4g (Spend by day), Dark mode and image viewer (Spend by month), Components c10 (Spend by month), React components r5 (`CardHeader` with `Segmented`). App: the Statistics page's bar shape switch, `react/src/pages/Statistics.jsx` or wherever it renders `Segmented` in a `CardHeader`.
- **What is still open:** nothing. The dark mode copy of Spend by month (`Dark mode and image viewer.dc.html`) is small as well.

## 5. later.md: "On touch, a combobox drawn already open closes on its first tap"

- **The problem:** `ComboboxSheet` linked the sheet to its field in a layout effect, which runs before the field's own ref is set; a list open on its first draw never made the link, so every press in the sheet counted as a press outside it.
- **What changed:** the link is made in `useEffect`, after the commit, when the field's element exists. A page can draw a list already open.
- **Where:** `react_handoff/Combobox.jsx`, `ComboboxSheet`; app file `react/src/components/Combobox.jsx`. This settles the later.md entry; please remove it. The bank check's row list may now draw its list open directly.
- **What is still open:** nothing.

## 6. The reorder notes disagreed with the stylesheet

- **The problem:** in "Ordering by hand", one note said the carried row is white and another listed the picked-up row as `#e7efe8`; the slide was given as 150ms, not the motion tokens; one sentence was written twice.
- **What changed:** both colours are correct and now say when: a row carried by the pointer is white on `--surface`; a row picked up from the keyboard wears `--green-tint` until it is dropped (this is what `.sp-list-item--carried` and `.sp-list-item--picked` already draw). Rows shift at `--motion-in` (180ms) on `--ease-enter`, as Motion's `glide()` does. The repeated sentence is gone.
- **Where:** Components c1, "Ordering by hand" notes. No CSS or code change.
- **What is still open:** nothing.

## Stylesheet link

Every page's link moved from `styles/components.css?v=v20261024u` to `?v=v20261025a`, so a browser loads the new rules. Only the pages above changed otherwise and are in this package.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - c1 notes, c5 specimens, c10 card head.
- `React components.dc.html` - r4 small example, r5 card head.
- `Order statistics.dc.html` - 4a and 4g card heads.
- `Dark mode and image viewer.dc.html` - the Spend by month card head.
- `support.js`, `components.js`, `icons.js` - what the pages load to open; `components.js` draws the marker on the design pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets; `components.css` holds sections 1 and 3.
- `styles/pages/order-statistics.css` - linked by Order statistics.
- `styles/pages/dark-mode.css` - linked by Dark mode and image viewer.
- `react_handoff/` - the whole folder, which React components loads; `Segmented.jsx` and `Combobox.jsx` changed.

## styles/check.js

0 finding(s) across 27 pages.

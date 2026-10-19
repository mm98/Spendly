# The arrow in a search-and-pick field sits too high on a phone

Answers Brief-field-chevron-touch.md, and three alignment and ink faults found while reviewing Auth and first run 20a. later.md was read (main, 2026-10-19); its two entries are in the app and the API, not the drawings, so neither is settled here.

## 1. The chevron in a search-and-pick field

**The problem.** On a phone the down arrow at the right end of a search-and-pick field sat 3px above the field's middle. It was centred in a box always `--control-h` (42px) tall from the field's top, and the touch field is 48px.

**What changed.** The arrow is centred on the field's real height, the same way as the clear button and the unit: `top: 50%; transform: translateY(-50%)`, and the fixed height is gone. Nothing changes on a computer. `.sp-field__kbd` keeps its rule, since it only shows on a computer.

**Where.** `styles/components.css`, `.sp-field__chevron`. It reaches Order create (Vendor), Bookmarks (category picker with search), Budget 21g (row picker), Vendors and categories (move to), Settings and import (category picker with search), Components c5, and every `Field` / `Input` / `Combobox` built with the chevron in `react_handoff/Field.jsx`, `Inputs.jsx` and `Combobox.jsx`. No JSX changes.

**What is still open.** Nothing.

## 2. The icon in a top-aligned message row sat high

**The problem.** In Auth and first run 20a, Wrong email or password and Locked out, the 16px icon sat 1 to 2px above the middle of the first line of text. The rows used the `sp-top` utility, which only sets `align-items: flex-start`, so the icon's top met the line's top while the line box is 18px (13px text) or 19.3px (14px title). The two rows in Typography 13a used `.sp-list-item--top`, which had no rule for an icon either.

**What changed.** An icon in a top-aligned row centres on the first line of the text beside it: `margin-top: calc((1lh - 16px) / 2)`. The icon takes the size of that first line, 14px when the text opens with a `.sp-title` and 12px when it is a `.sp-subtitle`, so `1lh` is that line. Measured on all four rows, the icon's middle and the line's middle agree to 0.01px. The two Auth rows now use the row's own variant, `.sp-list-item--top`, not `sp-top`.

**Where.** `styles/components.css`, `.sp-list-item--top > svg` and the two `:has()` rules after it. Auth and first run 20a (both rows). Typography 13a (two note rows). In the app: any `ListItem` that is top-aligned and carries an icon, in `react_handoff/ListItem.jsx`.

**What is still open.** Nothing.

## 3. The icon in a danger row was near black

**The problem.** In Auth and first run 20a, Wrong email or password, the icon was `--ink-2` while the message beside it was the danger red. `.sp-list-item[data-color="danger"]` sets a red ground and border but no ink, so the icon kept the row's default.

**What changed.** The icon in a danger row takes `--red-ink`, the same ink as `sp-ink-danger`. The row's own ink is unchanged, so other content in danger rows keeps its colour. The warning row already sets `--amber-ink-2`, which its icon takes; its title is `--amber-ink`. That pair was reviewed and is left as it is.

**Where.** `styles/components.css`, `.sp-list-item[data-color="danger"] > svg`. Auth and first run 20a.

**What is still open.** Nothing.

## 4. The checkbox in a top-aligned row sat a fraction low

**The problem.** `.sp-list-item--top > .sp-check` and `> .sp-radio` were offset by `(14px * 1.5 - 16px) / 2`, which assumed a 21px title line. Poppins' normal line at 14px is 19.3px, so the box sat 0.17px below the title's middle.

**What changed.** The box takes the title's font (Poppins, 14px, normal leading) and is offset by `(1lh - 16px) / 2`, so it follows the title's real line. The font is stated on the box because an input does not inherit the page font. Measured on Budget 21g and Order create 3d: 0.00px.

**Where.** `styles/components.css`, `.sp-list-item--top > .sp-check, .sp-list-item--top > .sp-radio`. Budget 21g, Order create 3d, Mobile screens. In the app: `react_handoff/ListItem.jsx` with a checkbox, top-aligned.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Auth and first run.dc.html` - the two message rows now use `.sp-list-item--top` (sections 2 and 3).
- `support.js`, `components.js`, `icons.js` - what the page loads to open.
- `styles/tokens.css`, `styles/doc.css` - loaded by the page, unchanged.
- `styles/components.css` - the four rules above.
- `styles/pages/auth-and-first-run.css` - loaded by the page, unchanged.
- `styles/check.js` - new assertions: the chevron and unit are centred on the field; a top-aligned list row uses `.sp-list-item--top`; an icon in it has the first-line offset; a danger row's icon is `--red-ink`.

## styles/check.js

0 finding(s) across 26 pages

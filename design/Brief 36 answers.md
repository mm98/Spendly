# Brief 36 answers - the Showing bar, page rules on a part, rows that open something, the head's button on a phone

## 1. The Showing bar

The Showing bar is now a card with a head, as every other card is. It has no class of its own; `sp-crumbs-bar` is removed.

- The head is the name, then Reset and Open in orders at its right end. Both buttons are the small outline button, since that is the only button a head takes (Reset was a text button).
- The path sits below the head, in the card body, and wraps there freely. The head is one line at every width and on a phone, so the name stays in the head and nothing runs past the edge.
- On a phone it is the same bar, not the bare path. Mobile screens 7a now draws the Statistics screen with the Showing card at the top of the scroll area, in place of the path on its own. The head fits a phone's width: the name, Reset and Open in orders.

Order statistics 4b and 4c, Mobile screens 7a and the Components c8 specimen all draw it this way. checks.html's "a card name sits in the head" now sees a head on the bar.

## 2. Page rules set on a part

- Settings and import 11a: two variants beside their components, `sp-combobox--narrow` and `sp-segmented--narrow`, at most `--field-w` (280, a new token for the existing value). In a narrower column they take the column's width. `st-w280` is removed.
- Order create 3a: no variant. 720 wide and centred is the page's reading column, not the look of the file drop, the card or the divider. The design now draws that column as a page box of its own (`oc-narrow`) holding the parts, so no part carries the page rule and the app's structure is the design's: on step 1 the box holds the file drop, the "or" divider and the two choices; on step 2 it holds the reading card.
- Home 10a: `sp-card--spread`, a card variant that spreads its groups over the card's height (`justify-content: space-between`). The month panel uses it, and the page rule `.hm-split > .sp-card--shell` is removed.

## 3. A row that opens something

`sp-row-opens` is a state of the plain row, set on an `<a>` or a `<button>`. It has no underline and keeps the card's ink. Hover is `--hover`, focus is the ring, and both are drawn at `--r-tile`. The fill reaches 6px above and below the row and 8px at the sides through a negative margin, so the row's content stays where it was drawn, and two rows 12px apart meet without overlapping. On touch the row is at least `--row-h-touch` tall.

Drawn on: Statistics 4a By status and Top vendors, and the Top vendors cards further down the same page (the "Other N vendors" row does not open anything); Home 10a Categories this month; Mobile screens 7a Drafts and Recent orders. The app can drop its own row look from its page stylesheets.

## 4. The head's button on a phone

It keeps its 34px box and takes the 48px tap area as an invisible area above and below it, as the bookmark chip does. That covers card heads and list toolbars, under `.sp-touch` and below 640px alike, so on the iPhone profile the button sits in the 54px head where it sits on desktop: 9.5px above and below it. Everywhere else the small button is still 48px on touch.

## Checks

- styles/check.js asserts: no `sp-crumbs-bar`, and every Showing name opens a head row; the touch rule and its invisible area; the spread, narrow and row-opens rules exist; no page stylesheet spreads a card; `st-w280` and `oc-narrow` never sit on a part; every row under By status, Top vendors, Categories this month, Drafts and Recent orders is a row that opens, apart from Other. 0 findings across 26 pages.
- checks.html: a head button that is not 34px tall is now a finding.

## Open

Other pages also put a page class straight on a part, e.g. Settings `st-w260`, `st-w560`, `st-w120` and `st-theme`, Order create `oc-amount-field` and `oc-col--narrow`, Order statistics `os-col`. Some page stylesheets also select parts (`.hm-split > *` sets the gap of the cards in it, and `settings.css` styles `.st-trio > .sp-well`). This brief did not list them, so they are unchanged. Say if the app builds any of them and they should get the same treatment.

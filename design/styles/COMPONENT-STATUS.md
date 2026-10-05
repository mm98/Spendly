# Component status

## The limits

This library is the whole vocabulary. A screen that needs something outside it is a signal to reconsider the screen - not to add a value.

- **Image sizes - five.** 64 in a form, 42 on a panel header, 36 in a list row, 24 in a chip or field, and 104 for an attachment tile. Nothing between them, and nothing outside them.
- **Spacing - six.** 6, 8, 10, 12, 14, 16, and nothing else. Two smaller insets exist for what the scale cannot express - `--sp-2` for a badge in a corner or a switch thumb, `--sp-4` for a tile's corner control. Component-specific numbers that already exist in the implementation (a 14px row padding, a 34×38 stepper button) live inside that component and are named in its notes; they are not new spacing steps.
- **Radius - five.** 4 marker, 8 tile, 9 field, 12 card, 999 pill, plus 10 where the implementation already uses it (SortControl, a line row, the photo menu).
- **Type - seven sizes.** 10 eyebrow, 11 meta, 12 small, 13 body, 14 base, 15 large, 20/24/26/34 for headings and figures.
- **Tones - four.** Positive green, in-progress amber, problem red, neutral. There is no fifth tone and no second green for the same meaning.
- **Controls - the twenty named in Input types 14d.** A control that is not on that list does not exist yet; adding one is a decision to take with the design, not in passing.

Adding to any of these lists is a change to the system: put it in the list, say why, and log it below.


A component is **locked** when its appearance has been reviewed and accepted. After that:

- Its rules in `styles/components.css` are closed. Do not edit them, and do not add a rule anywhere that outranks them.
- A new need becomes a **variant class beside it** (`.sp-btn--commits`, `.sp-icon-btn--outline`), never a change to the base.
- Generalising - folding duplicate rules, reusing tokens, merging two implementations into one - happens as its own pass, and must leave every locked component rendering exactly as it did. If it cannot, stop and ask.
- Base and page rules live in `@layer base`, so they can never reach into a component. Component rules stay unlayered.

**Draft** means still being designed: it can change freely until it is accepted.

| Component | Section | Status |
| --- | --- | --- |
| List - table, rows, states, touch cards | c1 | Locked |
| IdentityMark - initials, icon, photo, four sizes | c2 | Locked |
| Field - TextField, PasswordField, AmountField, DateField | c3 | Locked |
| Stepper, RangeSlider, FileDrop, create FAB | c4 | Locked |
| Checkbox, Radio, Toggle, Segmented, Combobox, SearchInput | c5 | Locked |
| Button, Chip, status pill | c6 | Locked |
| Picker - tiles and swatches | c7 | Locked |
| SortControl, list footer, DrillCrumb | c8 | Locked |
| Menu, and its one submenu level | c9 | Locked |
| Card, and the gauge | c10 | Locked |
| Shell - sidebar, collapsed rail, top bar, tab bar | c11 | Locked |
| Facets, filter row, bulk bar | c12 | Locked |
| Empty, loading, sheet, dialog | c13 | Locked |
| Stat, chart, legend | c14 | Draft |
| Plot frame - axis, gridlines, a limit | c14 | Draft |
| Stacked bar, paired bars, sparkline | c14 | Draft |
| Donut | c14 | Draft |
| Tooltip as a panel | c18 | Draft |
| Period control - presets and the window stepper | c14 | Draft |
| Calendar - one grid, three shapes: DateField popover, two-month range, sheet | c14 | Draft |
| Line item row - rest state, handle, actions | c15 | Locked |
| Line editor - the form a row expands into, and the sheet fills | c15 | Locked |
| Totals - named rows and one sum | c15 | Locked |
| Attachments and the viewer | c16 | Draft |
| File slot - thumb and document, the one way a file is added | c17 | Locked |
| Toast and tooltip | c18 | Draft |
| Choice row - padded, filled when chosen | c5 | Draft |
| Popover panel - decide, then Apply | c25 | Draft |
| Spinner - work of unknown length on one line | c13 | Draft |
| Divider with a word | c27 | Draft |
| Source view - the file, with the regions read from it | c16 | Draft |
| Card on the shell ground - one dark panel per page | c10 | Draft |

## Log

- 2026-09-16 - **Every text button moved to Secondary.** `.sp-btn--text` reads as
  floating text beside bordered controls, and its left edge does not line up with them.
  Giving it a ground made the class name wrong; giving it a border made it Secondary
  under a second name. So the 63 uses are Secondary now - plain, attention and
  destructive each to their Secondary tone - and the variant stays defined and drawn in
  c4 for the places that want it back.

- 2026-09-16 - Checking moved from scripts to a page, and selection became one ground.

  **`checks.html` replaces the per-session scan.** It loads every page in a frame and
  asserts against the rendered result, so parent, child and sibling are exact rather
  than guessed from a text window - which is where most of the old false positives came
  from. 17 rules, and every finding that has something to look at carries a **show**
  link that opens the page, scrolls to the element and outlines it, so a claim can be
  judged rather than taken on trust. Five rules were wrong when first written and were
  corrected by being tested against the real pages: a screen body sits flush to its
  frame and insets its content (measuring the body's own edge reported the frame's 1px
  border 35 times); where a saving sits is a rule about rows, not any box; an overlap
  only counts for an element actually on screen and topmost at its own centre; a card's
  16 is an inset, and a bar carrying text is legitimately shorter; the inline-style rule
  was counting the documented per-instance hooks and an attribute `components.js` sets
  at runtime.

  **Selection is `--green-tint`, once.** It had been three grounds: the tint on five
  components, `--green-tint-2` on a choice row - which is the *hover* tint of a selected
  row elsewhere - and `--hover` on a palette row, where a selected row and a hovered one
  were indistinguishable. A card also moves its border to `--green`, since it has one to
  change; a row inside a bordered list has only the ground. An attention row keeps its
  amber, because over a limit is a state rather than a selection. Asserted now.

  **A specimen wrapper's gap follows what it holds.** The documentation frame separates
  drawings at 16, and a drawing is a labelled specimen - but 47 wrappers held bare
  components instead, a card or a list with no label between them, where nothing says
  they are separate examples. Those read as cards side by side at the wrong gap, which
  is what kept surfacing as "this card gap is 16". The wrapper now decides for itself:
  `.doc-specimens:not(:has(> * > .doc-specimen__label)):not(:has(> .doc-specimen))`
  takes `--sp-12`. Asserted as rule 19, so a new specimen cannot reintroduce it.

  **Every full screen is now in a screen frame.** Order create, Order editing and Order
  list each had their own - 1240, 1240, 1280 - and the list's was laid out directly on
  the documentation page, so the page frame's 16 governed its rail gap instead of the
  card gap. All are `doc-screen doc-frame` at 1400. Asserted as rule 18, with a screen
  defined as something carrying a bar and the content under it, so a lone sidebar or bar
  stays a component specimen.

  **Order editing's two screens** were Order create's fault repeated: a hand-rolled
  2fr/1fr grid in a 1240 frame. Both are `doc-screen` at 1400 with
  `sp-shell__body--split` and a fixed 360 `sp-panel`; `.oe-screen`, `.oe-body` and
  `.oe-sticky` are gone.

- 2026-09-16 - Thirty-one duplicate names collapsed, and two writing rules made system-wide.

  **A second name for a role is the same defect as a second implementation.** Comparing every class's whole rule profile - every state, variant and descendant, not one rule at a time - found 29 exact twins, 24 more than a single-rule sweep had. Thirteen were component-scoped aliases of a name that already existed (`sp-line__meta`, `sp-totals__note` and `sp-stat__meta` for `sp-subtitle`; `sp-caption` and `sp-tip__note` for `sp-meta`; `sp-stat__label` for `sp-section-label`; `sp-dialog__title` for `sp-heading`; and eight ink aliases). Ten more were pairs with no canonical name, where the name describing the job won: `sp-list__toolbar` over `sp-card__header`, `sp-void` over `sp-struck`, `sp-cell-amount` over `sp-line__total`. One role had never been named at all - 12px `--ink-5` explanatory text, which three components each called something different - and is now `sp-note`. Two classes had zero uses and went.

  269 class occurrences rewritten, 30 rule blocks deleted. `sp-picker` and `sp-shares` looked like twins and are not: they own child elements, so collapsing them would have orphaned 80 child classes. `sp-field`, `sp-stat`, `sp-nav-list` and `sp-popover__head` share a declaration by coincidence and were left alone.

  **`sp-line__body` is gone**, the same fault found from the other end: it was `sp-stack sp-gap-6 sp-truncate` with a name, 42 uses against the general pattern's 125.

  **On touch, a button fills its column but not a bar.** `.sp-touch .sp-btn` forced `width: 100%` on every button, so two commits and their label could not share 375px - the label collapsed to 0 and painted over the Discard button. Buttons inside a save bar, a commit row, a toolbar or a top bar now keep their own width, and `--block` still overrides that where the commits should fill the row. A bar inside a phone also drops its vertical padding, since 16 + a 48px control + 16 is 80 and every bar a phone pins is 68.

  **A commit row right-aligns by default.** `.sp-dialog__actions` had relied on a `sp-grow` spacer in the markup, which seven rows across four pages did not have; the component sets `justify-content: flex-end` now and a spacer is only needed to separate something placed before the buttons.

  **Two writing rules are now in CLAUDE.md**: a saving is always `Saved N kr.` in green and never a percentage, and no em dashes or curly punctuation anywhere - 2,107 dashes and 89 curly marks removed across 40 files, including the entity forms a character sweep cannot see.

- 2026-09-15 - **Collapsing the sidebar is an experiment, and it lives in 9i.**

  Neither the grip nor the peek is in the shell. 9a is the committed frame and its sidebar carries no control; the rail in 9b remains what a narrow viewport produces. The whole question - whether the sidebar should be collapsible by choice on a wide screen - is drawn once in 9i, the only place the grip appears. `.sp-sidebar__grip` is a 3×26 bar in a 14×44 target on the sidebar's right edge, vertically centred, toggling `--sidebar-w` and `--sidebar-w-rail`, with the behaviour in `components.js` beside the combobox and menu; both it and the peek are opt-in via `data-collapsible` on the sidebar, which only 9i carries - without it a sidebar gains no behaviour at all, so the rails in 9b and 9h stay inert on hover as well as on click. The slide belongs to the sidebar rather than to either control: `--slide-in` and `--slide-out` run the labels with the column, and both the grip and the peek call the same two helpers, so a closing column always gives its width back after its words are gone. The column width itself is not animated - `grid-template-columns` does not interpolate here, and a transition on it holds the old width for its duration and then snaps, which reads as a jump; the labels carry the movement instead.

  **`.sp-sidebar--peek` is not committed.** While collapsed, pointing at the sidebar opens it over the page - absolute, so the page keeps its column and never reflows - and leaving closes it; 180ms in, 500ms out, with the words sliding in and out on their own 180/140ms so the panel and its content move as one thing. It is drawn to be judged, not built. If the experiment is dropped, delete 9i, the grip and peek rules, the two keyframes, the `grid-column: 2` rule, and `wirePeek`, `slideOpen`, `slideShut` and the grip handler in `components.js`; the rail itself is a width response and is untouched by any of it.

  **The rail became a state of the sidebar rather than of the shell**, since a sidebar drawn on its own has to collapse too: `.sp-sidebar--rail` carries the treatment and `.sp-shell--collapsed` shares every rule with it. Collapsing changes width only - every row's top and every icon's centre line is identical in both states, which took one row height (40px minimum on `.sp-nav-item`), one leading slot (`--mark-small`, 24, so an icon and a set of initials share a centre), the rail keeping the column's vertical inset and block spacing, and group titles and note rows keeping their boxes and losing only their words.

- 2026-09-15 - The last two hand-built components are gone.

  **A list row was drawn three ways.** c1's `.sp-table` is the list row - a `<table>` with `sp-col-*` columns - and Order list plus nine other tables use it. Two pages imitated it with div grids instead: Duplicate and alerts 8a (`.da-row`, its own six-column grid, its own 12/16 padding, hairline and `--surface-2` ground) and States 6b (three `.sc-row`, a hand-copied column set). Both use the component now and neither page stylesheet has a row rule left.

  6b was the one that mattered: its lede promises the skeleton has "same row height, same column positions" as the loaded list, which a copied grid can only honour until someone changes a column. The skeleton now sits in the same table, so the claim holds by construction. Two skeleton shapes were missing for it - `--check` and `--icon` - and are in the library beside `--mark`.

  **Touch excludes `--small` from width, never from height.** `.sp-touch .sp-btn` was forcing `min-height: 48px` *and* `width: 100%` on every button, so a small button in a card's header row rendered full-bleed. Only the width rule excludes it - excluding the height too dropped small buttons to 31px, under the 44 floor. Layout rules' 375px specimens were also outside `.sp-touch` entirely, rendering at the desktop 42 while their own notes promised 48; the scope is on the specimen wrapper now, where Order editing puts it.

- 2026-09-15 - A sync pass over all twenty-one pages: what the pages draw for themselves, checked against what the library already draws.

  **Five elements on one page hit the same cascade trap**, all by adding a page class onto an element that already carried a component class: the drawer trigger, the rail's collapsed summary, the facet rail, the detail panel and the drill chevron. `.sp-facets`, `.sp-panel`, `.sp-card`, `.sp-combobox__trigger` and `.sp-icon-btn` each set their own `display`, unlayered, so every `display: none` the page wrote in `@layer base` was dead - the rail and the trigger showed together below 1280, the panel stayed beside the list below 900, and the chevron showed at every width. All five are page wrappers around their component now, and each swap is probed at the width its query names rather than read off the markup. `CONVERSION-CHECKS.md` §6c now carries the mechanical check, since eye-reading missed it four times in one session.

  **A panel is only true if its selectors match something.** Checking that a class existed *somewhere* in the stylesheets passed three selectors that could never match: `.oe-body > .rr-rail` (the two classes live on different pages), and `.sp-shell__body .rr-shape-rail`/`.rr-shape-panel` (the shapes sit in `.rr-frame`, and this page has no shell body). Panels 1 - 3 now transcribe the rules that actually draw the frame above them - the `.rr-shape-*` grid, its container query, and the states that swap - and panel 4's statistics block states `.os-stats` as it is, a four-track grid, not the twelve columns with `.sp-stat` spans it claimed; `.sp-stat` exists as a text role, never as a card. Every selector in all five panels now matches a live element, the one exception being `.os-stats`, which is on Order statistics and labelled as such. The note beside it no longer teaches "spans must be divisors of 12".

  **`.sp-cards--fluid`**: the same card grid with no query at all - the track floor decides how many fit, so it reflows at every width instead of stepping at 1100 and 640. Two classes, so it outranks the base track and the queries. Responsive reference's shape 4 is the variant, which is what that section argues for; the panel beside it now states both, the component as it ships and the variant.

  **All four shapes on Responsive reference now draw the real thing.** Shape 2 had built its own facet rail - `.sp-card`s of checkbox rows - where 2b's rail is `.sp-facets` holding `fieldset.sp-facet` with a `legend.sp-facet__head` and chip filters; and its own row table, `.rr-row-table .rr-r` as an eight-track grid, where the product's list is `.sp-table`. Both are the components now, so the phone transformation the section exists to document happens to the real table: `thead` hides, `tr` becomes a two-column grid, the desktop cells drop and the `.rr-m2` summary line appears. Shape 3's panel is `.sp-panel` rather than a page copy of it. Shape 1 was already built on `.sp-lines`. Two page rules had to change shape with it: the drawer trigger is now a page wrapper around `.sp-combobox__trigger`, because a page rule cannot hide an element carrying a component class, and the stage heights state what their scaled frames occupy.

  **21 card stacks were stacking at 16.** `sp-stack sp-gap-16` holding cards - six on Order create, four on Order editing, three on States - against the 12 the rule sets, which my earlier pass missed because it read the page stylesheets and these are utilities in the markup. The 25 that hold a `sp-section-label` group keep 16: those are documentation groupings, which is the frame's value.

  **The order cards in Responsive reference's shape 4 were invented.** The card grid demonstrated `.sp-card` wrappers holding `.sp-sum`, `.sp-heading`, `.sp-mark--large` thumbnails and a `.sp-stat__figure` total - a card that exists nowhere. The real one is 2c's `.sp-record` inside `.sp-cards`: a photo strip with its pick control, a head of title and reference with a status pill, a chip row, and a foot of date, saving and amount. The three demo cards are that markup now, and the stage's height went from 164 to 192 because the invented card was shorter than the real one and had been clipping the amount the card exists to show. Two card gaps in the library were still off the 12 rule - `.sp-cards` at 14 and `.sp-list--cards` at 14 - both now 12.

  **A ruled section label painted its rule over the next element.** `.sp-section-label--ruled` carried a border and 8px of padding below it while the label itself is inline, and an inline box's padding and border occupy no line height - so wherever the parent was not a flex container the rule landed 9px into whatever followed, reading as a hairline tucked under the first field's label. It works in a flex parent only because flex blockifies its children, which is luck rather than a rule. The variant is `display: block` now, as a label heading a block has to be. Responsive reference also had its own copy of it, `.rr-ruled`, at 10px padding against the component's 8 - four uses, now the component.

  **Responsive reference's CSS panels named 22 selectors, and not one of them existed.** `.order-layout`, `.facets`, `.row-table .r`, `.panel`, `.kpi`, `.ctl` - invented names for things the system already names, which is the same "one thing, two names" fault in the one place a developer would copy from. They are the real classes now: `.sp-shell__body`, `.oe-body`, `.sp-rail`, `.sp-facets`, `.sp-chip--facet`, `.sp-table thead`/`tr`, `.sp-panel`, `.sp-cards`, `.os-stats`, `.sp-stat`, `.sp-input/.sp-btn/.sp-select`, and the page's own `.rr-*` classes for the states it draws right there. Values are tokens rather than literals - `var(--sp-12)`, `var(--control-h-touch)`, `var(--r-card)` - so a panel cannot drift from the scale again. Every selector in all five panels resolves to a rule that exists; the formatting is four-space, one rule per line where it fits.

  **The spec pages stated numbers the system does not have.** Layout rules is what Claude Code reads to learn the geometry, and its build-to-these column listed "24 between columns, 14 stacked cards, 16 card grid, 16/18/20 card padding, 48 page (20 mobile)" - five values off a scale that stops at 16 - while 15a stated the same rule a second way at 16. Responsive reference's CSS panels gapped every layout at 16 and set the touch control to 46px. Both now state what ships: 12 between cards wherever they sit, 16 inside a card and as a page's inset, 6 and 8 inside a card, 42/48 control heights, and the phone's inset rather than an invented 20. Eleven stale figures across Layout rules, Responsive reference, Auth, Order list and the library's own gap note; no page now names a spacing token or control height that is not defined.

  One of those figures was not stale but wrong in the implementation: `.sp-shell__body` - the page body every desktop screen is built in - gapped its cards at 16, which my page-stylesheet pass had not covered because it lives in the library. It is 12, and its padding now reads `--card-pad` rather than restating 16.

  **The documentation frame is two spacing values and no others.** It had three: 16 between sections and specimens, 8 inside a specimen, and 12 on the section head and the legend grid - 12 being the product's card gap, which made the frame and the drawings inside it space alike. The head and the legend are 8 now, and `doc.css` states the rule at the top of the file: 16 separates one drawing from the next, 8 holds a drawing together with its label and notes. Two things keep 12, both because they *are* the product: `.doc-table__row`, whose 12 is a table's column gap and has to match `.sp-table`'s, and `.doc-card`, which is a card.

  **`.dm-pair` was two different rules under one name** - a two-up grid at 12 and an inline swatch-and-hex pair at 6 - with the inline rule declared second, so the one div that wanted the grid was getting `inline-flex` and the wrong gap. The grid is `.dm-two` now. A sweep for the same fault across every page stylesheet found no others; the ten apparent collisions in Responsive reference are that page's subject, one selector shown and hidden across container queries.

  **The 12 card gap was not held everywhere.** Eleven rules across Home, Order create, Order editing, Order statistics and Settings separated cards inside a drawn screen at 8, 10 or 16 - two-up pairs at 8 and 10, screen columns and stat rows at 16 - so a screen's rhythm changed page to page. All eleven are `--sp-12` now. What stayed off 12, and why: the documentation frame keeps its own 16 between specimens (`.doc-specimens`, `.doc-section`) since that separates drawings rather than cards; rails, figure lists, diagram blocks, scrolling breakdown rows and the import mapping row keep 2, 4, 6, 8 and 10 because they space controls and text inside a card, not cards against each other; and `.os-below` still cancels the card's gap with a negative margin, so the negative bar reads as part of one chart.

  **Six classes in the markup had no rule behind them** - `dm-map-col`, `dm-rules`, `ns-mid` (16 elements), `rr-list` - and one was a real defect from the table conversion: a head row in Layout rules carried both `lr-row--kv` and the deleted `lr-row--head`, so it had been rendering as an ordinary row. It is `doc-table__head` now.

  **A phone's corner was two numbers.** The frame rounded at `--r-card` in the library and at a literal 28 on Mobile screens, so every specimen showed a phone with card corners while every mockup showed glass ones; the sheet inside it added a third value, a lone 22 at the top. It is `--r-phone: 28px` now, on `.sp-phone` and on everything that bleeds into an edge - tab bar, save bar, top bar, selection bar, and a sheet's bottom two corners, its top two staying `--r-card`. The page states none of it. The status bar keeps its 22px side inset: it is the clock and indicators the operating system draws at the inset iOS uses, which is also why it is the page's and not the library's.

  **The documentation table was drawn eight times.** Actions inventory, Auth, Input types, Layout rules, Navigation shell, Responsive reference and States each stated their own rule table, at four different paddings (12/16, 10/14, 12/16, 8/15), four gaps (14, 10, 12, 16), two head grounds (`--surface-2`, `--surface-3`), two head inks and two trackings - while each one's comment claimed it "reads exactly as .sp-table's own head does". It is `doc.css`'s `.doc-table__row` and `.doc-table__head` now, the head matching `.sp-table thead th` exactly, the box around it c1's `.sp-list` rather than a second implementation, and each page stating only its own columns. Two things that looked like doc tables are not and were left alone: Layout rules' `.lr-trow` and Responsive reference's `.rr-r` are the *product* table row drawn at each width.

  **Off-scale values were reaching the pages through `var()` fallbacks for tokens that do not exist.** `--sp-24`, `--sp-18` and `--r-chip` were inventions with a literal behind them, so a specimen card padded 24 and gapped 18 where the scale stops at 16. `--shell-deep` was worse: two pages used it with *different* hexes behind it, so the one dark ground in the system was drawn at `#14261c` on Typography and `#1f1c19` on Responsive reference. Both are `var(--shell)` now, the sidebar's own ground. The same scan over `components.css` and `doc.css` found one more, `--menu-max` behind a 176px literal; it is a token beside the other control sizes. No stylesheet in the system names a token that is not defined, and none carries a `var()` fallback.

  **Twenty-one dead rules removed**, including a hand-built phone and sheet in Input types (`.it-phone`, `.it-sheet` with their own `--r-phone`) that no markup had used since that page was converted.

- 2026-09-15 - The phone pages read back against the components, and four things the mockups had invented came out of them.

  **The FAB is New order, not the camera, and it is one 56px round button.** It opens step 1 of 3a - receipt zone, empty order, copy - rather than the camera, so `.sp-fab` is a `<button>` now instead of a `<label>` wrapping a capture input; that input belongs to 3a's receipt zone, which already had it. It had also drifted into two implementations: a 48px labelled pill in the component and the shell, and a 56px round page class on the phone frames. The component is the 56px round one, icon only, and the pages set position only. Its visibility is a rule now, in 9h: Home and Orders, never on Statistics, Settings, More's lists, or any screen with a save bar, sheet, dialog or viewer up.

  **`.sp-scrim`, and the three pages that each owned one.** A sheet or a dialog sits over a dimmed screen, and that dim existed only as page classes - `ms-scrim`, `ns-scrim`, `au-scrim` - one of them at `rgba(27,26,23,0.38)` rather than `--overlay-photo`, so the system had two dim values. It is one component now, with `--dialog` for the variant that centres a dialog in it, and every sheet specimen in the library shows the screen behind it dimmed. Two things it needed from the frame: `.sp-phone` is `position: relative` (a scrim measured against the page, not the frame, until it was), and a sheet above a scrim needs a position of its own, since an absolutely positioned scrim paints later than an in-flow sibling whatever the DOM order.

  **The bar at the top of a phone screen is `.sp-topbar` in a `--touch` variant**, not a page class. Mobile screens had built its own with the same shape; both specimens and all thirteen mockup bars are the component now, and two tokens carry what used to be repeated numbers: `--phone-bar-h` (68, the height of every bar a phone pins - top, tab, save, and the selection bar that stands in for the top bar) and `--phone-gutter` (16 on the frame, 12 where a page draws its phones tighter). The height is exact rather than a floor: a 48px touch field plus padding and a border lands on 69 and would leave the selection bar a pixel short of the bar it replaces.

  **A page rule cannot resize a component, and two specimens had been pretending otherwise.** `.au-dialog` asked for 220px against the dialog's own 420 and was clipped by its frame; it is a scaled thumbnail now, keeping the component's real metrics. `.doc-phone-short` cancelled the phone's padding, so the sheet inside it hung 16px outside the frame.

  **`.sp-palette--screen`** - the palette full-bleed on a phone, body taking the frame's height rather than its own 420 maximum. Three properties had to be overridden together for it to fill: `width`, `max-width` and `align-self`, because the base sets a fixed 520 with `max-width: 100%`, and either one alone re-capped it.

  **Two second implementations removed from Mobile screens.** The 7b frames had their own top bar - a title, a chip strip and a summary stacked in `.ms-appbar--stack`, plus an icon-button pair for search and filters - against 9h's search-only bar and 2b's Filters/Sort pair. The bar is the same on all eleven destination frames now; what was in it moved into the list head, which is where 2b already put it. `.ms-appbar--stack` and `.ms-badge` are gone with it, and the labelled FAB variant too.

  **The charts were empty because of the cascade rule again.** `.ms-bars130` declared a grid, a gap and a height in `@layer base` against unlayered `.sp-bars`, so none of it applied, and the bars - wrapped in hand-made columns rather than `.sp-bars__col` - had no resolved height to take a percentage of. The component's own column and tick do both. A bar at `data-h="100"` in a labelled column fills the column and squeezes the tick out, so a labelled chart tops out at 80.

  **Every bar a phone pins has one height.** The top bar is 64 whatever it carries - the search field, or a back control beside a record's name - where it had been 62 and 63; the bars at the bottom have a floor of 68, the height of the tallest thing that sits in one, so a frame does not change height when a save bar replaces the tab bar. Both are page rules, not component ones: neither `.sp-tabbar` nor `.sp-savebar` states a height, so a page can set a floor without reaching past the component. The tab bar's items had to be centred once the bar was taller than their content.

  **A stacked pair on a phone is 2, not 6.** A title with its second line reads as one block, and `.sp-card--row > .sp-stack` already gave it `--sp-2`; the phone frames now do it everywhere - 47 pairs - as one page rule. The pairs had to drop `sp-gap-6` for it to apply, because a scale utility is unlayered and a page rule can never outrank one. A stack that wants a real gap still asks with `sp-gap-8`.

  Spacing on that page is one value throughout: 12 for the side gutter, the gap below the bar and every gap between elements. Three page rules had been quietly doubling it - a scroll region nested inside a scroll region, a pane padding itself as well as its child, and a list head adding its own top padding to the column's gap. A card flush with a scrolling region's edge also loses its top border to the clip, so the 12 above the first card is the scroll's padding rather than a gap above the scroll.

- 2026-09-14 - Mobile screens, the last of the twenty-one, finished by replacing what I had hand-built on it rather than adjusting it. Rule 0 of `styles/CONVERSION-CHECKS.md` now records the pattern, because five separate defects on this page had the same cause: an attention row built as count + text + spacer + label where c24 is count + text carrying `sp-grow` + chevron, so two type sizes each centred on the row and their baselines never met; a period picker built as a four-column page grid where c14's `.sp-period__presets` exists; a crumb trail built as chips with loose chevrons where `.sp-crumbs` and `.sp-crumb__remove` exist; a full-bleed notice built as `.sp-list-item` with a page rule trying to square its corners, which is c25's `.sp-alert`; and a PDF page drawn as a box with drawn rules on it, which is c16's `.sp-tile--file`.

  Two more from the same session: the save bar was inside the scrolling region, so a bar that must never scroll away scrolled with the content - it is the device's own last child now; and the sheet was `position: static`, painting under its absolutely positioned scrim whatever the DOM order.

  The cascade rule caught four times over: a page rule in `@layer base` cannot change a component's width, padding, height or radius, because the component's own rule is unlayered. `.sp-phone` is 375px and pads itself 16px whatever the page asks; `.sp-skeleton` is 12px tall. Where a phone's bars must reach the glass, each one cancels that padding the way `.sp-phone > .sp-tabbar` already does; where a card-height stand-in was wanted, it is c13's loading card rather than a skeleton stretched by a rule that could never win.

- 2026-09-14 - Mobile screens converted: 739 inline declarations to none. That is the last of the twenty-one pages; every one now passes the structural guard with zero inline styles and no class without a rule.

  The page is eleven phone frames, so most of what it drew already existed: `.sp-phone` owns the device surface and hides its scrollbars, `.sp-tabbar` the bottom bar and its items, `.sp-sheet` the overlay, `.sp-savebar` the commit bar. 58 real controls replaced the divs wearing control classes - searches became `.sp-picker__search` with a real `type="search"`, the Filters and Sort boxes became combobox triggers, the tabs became buttons, the period pickers labels over radios. What the page keeps as its own is the frame a phone mockup needs and the app does not render: the status bar, the app bar, the one scrolling region, the floating action, and a count badge over an icon button.

  Two library decisions the page had disagreed with, both resolved in the library's favour: a phone is 375px wide, not 390 - `.sp-phone` sets it unlayered, so the page cannot widen it and no longer tries; and four ink and chip names the page used (`sp-ink-6`, `sp-ink-4`, `sp-chip--on`, `sp-scrim`) do not exist, so they are the ones that do.

- 2026-09-14 - Layout rules, three rounds of defects found by checking the render rather than the markup. Every control on the page was a `<div>` wearing a component class: the mapping pass had swapped the inline styles for classes and left the elements alone, so nothing was focusable. 57 real controls now, and the eight toolbar specimens are c20's `.sp-controls` rather than hand-built rows - which is what fixed their overflow at the cause, since the bar's own rules grow the search, hold the combobox and button at their content width, and set the trigger to `width: auto`. The column-shape diagrams had been given `.sp-row-flex`, whose `align-items: center` collapsed the blocks to their text height when the block heights are the diagram; the row owns its own layout now.

  And six figures in the page's prose no longer matched the library: it stated 24px between columns, 14px between stacked cards and 12px between fields where every one is the shell's own 16 and a field row's 8; it stated the toolbar pads `14px 16px` where `.sp-controls` pads `--card-pad`; and it claimed a radius-10 exception for toolbar controls that does not exist - they are `--r-field` like every other box. A page titled Layout rules cannot state gaps the library does not use.

  Method note: editing these pages by slicing the source at indices corrupted this page once - a regex matched across an element boundary and swallowed part of a control. It was restored from `design_handoff_full` and redone with balanced extraction, finding each element's real closing tag. `scraps/page-edit-guard.js` now runs before every write.

- 2026-09-14 - Layout rules converted: 699 inline declarations to none. Nothing new was needed - the page's two hand-drawn steppers became c4's stepper, its touch-sized inputs became `.sp-input` inside `.sp-touch`, and the three table specimens now carry their column set as `data-cols` on one row rule, the same way Order list 2i and Vendors 5m do, so three widths are three lines of page CSS rather than three copies of a row. One class I had invented for it, `.sp-icon-btn--primary`, is gone: no page in the set has an icon-only primary button, so the specimen uses `.sp-btn` and lets the component size itself.

  Also this day: `.sp-field__trail` gained the chrome reset it never had. It set only position and size, so every `<button>` using it - twelve, in Auth and in c3's own specimens - rendered the browser's default 2px outset grey box over the field. And a page rule cannot hide an element that also carries a component class: `display: none` in `@layer base` loses to `.sp-field`'s own unlayered `display: flex`, whatever the specificity. Both are written up in `styles/CONVERSION-CHECKS.md`, along with the three structural checks - matching closers, no documentation outside a section, the scope wrapper closing last - that now run before every write via `scraps/page-edit-guard.js`.

- 2026-09-14 - Auth and first run, its twelve inputs taken from drawn approximations to c3's own field. Every one was a hand-built stack - a `.sp-title` or `.sp-meta sp-strong` div as the label, the input loose beneath it - so the page had no `.sp-field` and no `<label>` at all. Six defects in one set: the label was never bound, so clicking it did nothing; `aria-label` repeated the field's own value, which tells a screen reader the value is the field's name; email fields were `type="text"` with no `autocomplete`, so no browser could fill them; one masked value was bullet characters typed as text rather than `type="password"`; the one invalid field carried `aria-invalid` with its message drawn as an icon row instead of the bound `.sp-field__error` c3 specifies, which explicitly carries no icon; and an input was wearing flex classes, which do nothing on a replaced element. All twelve are now c3 fields with bound labels, and the page's seventeen `div` buttons are real buttons, their form commits in caps.

  Responsive reference converted the same day: 552 inline declarations to none. Its `<style>` block was the page's own subject - the four layout shapes, the row-to-card change and the field grids are working CSS meant to be copied - so it moved to `styles/pages/responsive-reference.css` under the page prefix, in `@layer base`, still on container queries rather than viewport media queries.

- 2026-09-14 - Documentation-table heads aligned to the library's own. Three pages had invented their own head typography - Navigation shell at 10px in `--ink-4`, Auth and first run at 10px with the eyebrow tracking, Input types at 11px in `--ink-4` - where `.sp-table thead th` is 11px, `--ls-label`, `--ink-5`. All three now read exactly as a product table's head does, so a documentation table and a product table are the same object at a glance. Typography's `.ty-dark-label` keeps its own size: it is an inverted badge on the dark ground, not a table head.

- 2026-09-14 - Icons: one source, one register. Tabler Icons is now the only source, read from `tabler/tabler-icons` into `icons.js` - 40 outline icons, path data unmodified, one wrapper for all of them at Tabler's own convention (24 grid, `stroke-width: 2`, round caps, `currentColor`, sized from the `--icon-*` tokens). Icon legend 19a is the register: every icon in the app has a row, nothing without a row may be used, and the Name column is the Tabler name. Adding one means finding it in Tabler, adding it to `icons.js`, then adding its row - never drawing, editing or pasting from elsewhere.

  What this replaced: 130 distinct hand-drawn glyphs across the pages, fourteen stroke weights between 1.2 and 3, and the same icon drawn as many as four ways - a camera at two coordinate sets, a trash can missing a stroke on one page, a search icon on both a 16 and a 24 grid. 130 drawings were merged into the canonical one before the swap, and 990 stroke widths were recomputed to the single ratio. The legend itself collapsed from 54 rows to 39, because the old one named uses rather than icons: Trash and Delete, Edit and Pencil, Note and Document, Date and Calendar were each one icon under two names.

  Two rows still carry no Tabler artwork - the Decor category glyph and a documentation window diagram - and the ~90 hand-drawn glyphs in the mockup pages are not yet swapped. Both are listed as open in 19a.

- 2026-09-30 - Dark mode and image viewer (12a, 12b) rebuilt on the library: 551 inline style declarations, now none, and no new component. The page had hand-drawn every dark value twice - once in its token map and again in each preview - while `tokens.css` already carries the whole dark theme in a `[data-theme="dark"]` block derived from this page. So the previews now carry that attribute and use plain component markup, and the tokens supply every colour. The two side-by-side sidebars are the identical `.sp-sidebar` markup with the canvas switched, which is the point the specimen was making and could not previously demonstrate, since it was two separate drawings that had to be kept in step by hand. The token map is a c1 table whose swatch chips read `var(--<token>)` from a `data-token` attribute on the row, the dark chip being inside a dark context - so one page rule per token produces both values and the page states no hex at all outside the reference text.

  Three values in the page's map disagreed with `tokens.css`: red ink (#d99a90 against #d99187) and red surface (#2c1e1c against #33231f). The tokens win, and the text now reads them.

  Worth a decision later: `.sp-btn`'s ink is `#fff`, which in the dark theme puts white on the lifted green - 3.1:1. The page's old drawing used `#14261c` on that fill, which is 5.0:1, and the mark component already does this correctly in both themes. The button does not, so a dark-theme primary is currently the one control on the page below 4.5:1.

- 2026-09-30 - Both scales now name themselves by value, the way the spacing tokens always did. Type was named by role with t-shirt sizes bolted on, which carried two traps: `--t-body` was 13px and `--t-base` 14px - two names that sound like the same thing, one step apart - and `--t-lg` 15 then `--t-xl` 20 implied an even ramp the values did not have. The scale is `--t-10` through `--t-34` now, one name per size, nothing to look up.

  The gap classes had a real defect: `.sp-gap-4` and `.sp-gap-5` both resolved to 16px, so five classes carried four values and a page could pick either for the same result. `--sp-10` and `--sp-14` had no class at all, so a page wanting those steps had to reach past the scale. There is now one class per step, named by value - `.sp-gap-6` to `.sp-gap-16` - and 562 uses across the thirteen pages were rewritten onto them.

- 2026-09-30 - The type scale made whole. components.css had seven font sizes hardcoded outside the scale - 9, 10, 16, 18, 22, 26 and 34px - which is why Typography's own rows had drifted from the product. Each is now on a step: the two smallest labels (a count inside a mark, a file's kind on a tile) join `--t-eyebrow`; the tab bar's label too; the empty-state title and the initials in a 42px mark join `--t-xl`; and the two figures become tokens, `--t-2xl` for the figure a card is about and `--t-3xl` for the one a page is about. `--t-2xl` existed already at 24px and was used nowhere; it now has the job its comment described. `--t-touch` (16px) is new and named for the reason it exists: below it, iOS zooms a focused field.

  Visible consequences, all deliberate: a card's stat figure is 24px rather than 26, an empty-state title 20 rather than 18, and the initials in a form-sized mark 20 rather than 22. Nothing else moves. There are now no hardcoded font sizes anywhere in components.css, and Typography's scale shows every step with both its token and the class that carries it.

- 2026-09-29 - Typography (13a) converted; 187 inline declarations, now none. It is the one page whose subject is type, so it is the one page whose specimens may legitimately name a size - but only for the display sizes drawn to show the family, which no screen uses. Every row of the scale now renders from the component that owns it and names that component beside it, so the page and the product cannot drift apart.

  Converting it found three rows whose sample disagreed with its own label. The page claimed a 34/600 page title and a 20/700 card total; the components are `.sp-stat__figure--large` at 34/700 and `.sp-stat__figure` at 26/700, and a card's total is `.sp-amount` at 14/600. Two of those figures are hardcoded px in components.css rather than tokens - `font-size: 26px` and `34px` - which is why nothing caught the drift. Worth raising: they are the only type sizes in the library that are not tokens.

- 2026-09-29 - Actions inventory reduced to what only it says, and two specifications moved into the component that owns them. Five of its eight sections described behaviour that the pages implementing it already document - the row menu (Order list 2e, c9), what a row click does, hover, and the two that moved: selecting rows and ordering by hand are now note groups inside c1, with the two states c1 had no drawing for. The header checkbox's three states are real checkboxes, the middle one standing in for `.indeterminate` with a data attribute, since that is a property and cannot be written in markup; and a row being carried is `.sp-line--carried` over `.sp-line__insertion`, both on values the library already names. The claim in the moved notes that the lift shadow was an existing token was wrong - there is no such token, so it uses `--shadow-menu`, the one raised surface the library names, and the note says so.

  Two failures of mine on that page, recorded because they were expensive. My conversion scripts deleted sections 16a and 16b outright; they were recovered from `design_handoff_full`. And a depth-counting rewrite of the menus miscounted on a nested spacer div, truncating six menu items and corrupting a table header cell into `<div>FROM</button></li>`. A structural rewrite needs a tag-balance assertion after it, not just a count of what it replaced.

- 2026-09-26 - The card footer's rule written down, after nine buttons on Settings sat loose in their card's stack rather than in it. They landed in the same place with the same spacing and no rule above them, so the two structures were one thing drawn two ways - and a full-width button with no rule above it reads as one more row of the card's content. All nine are in `.sp-card__footer` now; `.sp-card > .sp-btn` returns nothing on any page, and that is the check. The divider is stated as a rule about context rather than the footer's identity, which is what `.sp-well + .sp-card__footer` already assumed.

- 2026-09-26 - Button variants aligned across all eleven converted pages, and the checks that find this kind of defect written down in `styles/CONVERSION-CHECKS.md`. Every dialog and sheet foot commits in `--caps` (29 buttons), and so does every card footer whose button changes data or closes a decision (33). A footer button that only reveals more of the card's own content - "Show all 200 vendors" - stays a text button, which is the one distinction inside that role. 21 labels typed in capitals were put back to sentence case: `--caps` uppercases in CSS, so a typed label renders identically and the defect is invisible in the browser, which is exactly how a button ends up uppercase at the wrong size. c6 now documents `--caps` with two specimens and states which of the four sizes belongs to which surface; the variant had been used 96 times across the pages while appearing in no specimen, so there was nothing to copy from and nothing saying when to use it.

  The cause of the whole class of defect, recorded because it will recur: a conversion pass reads one element at a time and takes its class from that element's own old inline style, so three full-width buttons in the same role can end up with two different variants and nothing ever compares them. The check is to group controls by role and assert one variant per group - not to look at each control and ask whether it looks right.

- 2026-09-15 - Settings and import (11a-11d) rebuilt on the library: 680 inline style declarations to none. The sidebar and the top bar were hand-drawn copies again, so both were replaced with the markup Home already carries - one shell, one search field, nav items with their icon slot - rather than mapped class by class. The file drop became a `<label>` over a real input, the two drawn switches became `.sp-switch`, the segmented control real radios, and every glyph takes its row's ink instead of a literal hex.

  Thirteen variants added, all of components that existed: `.sp-input--readonly` and `--empty` (c17), `.sp-well--quiet` and `--attention` (c10), `.sp-list-item--positive`, `--problem` and `--bordered` (c24 - the last for a row that is a choice rather than a notice), `.sp-kbd--accent` and `--attention` (c6), `.sp-mark--round` for a person rather than a record (c2), `.sp-check--drawn` (c5), `.sp-struck` for a superseded value (c21), and `.sp-rule--vertical` (c10).

  The page keeps its own stylesheet for what only it draws: the settings sub-navigation, the theme preview thumbnail, and the column sets of its two tables - which are `data-cols` on one row rule, the same way Order list 2i and Vendors 5m do it.

- 2026-09-22 - States and confirmations (6a-6f) rebuilt on the library: 405 inline declarations to none. It was the first of the twelve unconverted pages, and it confirmed what the Input types conversion suggested - an old page does not just use different markup, it carries rules the library has since settled differently. Nine were corrected against Components rather than preserved: the dialog used generic text roles instead of `__title` / `__body` / `__actions`; the toast's Undo was a span rather than a button, and the toast's text carried its own ink where c23 says the toast owns it; the empty state wrapped its title and body in a stack, overriding the component's own rhythm; every button was a `<div>` and every field a box with text in it; a pill wrapped a second span to set the ink it already has; and the scan-failure row used c24's attention row to carry a record's identity, which is `.sp-card--row`.

  One thing the page had right and I nearly changed: the disabled Delete in the typed-confirmation dialog. c6 says an action that cannot run is absent rather than disabled - but its own exception is the control the user's next keystroke enables, which is exactly this.

  `.sp-swatch` (c31), `.sp-step` and `.sp-rule` had been in the stylesheet since the Input types work without a specimen in Components. They are documented now, as **c31**.

- 2026-09-21 - Input types resolved. The page was a hand-drawn second copy of the library: seven sections redrawing c2 to c18 state by state. Four were deleted earlier; this turn removed two more. **14a, Extending the palette**, went because the premise is wrong - the colour picker is open, so there is no closed set of seven and nothing to extend. **14c, where an overlay opens**, moved into **c9**, which is where a menu's own positioning belongs: the six specimens and their rules now sit under the Menu component, using the library's `.sp-anchor`/`data-open` pattern rather than a drawing, with three new c9 variants for what the positioner picks when the preferred side does not fit - `--up`, `--scrolls` (caps at the room available and scrolls, never repositions while open) and `--side-left` / `--side-right` for a submenu. `.sp-menu__label` and `.sp-menu--start` were also missing and are now in c9.

  What remains of the page is one section: the component API. Its rows were corrected where they still described the old closed palette - SwatchPicker's `items` are the suggested values rather than the permitted ones, with `custom` opening the system picker; the mark's sizes are the library's three, not five; a category's colour is stored as the colour it is rather than an index into a palette. The count in its lede and in its own note disagreed with the table (nineteen, seventeen, actually twenty) and the destructive-button row still said destructive lives only in a dialog, which c6 has since settled otherwise.

  Three components were added for it and are drafts: `.sp-swatch` (c31) - a colour shown as itself in a reference or a legend, taking the colour as the same `data-swatch` attribute the mark and the option use; `.sp-step` (c32) - the number of a step in a procedure; and `.sp-rule` - a divider inside a card, where a second card would overstate the break. The page had been rendering unstyled throughout: it never linked the stylesheets, had no `.sp` scope, and its two reference tables referred to `it-` classes I had never written a page stylesheet for.

- 2026-09-14 - the rule is written down, in the three places a reader would look. c20's FIXED note states it: every bar a page puts above its content pads `--card-pad` and nothing else - the controls bar, the period control (c14), the save bar (c27) - because they are cards, so a bar and a card side by side at the top of a page are the same height, `--card-pad` + `--control-h` + `--card-pad`. A bar padding any other value is a defect, not a variant. The token's own comment in tokens.css says the same, and c20's rule in components.css points at it. The note also names the exception explicitly, so it cannot be read as a contradiction: the bars *inside* a list are not cards - the list toolbar and bulk bar take their height from their contents, the list footer and the top bar pad `--sp-12 --sp-16`.

- 2026-09-14 - every bar a page puts above its content is on `--card-pad`. The controls bar (c20) had already been corrected; the period control (c14) still padded `--sp-12 --sp-16`, so it stood 67px tall beside cards of 75 while holding the same 42px controls. Both read the token now, and no page overrides either - swept all eight converted pages and all six page stylesheets. Thirteen rules read `--card-pad`. The bars that sit *inside* a list keep their own padding, since they are not cards: the list toolbar and bulk bar take their height from their contents, the list footer and the top bar pad `--sp-12 --sp-16`, and the phone frame is a device, not a card.

- 2026-09-14 - Order statistics gains 4f, the custom range picker. The page offered Custom as the fifth preset and never showed what it opens. It is c14's control unchanged - quick ranges, two typed date fields, two months of days, the day count and Cancel / Apply - with the notes stating what the drawing cannot: nothing recomputes until Apply, the quick ranges fill the fields rather than being windows of their own, the fields accept typing, and on touch the panel is a sheet with one month.

- 2026-09-14 - `.sp-btn--text-destructive` deleted. I had invented a second destructive treatment when c6 already had one: the filled red `--destructive`, which is what Delete uses now, with the trash icon in front of it the way c6's own icon specimen draws it. The rule about an action that cannot run stays - it is absent, not disabled, with the blocker stated and the action that clears it offered - and c6 draws both states of that card.

- 2026-09-14 - c6 states what happens to an action that cannot run: it is absent, not disabled. A greyed-out button claims something is possible and refuses to say why, so the surface states the blocker in the user's terms and offers the action that clears it; the blocked action appears only once it can run. Vendors and categories 5c and 5f are the worked example - no Delete while orders point at the record, Archive or Move orders instead, Delete at zero - and c6 now draws both states of that card. `:disabled` keeps the narrower case it is right for: a control the user's next keystroke will enable, like Save on a form with a required field empty.

  `.sp-btn--text-destructive` also had no specimen anywhere - it existed only as a rule two pages used. It is documented now, with its place beside `--destructive` stated: the text weight where deleting is a consequence of the record, the filled red where a destructive act is the point of the screen. Its hover and press were both `--red-tint`; they are `--red-tint-2` then `--red-tint`, the direction every other button moves in. And `.sp-btn:disabled:hover` had named the primary green, so a disabled button of any variant turned green under the pointer - every variant's hover and active is written `:not(:disabled)` instead.

- 2026-09-14 - the stylesheet's own section labels now agree with Components. The renumber had under-matched: the save bar was still labelled c15 (Line items) and the divider c27, which is the save bar's number now - and the divider has no section at all, so its label says so rather than pointing at someone else's. The well and the roles list gained the labels their new sections earned (c26, c28), and the stepper, the file drop and the sort control were never labelled at all (c4, c8). Every c-number in components.css now resolves to the section it names, and every section except the cover has a rule labelled for it.

  `.sp-savebar` also documented a padding it did not have: its note said `--card-pad`, the rule said `--sp-12 --sp-16`. It is a card that stays put, so it takes the card's padding - the note was right and the rule is fixed.

- 2026-09-14 - the invalid field, corrected twice over. I had added `.sp-input--error` and `.sp-tokens--error`, and filed their specimen under c17, the file slot, which owns neither. c3 already had the answer: an invalid field is `aria-invalid="true"` with a `.sp-field__error` line, exactly as its NumberField specimen shows, and `.sp-input[aria-invalid="true"]` has carried the border and fill since the stylesheet was written. Both invented classes are deleted; the token field now reads its own input's state (`.sp-tokens:has([aria-invalid="true"])`). c3 gains the failed state for every field it owns - text, password, number, date, range and tokens - written the way NumberField already wrote it, and c26's link, which described the invalid field while pointing at the file slot, points at c3.

- 2026-09-14 - components renumbered contiguously, c0 to c28. Two holes had opened: c23 was already missing before this work, and c27 was the panel section I should not have created. Six sections shifted - the attention row, the palette and the popover panel down by one, and the well, the save bar and the roles list into the gap - and every reference in Components.dc.html, components.css and this file was moved with them. No section's content changed.

- 2026-09-14 - c27 deleted. I had given the panel its own component, but the only new rules in it were `.sp-panel` - a width and a sticky offset - and `.sp-shell__body` - a padding and a gap. Everything else that section drew was c1, c10, c20 and c21 composed. Both rules belong in c11 beside `.sp-rail`, which is the same kind of thing, so the specimen and the note moved there and the section is gone. Summary rows also fixed: c21 puts them in a `.sp-stack`, and 25 of them on Vendors and categories were sitting directly in a card footer or in a stack carrying its own gap, so the component's dividers and rhythm never applied.

- 2026-09-14 - one padding for every card. A card's inside edge was four different values: 16px on `.sp-card`, `.sp-sheet` and `.sp-dialog`, 12px on `.sp-list-card`, `.sp-well`, `.sp-alert`, `.sp-popover`, `.sp-viewer`, `.sp-calendar` and the shell card, 10px on `.sp-facet__panel`, and 14px top-and-bottom on the controls bar - so a bar above a list stood 71px tall beside a card of 75. All of them read `--card-pad` now, one token in tokens.css. A row is not a card and keeps its own: `.sp-list-item`, `.sp-choice--row`, `.sp-menu__item` and the toolbars are unchanged.

- 2026-09-14 - Vendors and categories has no page stylesheet. Every `vc-` class it carried turned out to be a component the library was missing, so they were added there instead: `.sp-shell__body` (c11, the content column's own padding and rhythm - every screen was restating it), `.sp-panel` and `--wide` (c11, the record a row opens, beside the list and sticky), `.sp-fields` (c17, two fields sharing a line), `.sp-table--compact` (c1, a table inside a panel - the alias list had been a hand-built grid), `.sp-section-label--ruled`, `.sp-gauge__key`, `.sp-savebar--page` and `.sp-menu--row`. The specimen widths moved to doc.css beside the ones already there. `styles/pages/vendors-categories.css` is deleted.

  Two defects the sweep exposed, both fixed in the component. A pill that flags a record sat in the name's line and set that line's height, so a flagged row was 77px against its neighbours' 68 - it no longer does. And `var(--red-3)` does not exist: four rules I had added (`.sp-input--error`, `.sp-tokens--error`, `.sp-well--destructive`, `.sp-chip--destructive`) were drawing an invalid field's border in near-black. They use `--red`, which the palette names for exactly that, and dark mode now defines `--red` alongside the rest of its red family.

- 2026-09-14 - c7, one cell size. The swatch was 32px and the icon cell 42px, so the colour row and the icon row in the same form did not line up. The swatch override is deleted and both are `--mark-medium`.

- 2026-09-14 - c7, the picker loses its own box. It carried a border, a radius and padding around the search and the options, while the swatch group in the same component sits directly in its field with no frame. The field's label and help line already group what belongs together, so the second frame only added an edge. The picker is the stack now, and the two option groups read alike.

- 2026-09-14 - c7, `.sp-picker__name` removed. The picker stated the chosen option's name beneath itself, which repeated what the screen already shows next to the thing being named - the mark's own label on the vendor and category panels. The picker is the search and the options now; naming the selection belongs to the field around it.

- 2026-09-14 - c7, settled: the option group wraps. A grid of eight columns could only hold eight, so a narrower field either shrank the icons or pushed them past its edge. The group is a wrapping row of fixed cells now, which makes the swatch group and the icon group one rule rather than two: an icon is the same size everywhere it is shown, a field holds as many as it fits, the rest go on the next line. Eight is what a field at the form width holds, not a number the component enforces.

- 2026-09-14 - c7, an earlier attempt: the grid spreads, the icons do not scale. `1fr` tracks made the cells grow with the field, which changed the icon's size from place to place. The tracks are `var(--mark-medium)` with `justify-content: space-between` now, so the eight cells keep the mark's size everywhere and the row spreads across whatever field it is given.

- 2026-09-14 - c7, the option grid fills its field. It was `repeat(8, minmax(0, --mark-medium))`, which capped every cell at the row-mark size and left the control short of its container - the only input in the library that did not fill the field it sits in. The tracks are `1fr` now: eight columns dividing the width given, each cell square, so a wider field makes larger icons rather than a shorter control. Affects the icon picker wherever it appears (c7's own specimen, Vendors and categories 5e, 5f and 5k).

- 2026-09-14 - Vendors and categories, three controls taken from the old page's drawing to the component's own rules. The five colour pickers were a wrapping row of swatches with a plus-shaped button that did nothing; they are c7's `.sp-options--swatch` now, each swatch named, and the last box a `<label>` over a real `<input type="color">` - the custom colour the component always specified. The icon picker (5k) was the same story: I had added a `.sp-options--grid` variant that restated the eight columns from the old page's inline style, when `.sp-options` already auto-fills at `--mark-medium` and reaches eight columns on its own in a 460px well. The variant is deleted from the stylesheet and the page uses c7 unchanged. Every icon cell now carries a name and states its pressed state, which 5k's own note required and no cell had. The Icon and Colour labels are c17 fields rather than a title over a row, and their hint lines are `.sp-field__help`.

  The rule this turn settled: the component is the specification, not the page that predates it. Where the two disagreed, the page changed.

- 2026-09-14 - c5 gains `.sp-choice--described`: a checkbox or radio whose label is a bolded header with a line of description beneath it. The box aligns to the header rather than to the middle of the pair - the same reasoning as `.sp-line--top` - so its centre sits on the header's centre whatever length the description runs to. `.sp-choice__text` stacks the two at the library's tightest gap. Three states drawn in c5: chosen, unchosen, and unavailable, the last saying in its description why.

- 2026-09-14 - Vendors and categories, two defects from the first conversion fixed. The list toolbars were built as a card in a row with both the search and the sort control mapped onto `.sp-input`; since the library declares that class `width: 100%`, the sort control claimed 917px of a 949px row and starved the search to 24px. The toolbar is now `.sp-controls` - the same bar Order list uses - with the search as c7's picker search and the sort as c7's combobox trigger, which is content-sized. The panel header kept `.sp-card--row`: it is a card whose contents sit in a row, not a toolbar. Second, the thirteen form fields in 5b, 5c, 5e, 5f and 5j were a title, a div and a hint; they are c17 fields now - a bound `<label for>`, a real `<input>`, and the hint as `.sp-field__help` (the duplicate-name notice as `--attention`). Five more faux inputs - the icon picker's search, the icon a category carries, and two record pickers - are the controls they always were.

- 2026-09-14 - Vendors and categories (5a-5n, fourteen sections) rebuilt on the library. It was the largest page in the handoff: 1.634 inline style declarations, now none. Nothing new was invented for it; what it needed were roles the library already had in its tokens but not as classes - alignment (`.sp-right`, `.sp-center`, `.sp-nowrap`, `.sp-baseline`, `.sp-flex-none`, `.sp-muted`, `.sp-strong`), ink (`.sp-ink`, `.sp-ink-2`, `.sp-ink-5`, `.sp-ink-accent`, `.sp-ink-positive`, `.sp-ink-attention`, `.sp-ink-destructive`), one heading step above the card title (`.sp-heading`), and a bordered well inside a card (`.sp-well`). Variants: `.sp-card--row`, `.sp-card--attention`, `.sp-card__footer--stack`, `.sp-gauge--thin`, `.sp-input--error`, `.sp-tokens--error`, `.sp-chip--destructive`, `.sp-icon-btn--quiet`, `.sp-options--grid`, `.sp-mark--large`, `.sp-check--static`, `.sp-list-card--stack`, `.sp-bars--mini`, and `.sp-menu__sep`.

  Three things the conversion settled rather than preserved. The identity marks were drawn at 26, 30, 34, 42, 44 and 64px across the page; they are now the library's three sizes. The two row menus were 232 and 240 wide; they are both 232. Every gauge now carries a `<meter>`, so its value is readable, and every measurement is a data value on the 5% scale rather than a width. The responsive tables (5m) keep their column sets as `data-cols` on one row rule, the same way Order list 2i does, so the six widths are six lines of page CSS rather than six copies of a row.

  `.sp-savebar` was missing from components.css - it had been lost from the file after Order editing added it - and is restored.

- 2026-09-14 - Order create checked against Components end to end. Three fixes. c6: a pill stretched to full width when it was the child of a column rather than sitting in a row - it now hugs its text wherever it sits, which is what a pill is. c17: twelve field labels on the page were spans; they bind to their controls as `<label for>` now, and the numeric ones carry `sp-number` and a decimal keypad. The file drop was carrying a page gap class that the component already owns. Status and Categories keep span labels: they head a group, which `for` cannot address.

- 2026-09-14 - Two spacing values brought onto one rhythm. c23's row was inset 8/10 while the line row (c15) beside it in the same card was 12/12, so a mark in one did not line up with a mark in the other; c23 is now 12/12. c16's attachment strip sat its tiles 8 apart against the card's 12, and is now 12 as well - a change to a locked component, made deliberately. The tile-to-filename gap inside an attachment stays 6: that is a label to its object, not two siblings.

- 2026-09-13 - Order editing layouts 1a-1d rebuilt on the library. Two draft additions: `.sp-savebar` (c15) - the bar a form commits from, which never scrolls away, so inside a phone it bleeds to the frame's edges and takes its bottom corners exactly as the tab bar does; and `.sp-btn--text-destructive` (c6 variant) for Delete sitting alone under a committing pair. Everything else was in place: the read view's detail rows are the summary rows (c21), the line editor is c15 in both its homes - expanded in the row on 1a/1b/1d and filling the sheet on 1c - the photo menu is c9 anchored on the c17 slot, and the mobile screens are `.sp-phone` inside `.sp-touch`, so the touch sizes come from the library rather than from the page.

- 2026-09-13 - `.sp-gauge__fill--negative` and `.sp-amount--negative` added as draft variants: under the net lens a breakdown row can be money that came back, so the bar grows from the right edge in the problem tone and the figure carries the same tone. A negative reads as a direction, not as a smaller positive. 4e's downward month bar stays page-local for now - it needs a signed axis, which is a chart decision rather than a bar variant.

- 2026-09-13 - Order statistics 4a-4e rebuilt on the library (4a first, then the rest in a second pass). Five draft additions, all inside c14 which is still being designed: `.sp-plot` (the frame a chart needs once it is read against a number - axis, gridlines, a dashed limit that names itself), `.sp-bars__stack` with `.sp-bars__seg` (one column split by category, using the legend's four keys), `.sp-bars__pair` (two bars per step), `.sp-bars--spark` (the same chart at a stat's size), `.sp-donut` with its hole, and `.sp-tip--panel` (c18: the chip holds one value, a chart step has several).
- 2026-09-13 - **One 5% scale for every measurement.** Bar heights, stack heights, segment shares, gauge fills, overages and markers now all read from the same set of rules, generated at 5% steps. Before this each page added the exact percentages it happened to need - statistics alone would have added about sixty. A chart value is rounded to the nearest step, which is invisible at these sizes and means no page ever adds a measurement rule again.
- 2026-09-13 - `.doc-frame` added to `styles/doc.css`: the window a screen is drawn in on a documentation page. Three pages had written their own; the radius, outline and clipped ground are documentation chrome, not product.

- 2026-09-13 - Navigation shell 9a-9h rebuilt on the library. No new components: the shell, rail, top bar and tab bar are c11, the palette is c24 exactly as drawn, the account menu is c9, the views rail is c22's light nav row, the editing rail is the line row (c15) with its handle and menu, and the rule tables are documentation chrome in `styles/pages/navigation-shell.css`. The 68px rail is `.sp-shell--collapsed` rather than a second sidebar, so the two greens and the divider come from the same rules the expanded sidebar uses. `.sp-nav-item__sub` and `.sp-nav-item__count--attention`, added for Home, carry the account block's address and the Missing receipt flag here too - the pair the 9e note names.

- 2026-09-13 - `.sp-nav-item__count--attention` added to c11 as draft: a sidebar count that is a backlog rather than a total - orders with no receipt - carries the in-progress tone on the number. Home's Missing receipt row uses it; the light nav row has its own ink for the same state.

- 2026-09-13 - `.sp-nav-item__sub` added to c11 as draft: the second line of the sidebar's account row. The count could not serve it - its `margin-left: auto` pushes itself to the end of whatever box holds it, which inside a stacked row is the right edge, so the address sat away from the name.

- 2026-09-13 - `text-decoration: none` added to `.sp-btn`, `.sp-list-item` and `a.sp-card`. Not a restyle: the nav item already stated it, and a component rendered as a link was picking up the browser's underline, which no render of it has ever shown. Nothing changes for the `<button>` form.

- 2026-09-13 - Home 10a rebuilt on the library. `.sp-card--shell` added as a draft c10 variant: the month panel Home opens with sits on the shell's own dark ground, and the variant states what its contents become - section label, meta, stat label, figure, caption and gauge - the way the viewer already does for its buttons. `.sp-stat__figure--positive` (c14 variant) for a figure that is money kept rather than money spent, and the chart's chosen column now carries its label as well as its bar. Everything else on the page was already in the library: shell and sidebar (c11), cards (c10), gauge (c10), marks as count badges (c2), attention rows (c23), the order table (c1), pills (c6), file drop (c4), bars (c14), sums and card footers (c21, c10). No new sizes, colours or spacing steps; the measurements are data values as before.

- 2026-09-13 - The reading stage's receipt preview (156×220) stays a page size in `styles/pages/order-create.css`, not a library one: it is one file shown alone on one screen, and the attachment tile's 104px remains the library's only file size. The image-size limit is unchanged at five.

- 2026-09-13 - Order create 3a-3c rebuilt on the library. Seven additions, all beside locked components and all draft: `.sp-spinner` (c13) for work of unknown length on a line of text, which the skeletons cannot express; `.sp-divider` (c27), the rule with one word in it that separates two ways of starting the same order; `.sp-alert--positive` (c19 variant) for the created-from-receipt notice, the positive tone the alert lacked; `.sp-field__help--positive` and `.sp-field__help--attention` (c3 variants) for the word beside a field's label saying how confidently it was read; `.sp-input--attention` (c3 variant) for a value that is usable but was read badly - amber, since red is reserved for a value that cannot be saved; `.sp-line--attention` (c15 variant), the same state on a line, stated after the checked fill so a ticked uncertain line still reads as uncertain; `.sp-list-item--primary` (c23 variant) for the recommended row of a set. One data value: `.sp-gauge__fill[data-fill="68"]`.
- 2026-09-13 - `.sp-source` added to c16 as draft: the file as the scanner read it, with the regions the fields came from drawn on it. The regions are static - one named rule per region, as a gauge fill or a bar height already is - so nothing computes a position from the markup. Order create 3a's review step is its only use so far. How live coordinates would reach it is still open; the two this example states are declared.

- 2026-09-10 - `.sp-nav-item--edited` added as a c22 variant: a saved view whose filters have changed since saving carries the amber tint itself, rather than a chip beside its name that would make one row taller than the others.
- 2026-09-10 - c1's card grid moved from viewport media queries to a container query on the list. The same grid sits beside a facet rail on one page and full width on another, so the window was never what it should have been measuring - the rule Order list 2i states for the table applies to the cards too. No change at any stated width.
- 2026-09-10 - `.sp-mark--plain` added as a c2 variant: a mark's box without its paint, so a list mixing coloured marks with bare glyphs keeps one text edge. Order list 2g's icon mapping needs it.
- 2026-09-10 - `.sp-bulkbar--note` added as a c12 variant: the second line of the bulk bar, stating what the page selection covers and offering to widen it to everything the filter matches. Order list 2h specifies it.
- 2026-09-10 - `.sp-card__footer--split` added as a c10 variant: a card footer holding two equal actions, as Order list 2g's Update view / Revert pair needs.
- 2026-10-05 - `.sp-tabbar--band`, new variant of the tab bar (brief 28): on a device with a home bar band the bar takes the band in and its items sit 12 (`--sp-12`) lower than centred. Padding-top `min(--sp-12, band)`, padding-bottom `max(0, band - --sp-12)`, band = the new token `--home-band` (`env(safe-area-inset-bottom, 0px)`). With no band both are 0, so every tab bar carries the class and looks as before. Components draws it with the band at 34. The + button is unchanged.
- 2026-10-05 - `.sp-stats--line`, new variant of the stats row: stats at their own widths in one row, labels on one line, figures on one baseline (subgrid). Used by Home's month card, which was a centred `sp-row-flex` and floated the smaller figures halfway down the large one. Existing stats unchanged.
- 2026-10-05 - No component changed appearance. Brief 26: Home's copy button reads "Copy an order" and opens the 3b dialog, as the create screen does; the label is "Copy an order" everywhere. HEIC is named nowhere. Phone Budget: no whole year, amounts typed in the month view, the month window full width (existing `.sp-touch .sp-window`), Edit in the bar, no bank check.
- 2026-10-05 - Brief 24: `.sp-bars__stack` is rounded at the top only, `var(--r-marker) var(--r-marker) 0 0`, the same as `.sp-bars__bar`. Was 6px on all four corners, so Stacked and Total drew different bars. Both stand square on the axis. The app can drop its `.sp-bars__stack` bottom-radius workaround. `styles/check.js` asserts the two radii match.
- 2026-10-05 - Pictures, Brief 23 (17a, 17e): square-256 is cut around the subject (the strongest colour, contrast and skin tones), not a centre crop. Applies to every square. wide-1080 is unchanged: the card band and bookmark strip crop it with cover, centred. 17a notes say the subject cut is a guess and is not yet tested on real product photos.
- 2026-10-05 - Pictures (17a, 17e, Icon legend, Order create 3a, Vendors 5b/5c): the original is never kept. Renditions are square-256 and wide-1080 for every picture (square-128 and view-2560 removed); an order's own picture adds one cleaned full-size copy for Download and zoom.
- 2026-10-05 - Name field in `.sp-nav-list` (naming a view, Rename): keeps its control height (42 desktop, 48 touch) but takes only the row's 40px in the list, overlapping the 6px gaps above and below by 1px (desktop) or 4px (touch). No row under it moves. Rule: `.sp-nav-list > .sp-field__wrap`.
- 2026-10-04 - Views card in edit mode keeps the at-rest row: `.sp-nav-item--light` in `.sp-nav-list`, the handle in `.sp-nav-item__icon`, the row menu in the count slot. It was `.sp-list-item` rows 8px apart, about 45px tall, so the card grew 43px on Edit. Markup only; no CSS change. Navigation shell 9e, Order list 2g.
- 2026-10-04 - c11 nav row: `--shell-item-pad` right inset is 12, was 8 (top, left and bottom stay 8). The icon is centred in its 24 slot, so the glyph reads about 13 in from the left; a count, switch or chevron at 8 sat closer to the right edge. Applies to every `.sp-nav-item`, dark sidebar and `--light` alike; the rail sets its own padding and is unchanged.
- 2026-10-04 - Sidebar foot: the divider sits above Settings, so Settings, Dark mode and the account read as one bottom-aligned block, in the expanded sidebar and the rail alike. Was between Settings and Dark mode on most pages. Markup order only; no CSS change. `styles/check.js` asserts it.
- 2026-10-04 - Sidebar "N more in Orders" row: takes `aria-current="page"` when the open view is one of the N; its text is white on the current fill (`.sp-nav-item[aria-current="page"] > .sp-nav-item__sub`). The list is always the first N views; no row is added for the open view. Navigation shell 9e.
- 2026-10-03 - c12 / c14: on touch, the order filters' Custom opens the c14 range sheet (one date range sheet for the whole app) instead of two native date fields. Inside the filter sheet its Apply sets the dates and returns; the filter sheet's Apply runs the filter. No markup or CSS change.
- 2026-10-03 - c3 DateField on iOS: the four date-family `.sp-input` types also take `display: flex; align-items: center`, because WebKit leaves the value at the top edge once `appearance: none` is set. WebKit only; check with the iPhone 15 profile.
- 2026-10-03 - c3 DateField on iOS: `.sp-input` date, time, month and datetime-local take `appearance: none`, `min-width: 0` and `-webkit-min-logical-width: 0`, and `::-webkit-date-and-time-value` takes `text-align: left; margin: 0`, so the field has the height of its neighbours, stays inside its column and left-aligns its value. A fix to WebKit's defaults; no other browser changes.
- 2026-10-03 - `.sp-bars--spark` is 56px tall, was 34px: the shortest bars read at about 15px. Each spark bar carries a hover readout (`.sp-tip--panel`, head and order count, no category rows), and the stat header ends with the step, "· by month" (4a).
- 2026-10-03 - From the app review: `--list-max` (420px) caps the combobox panel and the search body, which scroll inside. c1 ordering by hand gets its CSS: handle hover, `.sp-list-item--picked`, the carried row stacked above its neighbours, the touch handle (24px, 48px row, no callout) and no tilt under reduced motion; the lift shadow is `--shadow-menu`, as the CSS already had. A solid mark's ink is the higher APCA contrast of `--surface` and `--ink` on its fill: green-4 and ink-6 take `--ink` in light, green, green-3, green-4 and ink-6 in dark; `data-ink` carries the result for a picked colour. `.sp-toast-region` is a column so the update notice (6d) sits above a toast. The xsmall button no longer goes full width on touch or under 640px. Cards (2c) select the page from the summary line.
- 2026-10-03 - `.sp-btn--xsmall` and `.sp-icon-btn--xsmall` added as c6 variants: 22px, 6px padding, 12px type at 500, for the action in a rail section header (Order list Views and Filters). On touch they take the small button and row icon sizes. Button and IconButton take `size="xsmall"`.
- 2026-10-02 - `.sp-slot--start` added as a c17 variant: a slot that is a field of its own aligns to the start edge under its label. Bookmarks 22c and 22d use it.
- 2026-10-02 - `.sp-record__foot--single` added as a c1 variant: a foot with one line on each side (a bookmark's date and price) aligns on the baseline. The order card foot is unchanged. Bookmarks 22a uses it.
- 2026-09-10 - `.sp-record__photos--empty` added as a c1 variant: the card strip when an order has no item photos, drawn as the band with a glyph and the words rather than an empty panel. Order list 2c specifies it.
- 2026-09-10 - Mark tones added as a c2 variant: `.sp-mark--solid[data-swatch]` paints the mark in the record's own colour, using the c7 swatch list and no other value. Order list 2e shows category marks in the flyout; the same attribute already drives the picker's swatches.
- 2026-09-10 - c25 added: the popover panel the bulk bar opens, lifted from Order list 2a while that page was rebuilt on the library. A menu acts on click; this one holds the choice until Apply, so it is its own component rather than a Menu variant. `.sp-choice--row` added beside c5 at the same time: the padded, filled choice row the panel's lists are made of. Both draft until reviewed.
- 2026-09-07 - Date facet added to c12: the presets sit in the rail with the From / To pair opening in place beneath them, as Order list 2d specifies. Toast and tooltip added as c18, lifted from States and confirmations 6d.

- 2026-09-07 - c15 and c17 accepted and locked. The order item is now one geometry: 12px insets, the handle, photo, amount and actions centred in a row at rest, the editor top-aligned with the same 14px above its photo, its slot filling the column so both photos share a right edge, and every column derived from `--line-text-left` so a change to `--slot-line` moves everything together.

- 2026-09-07 - The image control simplified to one pattern and pulled out as its own component (c17): the frame is the input, clicking it chooses or replaces, ⌘V and drop do the same, and Remove is a text link under it. The camera button and its 208px menu are gone, so adding and editing differ only by that link. It is the same control for an item image, a receipt or an attachment.

- 2026-09-07 - DateField settled: desktop is our text field plus our one-month calendar, because the browser widget cannot match the fields around it and differs per browser; touch stays `type="date"`, because the platform sheet is better than anything we would draw. The range picker is ours on both, as a popover on desktop and an in-sheet expansion on touch.

- 2026-09-07 - c1 - c13 accepted and locked. c14 - c16 drawn from Order statistics, Order editing layouts 1a/1b and Images and files; awaiting review.
- 2026-09-07 - `--tile` 104px added to the image sizes for the attachment tile, which carries its filename beneath it as Order editing layouts 1a draws it. Five sizes now, not four.
- 2026-09-07 - The line editor extracted as its own component (`.sp-line-editor`), since the desktop expansion and the touch sheet are the same form. The drag handle corrected to the six-dot grip and the photo control to the camera button from Order editing layouts 1b.
- 2026-09-07 - Stepper folded to one implementation (the joined control from the order editor); the line's edit and remove folded onto `.sp-icon-btn--outline`. No locked component changed appearance.

## Deferred decision - a component that crosses another

Found while writing the React components. Left alone for now on purpose: fixing it
changes a locked component's appearance, so it is not a side effect of other work.
Its sibling - the attachment tile crossing the mark - was merged on 2026-09-17; see
the changelog.

### The card crosses the list row

`.sp-card--row` lays a card's own children in a line. `.sp-list-item--card` is a row
on a card ground. On screen they are the same object - a mark, a title stack, a
value, a chevron, inside a bordered white box - and the only real difference is
whether the thing repeats.

The boundary as the CSS draws it today: a **Card** is a surface that stands on the
page and can carry a footer of actions; a **Well** is a bordered box inside a
surface and never on the page ground; a **ListItem** is a row inside a surface that
repeats. One question decides which: does the thing stand on the page, sit inside a
surface, or repeat? Page then Card, inside then Well, repeats then ListItem.

Where that boundary is thin: a phone's list is a column of `Card --row`, and those
do repeat - so by the rule they should be list items on a card ground, which is the
variant the merge would produce. Either that variant exists and the phone list uses
it, or the rule needs a second clause: rows on the page ground are cards, rows
inside a container are list items.

React components r5 and r6 show both, which is why the crossing is visible there
first.

- 2026-09-17 - **The attachment tile folded into the mark.** `.sp-tile` was a second
  square image box, and four of its nine rules were the mark's already: the box, the
  dashed box that invites the first one, the glyph where there is no thumbnail, and
  the label naming what the image is. It is now `.sp-mark--xlarge`, a fourth mark
  size at the same 104px, with the mark's own fills and kind banner; `__remove` and
  `__open` became the mark's parts, and the token is `--mark-xlarge`. Four sizes now:
  24, 42, 64, 104. The corner-chip kind label is gone - there is one kind label, the
  banner across the foot. A document is taller than it is wide, so it left the scale
  as `.sp-page-thumb`. 97 uses converted across 7 pages; React `Tile` folded into
  `Mark`, and harness r11 into r2.
  Two appearance changes fall out of it, both deliberate: a mark drawn as a button
  now carries the focus ring every other control carries, which it had never had;
  and the attachment's no-thumbnail ground is the mark's `--none` rather than the
  tile's own. The attachment's radius stays the 9 the tile had rather than following
  the scale to 12 - that is a separate question, not settled here.

- 2026-09-18 - **The page thumbnail is gone.** `.sp-page-thumb` was a second image
  box for one case, a page of a multi-page PDF, and it was drawn in two places -
  neither of them the viewer rail it existed for. Both are now `.sp-mark--xlarge`:
  the failed scan in 6e takes `--none` with a file glyph, and the position row in
  the file table takes `--photo`. React `PageThumb` is removed with it. The cost
  is deliberate: a page of a document is now drawn at the same square as a photo of
  one, so the aspect no longer says which it is - the banner and the glyph do.

- 2026-09-18 - **The list footer's bottom gutter is 16.** It was
  `var(--sp-12) var(--sp-16)`, which put 16 right of Load more and 12 below it. Now
  `var(--sp-12) var(--sp-16) var(--sp-16)`: the top stays on the table's 12px row
  rhythm, so the footer still reads as one more row of it, and the bottom matches the
  sides, so the gaps right of and below the button are equal. The footer grows from
  66px to 70px. Reaches every list.

- 2026-09-18 - **Load more is the small button.** `sp-btn--small` on all 13 uses
  across three pages and on React `List`, so the footer's one control sits below the
  rows rather than matching the page's primary actions in height.

- 2026-09-18 - **A bar column reports the period it covers.** The columns were
  already buttons, but `onSelect` handed back only the column's key, so every call
  site had to map "aug" to a pair of dates itself. A column now carries `from` and
  `to` as ISO dates and `onSelect` reports `(key, from, to)` - the pair, in the
  order `RangePicker` uses. The drawn columns on Order statistics state the same
  period as `data-from` / `data-to` on the button. One end without the other, or a
  range that runs backwards, is reported.

- 2026-09-18 - **Only a clickable bar column reacts to the cursor.** `cursor: pointer`
  and the hover tint sat on `.sp-bars__col`, which a column renders as a `span` when
  it has no drill-in - so the spark inside a stat showed a hand and lit its bars for
  a click that does not exist. Both are now scoped to `button.sp-bars__col`.

- 2026-09-18 - **The hand only appears where a click does something.** Two defects,
  one rule. The bar column's hover was written `.sp-bars__col`, but `Bars` renders a
  span for a column with no `onSelect`, so the spark inside a stat lit up green and
  took a pointer for a click it does not have; the hover and the cursor are now
  `button.sp-bars__col`. And `.sp-table tbody tr:hover` handed a pointer to every
  table row, including the seven reference tables that are read rather than opened -
  the token map, the icon legend, the file position table, the two import previews and
  the two source/result mappings. Those take `.sp-table--static`, which drops both the
  lit row and the hand, the same opt-out `.sp-chip--static` uses. Record tables are
  unchanged: their rows do open an order. `check.js` asserts the opt-out keeps its
  inert hover.

- 2026-09-18 - **Dialog takes children, not props.** It was `title` as a string,
  the body as `children` and the buttons as an `actions` array, so the call read as a
  form to fill in and the page order was the component's to decide. It is now
  `DialogTitle`, `DialogBody` and `DialogActions` written as children, and the dialog
  reads which one is the action row - the same way `MenuItem` finds its submenu.
  Plain words handed straight to it are still the body. A dialog with no
  `DialogActions` is reported. The drawn markup and the stylesheet are unchanged;
  `Popover` still takes `head` / `summary` / `note` / `actions` as props and is the
  next one to do this to.

- 2026-09-18 - **Two renamed names were still being cited as live.** `--tile` was
  renamed `--mark-xlarge` when the attachment tile folded into the mark, but five
  notes still cited it and two of them still called the mark scale three sizes with
  the tile outside it; the scale is now written as the four sizes it is. And c27 cited
  `--page` for the sticky save bar, which is `--sticky` - `.sp-savebar--page` has
  been gone since the bar folded into the list row.

  `check.js` now asserts every `--x` a page names is either a property a stylesheet
  declares or a variant suffix a class carries. Three things the first version of that
  assertion got wrong, each of which hid an instance: it read only `<code>` spans, so
  the one bare-prose `--tile` passed; it matched raw CSS text including comments, so
  `--page` passed on the sentence recording its own removal; and it had no allowance
  for the two legitimate cases, a `--shell-*` family and a name a sentence puts in the
  past tense.

- 2026-09-18 - **Toast takes its undo as a child.** Same change as `Dialog`: the way
  back was an `undo` prop holding a `ToastUndo`, so the call read as a form and a page
  could hand it a plain link. It is now written after the message, where it sits in the
  row, and the toast finds it among its children. `icon` stays a name string - that is
  a name, not a part. `Popover` and `Alert` still take their parts as props.

- 2026-09-18 - **A playground for the library.** `Playground.dc.html`: a drawer of
  every export, a canvas they can be dropped and dragged around on, a panel for
  every prop, slot and child of whatever is selected, and the JSX for what is built.
  It evaluates the files in `react_handoff/` with the same loader the harness uses,
  so no component is redrawn there.

  Three things it decides rather than guesses. Prop metadata lives in
  `playground-registry.js`, read off the component signatures and the variant maps -
  a prop renamed in the library shows up as a control with no effect rather than as
  one that quietly lies. Whether a prop prints in the JSX is tested against that
  component's own signature default, not the registry's starting value, since `Mark`
  declares no default size and a call that omitted it would not reproduce the canvas.
  And nesting happens in the panel rather than by hit-testing the rendered output:
  a slot is a drop target beside its prop name, which is the only way to reach a slot
  on a component that draws nothing visible for it.

  `Selected` is the one export absent, since `List.jsx` and `DatePickers.jsx` both
  export one and a drawer cannot resolve that the way an import does.

- 2026-09-18 - **The text red is `--red-ink`, and the checker now says so.** The
  playground took `--red` for four pieces of text - the panel's Delete, the error
  boundary, the not-exported note, the load failure - which is the graphic red: a
  border, a status dot, a swatch, an icon glyph. At 11px on the panel's white it
  measures 2.83:1 against 6.70:1 for `--red-ink`, so it was both off-vocabulary and
  unreadable. `components.css` was already consistent about this on its own - nine
  text rules on `--red-ink`, `--red` only on `.sp-toast__icon` - so the rule existed
  and nothing enforced it. It is now an assertion, reading the stylesheets and the
  inline styles a tool page carries; a glyph keeps `--red` and says so in its name.

- 2026-09-18 - **One child is passed as itself, not as a list of one.** A control
  dropped into a `Field` rendered as nothing: the playground handed every set of
  children through as an array, and `Field` clones its child to bind the label, the
  message and the slot padding onto it - `cloneElement` on a one-item array has no
  element to clone. Any component that reaches for its child rather than just
  rendering it had the same problem.

- 2026-09-18 - **The canvas carries `.sp`.** The border-box reset in
  `components.css` is scoped to `.sp *`, and every mockup page wraps its content in
  that class. The playground did not, so `.sp-input` fell back to content-box and a
  field's input came out 57px wider than the field around it - padding and border
  added outside the width instead of inside. The canvas is now `class="sp"`, which is
  where components render; the tool's own chrome stays outside it.

- 2026-09-18 - **PeriodPicker drew nothing, and the registry was wrong three ways.**
  `presets` takes `{value, label}` objects and was seeded with bare strings, so five
  radios rendered with no value and no label - the empty control. `custom` holds the
  RangePicker and was typed as text rather than as a slot. And its children may only
  be a `Selected`, the one export the drawer leaves out, so it now offers no children
  rather than a target where every drop is reported. The presets are seeded with the
  library's own five, which both renders it and shows the shape.

- 2026-09-18 - **One search field, not two.** `ListSearch` was `SearchInput` inside
  `.sp-picker__search` and nothing else. The naming was the first defect: at a call
  site the two took the same props and rendered the same field, so a developer reading
  the export list had no way to choose between them - the name promised a list-only
  control that did not exist, since that box appears in top bars, dialogs, pickers and
  palettes too. The second defect was structural: `SearchInput` rendered
  `.sp-field__wrap` and `ListSearch` bolted `.sp-picker__search` around it, so React
  drew two nested boxes where all 64 drawn search fields draw one.

  `SearchInput` now renders that single box itself - lead, input, then the clear or
  the shortcut hint - which is the drawn markup exactly. No CSS changed: the base
  `.sp-field__trail` rule positions itself in any relative box, and the box is still
  the direct child each container's `>` selector sizes. `Trailed` stays for the
  password and the date field.

  Two follow-ups this turns up, neither done: `.sp-picker__search` is now a misleading
  class name, since it is every search field's box and not the picker's; and
  `.sp-field__wrap .sp-field__trail` centres the clear on tall touch fields, which the
  search field never got in the drawn pages and still does not.

- 2026-09-18 - **An audit of all 89 exports for duplication and naming, and four
  assertions so it holds.** Nothing consumes the library yet, so the renames are free
  now and would not be later. Five defects, all the same family as `ListSearch`:

  `List` redrew `.sp-list__footer` itself while `ListFooter` existed - the README's
  own "no component redraws another's markup" rule, broken in the component the rule
  was written for. It uses `ListFooter` now.

  `ShellTopbar` and `PhoneTopBar` rendered the same `.sp-topbar` and differed only in
  `touch` being hardcoded off in one - two names for one control, and even the casing
  disagreed. One `TopBar` with `touch`, in Shell.jsx.

  The sidebar's six exports were `ShellMenu*` while the rules they render are
  `.sp-sidebar*` and `.sp-nav-item`. Two vocabularies for one object means neither
  name finds the other. They are `Sidebar`, `SidebarBrand`, `SidebarGroup`,
  `SidebarGrip`, `SidebarDivider` and `NavItem`.

  `PhoneSaveBar` and `Phone.jsx` named a device, which promises one screen size and
  forbids the next, and never matched what the library switches on: `touch`, a prop
  and a class. They are `SaveBar` and `Touch.jsx`.

  The four assertions: one component per root class; a component's name and its class
  share a word (with `DialogTitle` on `.sp-heading` and `RangeSlider` on `.sp-track`
  named as deliberate reuse); no component is only an arrangement of other components;
  no component is named for a device.

  Still open, and a stylesheet decision rather than a component one:
  `.sp-phone`, `--phone-bar-h` and `--phone-gutter` still name the device, and
  `.sp-picker__search` is every search field's box rather than the picker's. Both are
  renames across the drawn pages, so they need your word first.

- 2026-09-18 - **`Choices` is `FieldGroup`, and the filter rail's groups are the
  same component.** Two defects behind one name. `Choices` named checkboxes and
  radios while nothing in it was choice-specific - it renders a legend over any set of
  controls, and the library already used it for a segmented control and a pair of
  bounds. And it could not be called `Fieldset` either: that names the tag it renders
  rather than the job it does, which is the same mistake as naming a component `Div`.

  The larger half: `.sp-fieldset` and `.sp-facet` were one rule written twice - same
  reset, same axis, same `--sp-8` gap, same `--t-12`/600/`--ink-2` legend - separated
  only by `min-width: 0` and a head carrying a count, neither of which is a second
  design. They are one `.sp-field-group`, and its parts came with it:
  `__head`, `__count`, `__more`, `__panel`. 79 markup sites across three pages.

  Settled by you, since it changes an established value: the gap is the field's
  `--sp-6`, not the group's old `--sp-8`, so a group and a field space their contents
  alike. The filter rail's values therefore sit 2px tighter than they did.

  `Field` stays separate. It labels one control and binds the label to it by id;
  a group takes a legend because a label can only point at one control. That is arity,
  not styling, and it is the one real difference between them.

  `.sp-facets` is untouched - the rail that holds the groups is a different object
  from a group. Still open: `Picker` renders `.sp-options` while `.sp-picker` is the
  container around it, so the component is named after the box and draws the grid.

- 2026-09-18 - **`Field` takes every control in the library.** It is what a
  `<label>` is in plain HTML, so a caller should not pick a different component per
  control. Three cases, and the control states which it is via `fieldRole`: a value
  takes a label bound by id, a box takes a label wrapping it (`Field` renders a
  `Choice`), a set takes a legend (`Field` renders a `FieldGroup`), since a label can
  only point at one control. The role lives on the control because that is what
  knows, and it keeps `Field` free of six imports and any load-order constraint.

  What the playground turned up while checking this, which is why it was built:
  `Field`'s central promise - the label bound to the control by a generated id - was
  kept by 5 of 14 controls. `Combobox`, `Stepper`, `TokensField` and `FileDrop`
  spread the id onto their root element rather than the focusable one, so `for`
  resolved to nothing and nothing reported it. Each now puts it on the element that
  takes focus. `RangeSlider` drew nothing at all inside a field: it takes a pair of
  bounds and the registry seeded a single number.

  Measured after the fix, all 14: Combobox to its trigger, Stepper to its value,
  TokensField to its add input, FileDrop to its file input, Check / Radio / Switch
  wrapping, Segmented / Picker / RangeSlider to a legend, and the five text fields
  unchanged.

- 2026-09-18 - **Five glyphs that were never a choice are the components' own.** The
  stepper rendered two blank buttons in the playground because `minus` and `plus`
  were required props. Checking the rest turned up four more of the same: the
  combobox's `chevron`, a chosen option's `check`, a token's `remove`, and the
  password field's `reveal` / `hide`. Every call site in the library passed the same
  glyph to each - `minus`, `plus`, `chevron-down`, `check`, `x`, `eye` - which is
  the proof none of them was a decision, and a caller who omitted one got no error.
  The rule was already written for the search field's lead and clear; it now holds
  for these too.

  Real slots kept: a `Card`'s and a `ListItem`'s chevron, a `Mark`'s remove, a
  `Field`'s lead, trail, kbd and chevron - each says something the page decides.

  The password field's two glyphs were both `eye` at every call site, so the control
  never changed appearance. It still does not: the register has no struck-through eye,
  and the button states its position through `aria-pressed` and its label. That gap
  is now visible rather than hidden behind two props that looked different.

- 2026-10-04 - `.sp-record__head--chips` added as a variant of the record card for bookmarks: the categories move from their own row into the head, right of the name, at most a third of the width. The first category shows as a chip and truncates; more show as a static "+N" chip. A bookmark with no category has no chip column. The order card is unchanged.

- 2026-10-04 - `.sp-record__head--chips` on touch: the acting chip keeps `--field-trail` and takes the touch height as a `::before` hit area, so it sits level with the "+N" label chip and the head is the same height with or without categories (Brief 15). The general touch rule for chips is unchanged elsewhere.

- 2026-10-04 - The bookmark head chip's touch area measured 46px, not 48: an absolute `::before` is placed from the padding box, inside the chip's 1px border. The inset now subtracts the border, so the area is exactly `--control-h-touch` tall and the chip's full width.

- 2026-10-04 - A card's menu (`.sp-record__menu .sp-menu`) is fixed at the menu's minimum width, 214px, and its item labels truncate on one line with an ellipsis. A bookmark's "Open at" a long domain wrapped over several lines. The menu component itself is unchanged.

- 2026-10-04 - c15 line editor: the open editor keeps the row's handle column when the list reorders, and the slot column is fixed at `--mark-medium` (Remove centres under it and may overhang). The slot had taken Remove's width, 46px, which put the photo 2px and the fields 4px right of the row's photo and title. Measured: photo and Item label now sit exactly on the row's photo and title.

- 2026-10-04 - c15 line editor: Line total is a read-only amount field, the same markup as Unit price (`sp-field__wrap`, `sp-input sp-input--unit sp-number`, `kr.` unit) with `readonly`, so it takes the established read-only input look. Its label is a `<label for>`. `.sp-line-editor__computed` (bold text with no box) is removed. Before an amount exists the field is empty.

- 2026-10-04 - c15 line editor, replacing the handle entry above: the open editor has no handle. Its photo slot is `calc(var(--box) + var(--sp-12) + var(--mark-medium))` square (70px), spanning the row's handle, gap and photo, so the fields start on the rows' title line. The sheet keeps `--mark-medium`.

- 2026-10-04 - c15 line editor: the sheet uses the same 70px photo slot as the desktop editor; the `--sheet` size override is removed.

- 2026-10-04 - Add row (`sp-list-item--add`): the hidden handle spacer is in the markup only when the rows above carry handles. Removed from the add rows in lists without handles (the phone order lists), where it pushed the + 28px right of the photos.

- 2026-10-04 - c15 line editor in the sheet: the field grid is two equal columns, `repeat(2, minmax(0, 1fr))`, instead of `132px 1fr`.

- 2026-10-04 - Narrow order list card (`sp-list-item--card`, Order list 420px column): two lines, not three. The reference and status line is removed; the card reads vendor and amount, then date and item count with the saving under the amount.

- 2026-10-04 - c15 plain line editor (Brief 16): an open row draws no grip. The handle column stays as an empty spacer when the list reorders. Budget 21d and the c15 specimen updated.

- 2026-10-04 - React: `Picker` keeps its name. It renders `.sp-options`, the options part of the picker; `styles/check.js` lists it as a named exception beside `DialogTitle` and `RangeSlider`.
- 2026-10-04 - Order list, narrow card: the saving is now the second line of the right column (the card is two lines); CLAUDE.md updated to say so.

- 2026-10-04 - Brief 17: `.sp-stats--fold` (four across at a row of 996px or more, two by two below; Statistics) and `.sp-touch .sp-stats` (two by two on a phone). `.sp-list-item__handle:empty` takes `cursor: auto`.

- 2026-10-04 - Record card, picked state: only the card's own 1px border turns green. The inner second pixel (inset shadow) is removed: the photo strip painted over it, so the card read as a thin edge beside the photos and a double one below.

- 2026-10-04 - Card grid (Brief 19): new token `--card-min-w: 280px`; `.sp-cards--fluid` reads it with `min(..., 100%)`. No maximum. Order list, Bookmarks and the phone Bookmarks frame use the fluid grid. The base four-across `.sp-cards` is unchanged.

- 2026-10-04 - Vendor image (Images and files 17e): no new component. On an order with no item photo it is drawn exactly as an item photo - `.sp-mark--photo` in rows, a `.sp-record__photo` in the card band - and faded: one state on each, `.sp-mark--faded` and `.sp-record__photo--faded`, `filter: opacity(var(--photo-fallback-opacity))` (new token, 0.6). Nothing else differs. `styles/check.js` asserts both states sit only on a photo.
- 2026-10-05 - Brief 25: `.sp-bars--spark .sp-bars__bar` is `border-radius: 2px 2px 0 0`, was 2px on all four corners, so every bar is rounded at the top only; the "bars share one shape" check covers it. A step still to come carries `data-future`: a spark bar at `data-h="0"`, a plot column as a span with its tick and no bar, and `.sp-bars--plot .sp-bars__col[data-future]` takes no hover band. Order statistics 4a draws all twelve months of the year.
- 2026-10-05 - `.sp-filedrop--row` added as a c4 variant: the mark at the left and the title and subtitle beside it (grid, 12px column gap, 2px row gap, left-aligned), for a card where the stacked drop is taller than it needs. Home Add an order uses it and no longer grows to fill the card.

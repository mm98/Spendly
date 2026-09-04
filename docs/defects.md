# Defects, and the rules they bought

`README.md` states the design system as rules. This file is where the evidence lives: the defect that
bought a rule, the numbers that settled it, and what was measured after the fix. Two documents, one
job each — a reader who wants to know *what the UI must do* should not have to read a case history to
find it, and a reader who wants to know *why a rule is not negotiable* should be able to find that
without it being folded into the spec.

**What belongs here.** The bug, in the state it happened. The measurement, with its units and its
denominator. The instrument, and the engine it ran in. What was checked and what was not.

**What belongs in the README.** The rule, in general terms, in the section that owns it — and a
pointer here when the rule looks arbitrary without its history.

**Neither document names an implementation.** A defect is described in the UI's own terms; the build
it was seen in is named only as part of the evidence, the same way the engine and the viewport are.
Anything true of one port and not of the product belongs in that port's own README.

**This is not a changelog.** Entries are keyed to the README section they defend, not to a date or a
release, and one entry may be edited by a later fix that sharpens the same rule. Nothing here records
that work happened; it records what is true and how that was established.

Entries are keyed to the README section they defend by name — Cards, Filtering — since the design
system is organized by named sections (Foundations, Components, Views, Patterns), not numbers.

---

## Spacing — the documented palette and the built one had drifted apart

The Spacing section listed six load-bearing values — 7, 12, 14, 16, 18, 20 — and closed with its own
test: grep the stylesheet, the top six carry the layout. The test was finally run, across every
`padding`, `margin` and `gap` declaration: **336 declarations drawing on 31 distinct px values**, and
the top of the tally read **12(×48), 10(×39), 6(×33), 8(×31), 14(×28), 4(×25)** — 7px, the palette's
first line, carried 6 uses, while 6px and 10px, which it never mentioned, carried 72 between them.
The palette was a claim about the stylesheet that the stylesheet did not make.

Under the tally sat the drift the palette could not prevent, because nothing shared a name:

- Three side-insets for one control height: the 28px chip at 11px, the status chip at 12px, the
  field unit at 10px.
- Two row families at `11px 0`, between the data row's 10px spec and the dense rows' 12px.
- 26px in four rules beside 24px, and 22px in two beside 20px.
- Icon-to-label gaps at 5, 6 and 7px across nine chip and button rules.
- The page gutter written as 24px in three chrome rules, each separately rewritten to 12px in the
  phone block — the breakpoint edited six rules to move one distance.

The fix is the section's current form: one scale (2–28, even steps past 8), named tokens for every
shared distance, breakpoint changes on the token rather than per rule. Equalizing the
near-neighbours moved about twenty declarations by 1–2px; the rest of the consolidation moved
nothing, and the walk is what says so. **Instrument:** an element walk over 15 routes at desktop
1440×900 and an iPhone 13 descriptor — 30 states, 7,970 elements, 13 spacing and geometry
properties per element, Blink (Chromium 141) only. The value-preserving pass diffed at **0
differences** outside an attributed floor (two order rows swapping list positions between
freshly-seeded accounts, present run-to-run on identical source); the equalization pass diffed as
exactly the predicted property changes — gap 9→8 on 110 field shells, 7→6 and 5→6 on 58 icon gaps,
row padding 11→12 on 44, chip insets to 11px on 40, 22→20 and 26→24 on 31 — plus their knock-on
geometry, with no other property moving. Gecko and WebKit unverified.

A second run with the same instrument swept what the first left: the shared 12px sites folded onto
the existing tokens (plus `--gap-block` and `--pad-bar-y`, value-preserving, every site read back at
its original computed value); then the gap ladder — the 10px control-row tier folded into
`--gap-row` (gap 10→12 on 105 element-states), the 14px and 16px tiers merged as `--gap-panel:16px`
(14→16 on 10), the two off-scale strays snapped (sidebar nav 13→14 on 75, brand 11→10 on 30), and
the last 11px verticals joined 12. The walk decomposed the delta to exactly those changes and their
knock-on geometry, 0 tag mismatches.

## Color — the rule said every color is a token, and 79 declarations disagreed

The Color section has always opened with the rule; the stylesheet under it carried **79 hex and
rgb() literals (36 distinct) outside the token block**. Two dozen `#fff`s alone meant two different
things — a card-tier fill in nine rules, a glyph on a dark or vivid fill in fifteen — which is
exactly the distinction a dark theme has to make and a literal cannot. Ten shadows and two
backdrops each wrote the same ink at their own alpha. Two rules wrote `#9AA39B` for an ink whose
token is `#9AA39D` — the same one-digit drift an earlier fix had already caught in a `var()`
fallback, now found twice more as the value itself.

The fix routes them through roles: `--text-inverse` against `--bg-card` for the whites,
`--shadow-ink` as a bare triplet so each shadow keeps its own alpha, status pairs (`--bg-warn` /
`--text-warn` / `--icon-warn`) shared by the chip and the note that mean the same thing, and named
fills for the sunken surfaces and tracks. 23 literal occurrences remain on purpose, in the two
classes the README now exempts: vendor and category colors (data, not design — the tag chips and
the line-item tile's default pair) and the near-identical families pending a collapse decision
(four border greys, two dark inks, three tile fills, a hover pair one digit from `--bg-row-hover`).

**Instrument:** the same 30-state element walk, reading computed color, background, border colors,
box-shadow, stroke, fill, background-image and outline per element — 7,970 elements, Blink only.
The before/after delta was the two `#9AA39B`→`#9AA39D` sites (24 field-changes, the declared drift
fix) and the fresh-account dataset noise, in both directions; no other computed color moved in any
state. Gecko and WebKit unverified.

## Cards — a note and the action under it

The question card's answered state — the green answer, then SEE THOSE ORDERS — drew the button **flush
against the note, 0px measured**. `.button.button-block` declares a 12px top margin of its own and
`.button.button-ghost` declares none, so the gap depended entirely on which variant the answer
happened to be followed by: the same pair on Orders / Overview stood correctly at 12 because the
button there was the block variant.

The fix sets the gap from the note (`.note + .button { margin-top: 12px }`), so the pair is 12px
whichever button follows it. The card that produced this measurement has since been removed from
both screens that drew it, so `.note + .button` matches **0 elements** across the app's fourteen
screens today; the rule stays because the pair is a shape the system allows, and the next screen to
use it should not have to rediscover which variant it picked. The block variant's own margin computes to the same 12 rather than to 24
— equal specificity, and the note rule is later in the file.

Measured after, in Blink 141.0.7390.37 at 1440x900: the four children of `.card-question` sit at
9.3 / 12 / 12, the ghost button's computed `margin-top` is 12px where it was 0, and the block pair on
Orders is 12. The rule matches no element in the prototype's own markup — its two notes are followed
by field rows — so none of the three committed screenshots moved: **0 differing pixels of
11,403,840**.

## Cards — the first row of a list sat lower than every row under it

Six card bodies in the app open directly onto a row. In each of them the first row sat further below
the card's hairline than the rows below it sit below their own, because two leading spaces were being
added on top of the row's own padding and neither knew about the other.

Measured on an `iPhone 15` descriptor at `deviceScaleFactor: 2`, hairline to the content below it —
the card's hairline for the first row, the row's own border for the next:

| list | first row, before | first row, after | every other row |
| --- | --- | --- | --- |
| Orders / Latest orders | **18** | 10 | 11 |
| All orders | **18** | 12 | 13 |
| Order detail / Items | **16** | 10 | 11 |
| Wishlist / Wishes | **18** | 12 | 13 |
| All vendors | **18** | 12 | 13 |
| All categories | **18** | 12 | 13 |

The 1px each row's column still carries is the border itself. Two sources, found separately: a card
body's own `padding-top`, and the 8px `margin-top` a list carries to hold itself off whatever sits
above it inside the body — which, where the list *is* the body or opens it, is nothing but the
hairline. The second source is why the worst of the six was the one list already exempt from the
first: it read 18 with its body padding already at 0.

Both are now stated as what they are. A body opening straight onto a row takes no top of its own, so
the row's padding is the whole gap — the row keeps that padding rather than the body keeping a
smaller one, because the row's padding is also the box its hover tint paints, and trimming it would
light an uneven band. The list's leading margin drops where it is the body or the first thing in it.

Measured after, in Blink 141.0.7390.37: every one of the six now sits within the hairline's own 1px
of its list's row spacing. Eleven screens rendered at 390px and at 1440px before and after — Home,
Vendors, Categories and Settings are **byte-identical**; the pages that moved lost exactly the space
removed, 6px per list and 16px on Orders, which draws two.

## Filtering — FILTERS starts closed, and the panel shows the filter

Two halves of one defect, and the first could not land before the second was true.

**The panel opened on arrival.** The argument for it was that a link could arrive carrying a filter
the closed panel would hide. Open, it is 8 fields and a segmented control standing between the search
field and the orders they filtered.

**The panel did not show the filter the list was under.** Every link into All orders arrives carrying
the filters it wants — a category tile, a vendor card, a chart legend row, the answer to the question
of the day — and what it names them by is ids, `category=groceries&vendor=bilka`. The chips read
*Vendor: Bilka* and
*Category: Groceries*, the results line read `Orders · 4 match`, and the panel's own Vendor and
Category comboboxes read **Any vendor** and **Any category**, because a combobox displays a name and
the URL holds none. Two controls describing one filter with one of them saying it was off — and the
field is the one a user edits, so the next APPLY was liable to be made from what the panel claimed
rather than from what the list was. Every other filter (kind, from/to, min/max, status) is its own
value in the query string and needed no lookup, which is why only these two were wrong.

Both fields now resolve their id through the same lookup the chips use, so a chip and a field cannot
name one filter differently.

Measured after, in Blink 141.0.7390.37 at 1440x900, arriving at All orders with
`category=groceries&vendor=bilka` on it (in the React port, which is where the two comboboxes are
driven from data — the prototype's are static markup and were set to match):

| | on arrival | after one click on FILTERS |
| --- | --- | --- |
| `aria-expanded` | `false` | `true` |
| panel | `hidden`, computes `display: none` | `display: grid` |
| Vendor field | — | `Bilka` (read empty before) |
| Category field | — | `Groceries` (read empty before) |
| Kind / From / To / Status | — | empty, `Any` — as the URL has them |

The chip row states both filters in both states, over `Orders · 4 match`. No console or page errors.
Gecko and WebKit are not installed in this container and were not checked.

`docs/all-orders.png` is the panel showing, which is now the state reached by clicking FILTERS rather
than the state the page loads in. Rendered that way it reproduces the committed file at **0 differing
pixels of 5,184,000**, so the screenshot still documents what it claims and needed no regenerating.

---

## Responsive Layout — the sort control took a row of its own, and hung off the end of it

All Orders' toolbar holds three controls: the search field, the FILTERS disclosure and the sort. On a
phone the search takes the first row, which is what the layout intends, and the other two took **one
row each** — 134px of toolbar where two rows are 86px, with the first order row 48px further down the
page for it.

The sort control was the reason, and its width was never ours. `flex: none` left it sized by its own
content, and the content is an input: **298px** of intrinsic width on a fine pointer, **366px** once
the coarse-pointer rule computes that text at 16px. 366px is what decided where the flex line broke,
on a **328px** row — so it wrapped to a third row and then hung **38px** off the right edge of the
card. It reproduced at every phone width: 40px of overhang at 320.

Two instruments were pointed at that and reported nothing. The overflow test the README states —
`scrollWidth` against `clientWidth` — read **0** through all of it, because `.main-panel` sets
`overflow: hidden` and clips the overhang before it can widen the document. And the prototype's own
render was innocent: where an app draws the real combobox, the prototype draws an inert chip, and the
chip is **157px** — narrow enough to sit beside FILTERS by luck, so the prototype showed the intended
two-row layout while the same stylesheet shipped three.

The same declaration was worse between 780 and 701, where the toolbar is still `nowrap`: refusing to
shrink, the sort pushed the search field down to **28px** — its border and padding, with zero width
left for the text — and still overhung by **35.7px** at 760 and **94.7px** at 701.

The fix names the slot (`.toolbar-sort`) and states its width there, so the geometry is written once
for the slot rather than twice for whatever fills it. `flex: 0 1 auto` off the phone, so the control
gives width back instead of overhanging; `flex: 1 1 0` on the phone, so it takes what FILTERS leaves
and its own content cannot decide the line break. The chevron gets `margin-left: auto`, the same
declaration a field shell uses, so a stretched slot keeps it on the right edge.

Measured after, in Blink 141.0.7390.37, `devices['iPhone 13']` at `deviceScaleFactor: 2` — the
descriptor rather than a 390px window, since `pointer: coarse` is what the rules above key off:

| | before | after |
| --- | --- | --- |
| toolbar rows | 3 | 2 |
| toolbar height | 134px | 86px |
| sort control | 366px, 38px past the card | 190.3px, 0 past |
| gap to FILTERS | — (next row) | 10px, the row's own gap |
| 320px wide | 40px of overhang | 0 |
| 760px wide | 35.7px of overhang | 0 |
| 701px wide | 94.7px of overhang | 0 |

The prototype and an app's real control now render that toolbar identically, at 190.3 x 38 for the
slot in both. Every corner and centre of all three controls hit-tests to itself under the
coarse-pointer transforms. Driven through its states, the sort still opens on tap, its panel is 190.3
x 244 with all five options unclipped and 18px inside the card, and choosing one writes the sort to
the URL.

Desktop is untouched, which is the claim a walk can settle: **55,348 element records** across 15
states at two breakpoints, run twice against the unchanged file first at **0 differences** so the
floor was known to be zero. Against the fix: 0 elements added, 0 removed, 0 tag mismatches, 0 text
differences, **6 moved rectangles** and **60 moved computed-style fields**, every one of them the sort
chip, its chevron and the chevron's path. The 30 `flex` changes are the same one element read in all
30 states, since every page is in the DOM whether or not it is on; the 28 `margin` changes are
`margin-left: auto` reported unresolved where the chip is not rendered, resolving to `0px` — no change
— in the two desktop states where it is.

All three committed screenshots reproduce at **0 differing pixels** after the fix, each rendered in
the state it holds: 5,184,000 for `home.png` and `all-orders.png`, 1,035,840 for `phone.png`. The one
state that moves — All orders at phone width — has no committed shot; before against after there is
**868 differing pixels of 1,035,840**, all inside the chip's own box.

Not fixed, and not this rule's business: between 780 and 701 the search field still computes to 28px
of padding with no room for text. That band was crushed before the sort control was made to shrink
and it is crushed after; unpicking it means deciding when a toolbar wraps at desktop widths, which is
a new arrangement and needs its own argument.

Gecko and WebKit are not installed in this container and were not checked. The phone arrangement no
longer depends on an engine's intrinsic-width arithmetic — a flex-basis of 0 is what removes it from
the question — but the sort control's resting width off the phone is still that number, and 298px is
Blink's.

## Responsive Layout — the order forms scrolled sideways into blank space

Edit order's document was **2097px wide in a 1440px window** — a horizontal scrollbar with nothing
visible in the extra 657px. It reproduced at every width tried, always by the same margin arithmetic:
**2309 against 1600**, **456 against 390**. The element behind it was the item editor's hidden file
input, the Photo field on Edit order and on New order's items step, measuring **1440x1 at left 657**
— the width of the viewport, starting from its static position in the middle of the form.

The defect is two rules fighting over one property. `.field-shell > input` declares `width:100%` for
the text inputs a shell presents; `.field-file-input` declares `width:1px` (with `position:absolute`,
`opacity:0` and the rest of the visually-hidden recipe) for the file input something else opens. Inside
a shell both match, and class-plus-type (0,1,1) outweighs a lone class (0,1,0) — so the input kept
`absolute` and `1px` tall, uncontested, and took `100%` wide from the rule it was supposed to lose to.
An absolute box in an all-static ancestry resolves that 100% against the viewport, from wherever its
static position left it — which is mid-form, so its right edge lands one viewport-width past mid-form,
off screen at every window size there is.

The rule was born scoped — `.field-shell > .field-file-input`, (0,2,0), which wins that fight — and
was widened to the bare class when inputs outside shells (the scan page's drop bar, the attachments
card) needed the same hiding. The widening kept the reach and resigned the rank, and the comment
beside the rule went on describing the scoped selector as the reason this could not happen. Nothing
renders a comment.

The fix is a selector list, `.field-file-input, .field-shell > .field-file-input`: the bare class for
the sites with no competing rule, the scoped form to outrank `.field-shell > input` where there is
one. Same declarations either way.

Measured after, in Blink 141.0.7390.37 under the Playwright 1.56.1 bundle: Edit order at 1600, 1440,
1100, 800, 700 and 390 — `scrollWidth` equals `clientWidth` at all six, the input at **1x1**, and the
shell still rendering "Choose a photo...". New order driven through step 1 to the items step: 1x1,
no overflow. The three `.field-file-input` sites outside a shell were 1x1 before and after. This is
cascade arithmetic and holds in any engine; Gecko and WebKit are not installed here and were not run.

Unlike the sort control above, this one is the case the README's stated test does catch: the box is
absolute, so no ancestor's `overflow:hidden` clips it, and the document really is wider than the
window. `scrollWidth` against `clientWidth` read it at every width, on the first run.

## Responsive Layout — the Statistics summary card stayed 376px past the width it was measured at

A design reference for the card's layout carried its own caption: "376 px wide." Built as
`grid-template-columns: 376px 1fr`, that is exactly what it measured at the window the reference was
made at and everywhere past it too — **379px at 1440px wide, still 379px at 1800px, still 379px at
2200px** — while the KPI grid beside it, on `1fr`, took every pixel the window gained. Every other
multi-column split on the page (`.two-column`, the app's own content grid) is written in fractions and
grows with the window; this was the one column that did not, and it read as correct at 1440px, which
is where it happened to be checked.

The reference's number was a measurement of a rendered fraction, not a value to build from — a
caption stating what one instance of a proportional split came out to, mistaken for a caption stating
a fixed spec. Fixed to `minmax(320px, 1fr) 2fr`: the KPI grid's `2fr` against the card's `1fr` holds
an exact third from the width the floor stops binding. **Instrument:** Playwright, Blink 141.0.7390.37,
`.stats-hero`'s own `getBoundingClientRect().width` read across six viewports on one page load. Before
the fix, 320px from 901px to 1200px (the floor), then flat at 376–379px through 2200px. After: 320px
through 1200px, then **379px at 1440, 499px at 1800, 628px at 2200** — a ratio of hero to (hero + KPI
grid) width of exactly 0.333 at every width from 1440px up.

## Chrome — the bottom bar sat in the corner of a rounded screen, and the sheet ran under it

Reported from an iPhone: the bottom bar is too slim and too close to the bottom of the screen. The
reason is the shape of the screen. From the iPhone 15 on it is a rounded rectangle of roughly 55pt
radius, and the bar's five destinations run the full width — so the two on the ends, Home and
Statistics, are the ones the corner has already curved in under. The bar left **10px** under the row,
which puts the last label **5.2px** clear of the arc at the right corner and the first **10.9px** clear
at the left. Nothing was clipped. It read as a strip pinned to the edge because that is what it was.

The bar is 80px now, against 67.8px, with 20px under the row and 12px in from the sides. The extra
height is padding: the item keeps the 48px entry tier, so this is the same control sitting further up.

**The second half of it was a number written twice.** The bar adds the home-indicator inset to its own
bottom padding, so the bar grows on a device that has one — 67.8px to **101.8px** — while the sheet's
bottom padding, which is what keeps the last card from scrolling under the bar, was the constant
**76px**. On Home and Vendors, the two pages whose content ends near the fold, the sheet finished
**12px and 11.3px underneath the bar**. Both numbers now come from one value: the bar's height is
declared once and the sheet clears it by one 12px phone gutter.

Measured in Blink 141.0.7390.37, `devices['iPhone 13']` at `deviceScaleFactor: 2`, driving the app
rather than a static render — the descriptor rather than a 390px window, since `pointer: coarse` is
what the rules key off. Clearance is read at the end of the scroll on each of the five destinations,
which is the only place the sheet meets the bar:

| | before | after |
| --- | --- | --- |
| bar height | 67.8px | 80px |
| bar padding | 8 / 10 / 10 / 10 | 10 / 12 / 20 / 12 |
| row above the bottom edge | 16.8px | 26.9px |
| clear of the 55pt corner arc, left end | 10.9px | 21.8px |
| clear of the 55pt corner arc, right end | 5.2px | 16.5px |
| sheet's bottom padding | 76px, a constant | 92px, the bar plus one gutter |
| sheet clears the bar (Home / Vendors) | 22 / 22.6px | 25.7 / 26.4px |
| with a 34px home indicator | **-12 / -11.3px** | 25.7 / 26.4px |
| with a 34px home indicator, bar | 101.8px | 114px |
| horizontal overflow, 320–700px | 0 | 0 |

No engine here reports a safe-area inset — `env(safe-area-inset-*)` computes to 0 in Blink, Gecko and
WebKit on a desktop machine, device descriptor or not — so the whole inset half of this defect is
invisible to every instrument in this repo unless the value is forced. That is why each inset is now
named: overriding the variable is what renders the branch, and the two rows of the table above that
carry a 34px indicator are that override, not a phone.

Not fixed, and measured: at **320px** the widest label, *Categories* at 59px, is **1.4px** wider than
its column, against 0.6px before — the two extra pixels of side padding. The labels are centred and
the columns are 2px apart, so the bleed is 0.7px a side into that gap; nothing collides and nothing
clips. Below 375px the five-across bar is at its limit, and buying the last pixel back means a
narrower phone arrangement, which is a new layout and needs its own argument.

Gecko and WebKit are not installed in this container and were not checked. The change is padding on a
flex row and a custom property in a `calc()`, neither of which is engine-shaped — but that is an
argument, not a render.

## Chrome — the top bar grew a second row rather than shortening the name on it

The phone top bar carries a back arrow, the page name, SCAN, NEW and the gear, and it was set to
wrap. Nothing shrank, so on any page whose name did not fit beside the four controls the whole action
group dropped to a line of its own and the bar went from **57px to 101px** — 44px of a phone screen
spent so that a thirteen-letter name could be printed whole.

Which pages it hit was a function of width, and at `iPhone 15` it hit most of them: *Order details*,
*New category* and *Review scan* all wrapped at 390px; *Edit order*, four letters shorter, did not.

What the row leaves the name is fixed arithmetic — the gutter (24), the back arrow (32), the action
group (220.09) and two 12px gaps come to **300.09px**, so the name gets *width − 300.09*: **89.91px**
at 390, 74.91 at 375, 19.91 at 320. The name now takes that space and cuts what does not fit, and the
row wraps only when the remainder falls under a floor of 80px, which is where the boundary sits:
swept a pixel at a time, **379px wraps and 381px does not**.

80px is what eight letters and an ellipsis measure in the title's own face — 700 16px Poppins puts
*Order de…* at 84.56, *New cate…* at 89.56, *Review s…* at 82.56 — so under the floor the row is
genuinely too narrow to name a page beside four controls, and wrapping is the honest answer there.
Above it, at 390, the name shows 81% of *Order details*, 77% of *New category*, 87% of *Review scan*.
The name is cut in the rendering only; the whole string stays in the markup and is still announced.

Measured after, in Blink 141.0.7390.37, swept at 320 · 360 · 375 · 379 · 381 · 390 · 393 · 414 · 430 ·
699: the bar is **57px at every width at or above the floor** and `documentElement.scrollWidth`
never exceeds `clientWidth` at any of them, before or after. Nine screens rendered at phone and
desktop size: only the two that were wrapping moved, each **exactly 44px shorter**; the other seven
and every desktop render are **byte-identical**. The rule reaches nothing above the phone
breakpoint — the name's computed `flex-basis` is `auto` at 701px and `80px` at 700.

## Chrome — the bottom bar landed on the save button of an open line

Reported from a phone: with a line of an order open for correction, the bottom bar conflicts with the
card. It does, and the card is the one surface on a phone that cannot afford it — the bar is fixed
chrome across the foot of the screen and the bottom of the card is its SAVE LINE / CANCEL / delete
row, so the two want the same 65px.

At rest the card fitted, by a margin small enough to be an accident. Editing line 3 of a 5-line order
on an iPhone 13, the card is **449px** in **596px** of room above the bar, clearing it by **11px** —
and it clears by exactly that because it scrolls itself there: `scroll-margin-bottom` on the card is
the bar's own height plus one gutter, applied by the `scrollIntoView` that runs when the card opens.
That is a one-shot. Nothing reapplies it, so it is a guarantee about the moment the card opens and
about nothing after it.

**What happens after it is the card growing.** Blank the quantity and press SAVE LINE: the field is
marked, *How many did you buy?* is drawn under it, and the card goes from 449px to **490px** — 31px
of it now under the bar, with **all three** action buttons underneath, the deepest cut **16px** into
a 44px button. The card grows precisely when the reader has been refused and needs the save button
most, and there is no scroll that recovers it, because the bar is fixed and moves with the viewport.
The same on the two other phone sizes:

| before | iPhone 13 390x664 | iPhone SE 320x568 | Pixel 5 393x727 |
| --- | --- | --- | --- |
| card at rest | 449px | 449px | 449px |
| clears the bar by | 11px | 12px | 11px |
| card once the quantity is rejected | 490px | 490px | 490px |
| under the bar | **-31px** | **-30px** | **-31px** |
| of the card covered | 9,056px<sup>2</sup> | 6,819px<sup>2</sup> | 9,148px<sup>2</sup> |
| action buttons covered | **3 of 3** | **3 of 3** | **3 of 3** |
| deepest cut into a 44px button | 16px | 15px | 16px |

The bar is withdrawn while a line is open now, and every one of those cells is 0 — on all three
sizes, at rest and after the rejection. The card is not made to fit under the bar, because the row
above shows what that answer is worth: a clearance applied once cannot hold a card whose height the
reader controls. What the bar's height was reserving is withdrawn with it, from one value rather
than three: the sheet's bottom padding goes **79px to 12px** while a line is open and back to 79px
when it closes, and the same value is what the card scrolls itself clear by (which is why its bottom
lands 12px above the fold on each of the three, instead of 79px above a bar that is not drawn).

**Both editors, both hosts.** The same card is New order's step 2 and Edit order's items card, and
Scan review has a line editor of its own — one line of a receipt, opened for correction in the list
it was read into. It is the same surface with the same row at the bottom of it, so the rule names
both rather than the one that was reported.

**The inset half is forced, as ever.** With `--safe-bottom` driven to 34px — no engine here reports
a safe-area inset, so this branch renders nowhere unless the variable is overridden — the sheet's
padding reads **113px** with the bar and **46px** without it, and the bar is still gone: the clearance
that is withdrawn is the bar and its gap, never the platform's own strip, which is reserved either way.

Measured in Blink 141.0.7390.37, `devices['iPhone 13' | 'iPhone SE' | 'Pixel 5']` at
`deviceScaleFactor: 2`, en-GB / Europe/Copenhagen, demo fill `{seed: 1, months: 2, orders: 30}` —
the descriptors rather than narrow windows, since `pointer: coarse` is what the phone's own field
rules key off. 13 assertions over four surfaces: Edit order (closed, open, grown by a rejection,
closed again, and the add card), New order step 2, Scan review, and a 1440x900 desktop, where the
sidebar reads `display:flex` and the sheet 0px of bottom padding with a card open and without one —
the rule lives in the phone block and must not reach the rail. Horizontal overflow 0 in every state.

Gecko and WebKit are not installed in this container and were not checked. The change is a
`display` and a custom property inside the existing phone media query, and the selector that carries
it -- `:has()` -- is the one already in this stylesheet; neither is engine-shaped, but that is an
argument, not a render.

## Charts — the callout was drawn permanently, across the line it annotates

The hero chart's callout — *Quiet week so far. Biggest day was the 23rd: 4.298,00 kr. at Proshop.* —
had no resting state. It was drawn at all times, **264x53 at (660, 299)**, over the middle third of a
130px line that starts at y 283. It is shaped like a tooltip, it carries a tooltip's shadow, and it
sat on the data with no way to put it away.

It is a tooltip now: `visibility:hidden` at rest, `visibility:visible` while `.chart-wrap` is hovered
or holds focus. The bubble lives inside the wrapper, so walking the pointer off the line and onto the
bubble keeps it up rather than dismissing it under the pointer.

**visibility, not display, and the phone rule is the reason.** The callout is off under a coarse
pointer (`display:none` at `max-width:700px`), and a reveal written on `display` would have specificity
(0,2,0) against that rule's (0,1,0) — it would have won inside the media query and handed the callout
back to any touch browser that fakes a hover on tap. Measured under `devices['iPhone 13']`: after a tap
on the chart the callout computes `visibility: visible` and `display: none`. The emulated hover is
real; it is the property it lands on that makes it harmless.

**The chart pays for being the trigger.** It takes `tabindex="0"` — the **37th** tab stop on Home, and
1 of the 3 charts on the page; the two rail charts are untouched — and carries the sentence as
`aria-describedby`, since a bubble that is not drawn is out of the accessibility tree and would take
its content with it.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, at 1440x900 `deviceScaleFactor: 2`, driving
the app at `localhost:5173` and the prototype as a file, each state entered rather than simulated —
the pointer aimed at a point on the line the bubble does not cover, then walked onto the bubble:

| state | app | prototype |
| --- | --- | --- |
| at rest | `hidden` | `hidden` |
| pointer on the chart | `visible` | `visible` |
| pointer on the bubble itself | `visible` | `visible` |
| pointer away | `hidden` | `hidden` |
| chart focused | `visible` | `visible` |
| focus lost | `hidden` | `hidden` |

The bubble's box is `[660, 299, 264, 53]` in every one of those states, in both files — the reveal
moves no geometry, which is what says the two are one mechanism rather than two that agree today.

Read from the engine's own accessibility tree over CDP, not inferred from the attribute being present:
the chart is `role=image`, name *Daily spend through July*, description *Quiet week so far…* — **in
both states**. The callout node itself is `role=tooltip` and in the tree while shown, and `ignored`
while hidden, so nothing reads a bubble nobody asked for as page content.

Selector match counts on Home: `.chart-wrap` 1, `.chart-callout` 1, tabbable charts 1 of 3. On Orders,
Vendors, Categories and Statistics — each reached by clicking the sidebar and reading the page title
back — `.chart-callout` 0 and tabbable charts 0.

In pixels, before against after on one machine: **87,131 differing of 5,184,000**, bounded by
(631, 283)–(952, 395) in CSS pixels — the bubble and the spread of its shadow, and nothing else on the
page. Identical to the pixel in both files: the app's diff box and the prototype's are the same box and
the same count. The changed app **hovered** against the unchanged app at rest is **0 of 5,184,000** —
asked for, the tooltip draws exactly what used to be drawn permanently, so this change removes nothing
but the permanence. On the phone, **0 of 1,035,840** against `docs/phone.png`: the callout was already
off there.

`docs/home.png` was regenerated, in this container, from the prototype. It is the one committed shot
that holds the callout, and this container reproduces the pre-change file at **0 of 5,184,000**, so the
regeneration carries the 87,131-pixel edit and nothing else — confirmed by diffing the new file against
the old. (The app renders the same page at 55,595 of 5,184,000 against that shot, in the donut, the bar
chart and the figures that follow today's date, so the app is not what these desktop shots are rendered
from. 55,595 + 87,131 = 142,726, which is what the changed app scores against the old file: the change
accounts for the whole of the difference and none of the drift.) `docs/phone.png` and
`docs/all-orders.png` hold no callout and were not touched.

Gecko and WebKit are not installed in this container and were not checked. Two things here are worth a
run if one is ever spent: `tabindex` on an `<svg>` is the kind of thing engines have disagreed about,
and `:focus-within` on that wrapper is only as good as the focus it observes.

**Not fixed, and deliberate:** Escape does not dismiss the tooltip while the pointer rests on the
chart. Moving the pointer off it does, and the keyboard's own dismissal is Tab. Closing that gap means
state and a document-level key listener in both files, duplicated, for a bubble that a 1px pointer move
already puts away — the shared stylesheet is what keeps the app and the prototype honest with each
other here, and it cannot hold an Escape key.

---

## Statistics — the range chips drew a week and the pager went on stepping months

The page offered five widths — 1W, 1M, 3M, YTD, ALL — and one step. Whichever chip was on, the arrows
walked the same three month records: **3 stops, always**, so selecting 1W drew seven days and then paged
a month past them. Neither control was broken on its own. The chips changed the chart every time; the
arrows moved the month every time; they disagreed only about what "the period on screen" was, and
nothing that renders one control at a time could see it.

Underneath, only the chart moved at all. Everything else on the page was the month's whatever the chips
said, and unlabelled: with 1W selected the heading said one thing and **24.418,57 kr.**, 23 orders,
34% on weekends and a projection for July sat under it as if they were the week's. And the three long
chips did not reach past one month either — 3M, YTD and ALL bucketed **the one month already on
screen** (31 days on July) into 13, 12 and 6 points, which is a resolution control wearing the names of
three spans.

### The window is the unit now

Every width is a **calendar unit** now, and the pager steps it: **14 windows at Week**, **3 at
Month**, **2 at Quarter** (Q3 and Q2), **1 at Year** (the year 2026) and **1 at All**. A width that was a
count of days back from today had nothing to page to and nothing to be called — 3M, YTD and ALL all
landed on the same 92 days and differed only in how coarsely they were drawn. Paging left from *Week 30*
reaches *Week 29* and keeps going into June, which no month pager could reach; paging left from *Q3* reaches
*Q2*. The arrows name their own step: *Previous week*, *No later month*, *Previous quarter*, *No earlier
year*.

A unit is drawn as its own name and the days it covers are printed over the chart: **Week 30, 2026** ·
**July 2026** · **Quarter 2, 2026** · **2026** · **All time**, above *Overview · 20–26 July*, *· July*, *· 1
May – 30 June*, *· 1 May – 31 July*, *· all time*. The unit alone cannot say that, and two of the five
windows in this store are clipped by where the records stop: **Q3 is July on its own** and **2026 is
three months of it**.

The weeks are **ISO weeks**: Monday to Sunday, numbered so that week 1 holds 4 January. Chunking each
month into sevens from its own 1st was the first version of this and it named a stretch of time no
calendar agrees with: the store starts on **Friday 1 May**, which is the tail of week 18 and the head of
nothing. **12 of the 14** windows are whole weeks, each running Monday to Sunday — asserted on the
weekday of both ends, not on the arithmetic that produced them — and the two clipped ones are where the
records stop: week 18 holds *1–3 May*, week 31 holds *27–31 July*. One week, 27, spans two months (*29
June – 5 July*), and the cards beside it read the month most of its days fall in, which for a whole week
is the month holding its Thursday — the rule ISO itself uses to place a week in a year. Every wider
window takes the month it ends in, which is the month a reader paging into it has just arrived at.

**A window is measured against the calendar unit before it** — July against June, Q3 against Q2 — except
a week, which is measured against the same number of days immediately before it. The week is the
exception because a week can be clipped to a few days and the window before it is a whole one: **five
days against seven** is a delta about the calendar rather than about the spending. So week 19, whole,
with only three days behind it in the store, carries no comparison at all.

**W30, 2026 is a letter, a number and a year, and nothing in it says week**, so at this point the
unabbreviated name was what the heading announced while the drawn one stayed short enough for the band:
`Week 30, 2026` read back, *W30, 2026* drawn, and the same for the quarters. That pair is gone — the
unit is written out in the one drawn name now, and the numbers are under [the chips named
durations](#statistics--the-chips-named-durations-and-the-windows-were-calendar-units).

**Changing the width never walks the reader off the month the cards were showing.** Each window stands
on the newest day belonging to the month it is filed under, and that day is what the new width resolves
against: asserted over all **21** windows, Month from any of them lands on the month that window's own
cards named. Driven in the browser: from a week of June, Quarter is **Q2** — the quarter June is in — not the
quarter the page opened on.

The figures follow the window because they are derived from one series rather than authored beside it.
A month's cumulative curve and its total are the only records the store keeps, so a day's spend is the
step that curve takes down from the day before, scaled so the steps sum to the month's own total. Then
the days of July sum to **24.418,57** exactly — the same figure Home prints — the five weeks of July sum
to it too, and the total above any chart is where that chart's line ends. The deltas fall out of the
same arithmetic and land on the strings that were authored by hand: **18% up vs June**, **12% up vs
May**, **15% up vs April**, each derived, each identical to the text it replaced.

Two things the derivation changed on sight. The dashed comparison line was authored per month, and it
disagreed with the store's own totals: June was drawn ending at **86** on July's chart against July's
**20**, from a start both shared at **180** — which reads as June being **58%** of July, when the two
totals the same page prints make it **85%**. Derived, both lines are
on one scale and the gap the chip claims is the gap the eye sees. And a delta can now point down —
*50% down vs 24–30 June* on the first week of July — so the chip drops the amber for those, which is
the split the KPI tiles already make between trend and tone.

**The four tiles follow the window too**, because all four are derivable from the same days: the
month's order count spread over its days by what each day cost (whole orders, largest remainder, so the
days land on the month's own count), and saved and shipping in proportion. That is what lets the
heading over them name the window — **WEEK 30, 2026 IN NUMBERS**, **QUARTER 2, 2026 IN NUMBERS** — instead of a
month the window may be one week of. Deriving them loses nothing: **all 8 tiles of July and June come
back exactly as authored**, values, delta sentences, trend arrows, tones and notes — *23* · *1.062 kr.*
· *2.106 kr.* · *388 kr.*, *21% up vs June*, *2% down vs June*, *June: 1.088 kr.*, *1,6% of spend*. May
is the exception and keeps its authored row, since April is a total in its record and not a curve.

Two readings the derivation surfaced, both of which the authored data could never produce. **Nothing is
a direction**: four orders against four orders read *0% up* under a rising arrow, which is a claim about
a change that did not happen, so it reads **level with 6–12 July** and draws no arrow. And a window with
nothing before it — Q2, the year, all time, the oldest week — draws **no delta at all** rather than an
arrow over a comparison that was never made; the two tiles whose notes are about the window itself keep
theirs (*9% under retail prices*, *2,0% of spend*).

What cannot follow the window says which month it is about, in its own heading rather than borrowing the
one over the tiles: **PACE · JULY**, **WEEKLY RHYTHM · JULY**, **WHERE IT WENT · JULY**, **RETURNS ·
JULY**. A pace is a month's by definition, a weekly rhythm needs more than one of each weekday, and the
split and the returns are written per month.

### Measured

Chromium **141.0.7390.37** under Playwright **1.56.1**, driving the app at `localhost:5173`, every state
entered by clicking what a user clicks and the state read back rather than assumed. **63 assertions
pass**, at 1440x900 and again under `devices['iPhone 13']`. A second pass over the data layer — **81
assertions** — walks all five widths end to end, **14, 3, 2, 1, 1 windows**, no pager looping, every
list walked to both ends, and checks each window's running total against the figure printed above it. A
third — **17 assertions** — reads the tiles: July's and June's against the rows the months author, field
by field, and the 14 weeks' order counts summing to the **60** the three months hold.

The header band is what the longer titles could have broken, and did not: at 390 every `.card-header`
on the page is **44.67px**, the one band tall, with the month suffixes on and measured on the longest
title the page can produce — *Overview · 29 June – 5 July*, the week that spans two months. Nothing overflows its
card (`right` against the parent's `right`, per element, since `.main-panel` clips and the document's
own `scrollWidth` cannot report an overhang), and the document does not scroll sideways. No console or
page errors in either viewport.

`docs/home.png` is the shot this change could have moved, since the hero's chart label now follows both
of its controls. Re-rendered from the app in this container it comes back at **0 differing of
5,184,000** — the label is an accessible name and moves no pixels. `docs/all-orders.png` and
`docs/phone.png` hold no part of Statistics and were not touched. There is no committed shot of
Statistics, so the two states above were read out of the DOM rather than compared against a file.

Gecko and WebKit are not installed in this container and were not checked.

**Not fixed, and deliberate:** *Quarter 3, 2026* reads **38% down vs Quarter 2**, and the quarter has barely started —
July is all of Q3 the records hold, against two months of Q2. The comparison is the right one (a quarter
against the quarter before it) and the figure is honest about what it compares, since the card names the
days on both sides; what it cannot say is that one of them is a third full. The month view has a Pace
card for exactly that and the quarter view has none. Give the store a fuller year and the same code
reads correctly with nothing to change — this is where the records stop, not what the rule says.

**Year and All still cover the same 92 days**, because 2026 is all the store holds. They are told apart
by what they are called and by the resolution they are drawn at (12 points against 6), and Year pages
years while All is one window by definition. A fourth month, or a day in 2025, separates them with no
code to change.

---

## Statistics — the chips named durations and the windows were calendar units

The five widths were called **1W, 1M, 3M, YTD, ALL**, and by the time the pager was fixed the windows
behind them had stopped being durations at all: each one is the calendar unit the window lands in.
Two of the five names were then arithmetically false about their own control, and one was false about
every store it could ever be pointed at.

**3M drew 31 days.** The quarter a window lands in is Q3 here, and Q3 is July on its own, because the
records stop at 31 July — a chip claiming three months over **one month of days**. It is not a
clipping artefact either: nothing about `3M` is true of a quarter, which is 90, 91 or 92 days
depending on which one it is.

**YTD paged back to whole years.** Year-to-date is a window with one end fixed to today, and the arrow
beside it steps to the year before, where *to date* names nothing. The current year runs as far as the
records do, which is what made the name look right in the one place it was ever read.

**1W and 1M were right by coincidence** — a week is 7 days and a month is 1 month, so the duration and
the unit agree, which is exactly what makes the scheme hard to distrust.

The window's own heading had the mirror of this: **W30, 2026** drawn in the band, `Week 30, 2026`
carried beside it in a `.screenreader-only` span, because a letter, a number and a year says nothing
about weeks. Two strings for one window, of which the drawn one — the one nobody could read as a week
— was the one on screen. `Q2, 2026` the same. The heading over the summary tiles is made of that
label, so it read **W30, 2026 IN NUMBERS**.

And the URL carried the codes: `?range=3M`, a link whose width had to be decoded against a calendar
before anyone could say which window it opened.

### What it is now

Each width is called what it is, in the chip, in the arrow, in the heading and in the URL: **Week ·
Month · Quarter · Year · All**, drawing **Week 31, 2026** · **July 2026** · **Quarter 3, 2026** ·
**2026** · **All time** and linked as `?range=week`, `?range=quarter`, `?range=year`, `?range=all`.
Month is the default and stays out of the URL, as it was. The tiles' heading follows the window it is
made from — **WEEK 31, 2026 IN NUMBERS** — and the arrows name the step: *Previous week*, *Previous
quarter*, *No earlier year*.

The drawn label is now the announced one, so the second string is gone: no `.screenreader-only` copy
beside the heading, and nothing to keep in step. It costs width and the band had it — the longest name
the pager can draw, *Quarter 3, 2026*, is **128.6px**, in a band of **212.6px** whose right edge is at
**226.6** against a container edge at **378** on a phone.

**A chip shows the window that is drawn, not the width that was asked for.** `?range=3M` is a name this
app no longer has: the API falls back to the month, and the chip row used to answer that by selecting
nothing at all — the URL's claim drawn over the API's answer. The selected chip is read off the window
the API returned, so that link opens **July 2026** with **Month** lit, and the first click writes a
width that exists.

### Measured

Chromium **141.0.7390.37** under Playwright **1.56.1**, driving the app at `localhost:5173`, every state
entered by clicking what a user clicks — `page.tap` under the phone profile — and read back from the
DOM. **80 assertions pass, 0 fail**, at 1440x900 and again under `devices['iPhone 13']`: the five chip
labels, each chip pressed after its own click, five distinct hero lines on Home for five chips, and on
Statistics the window each chip draws, its URL, the tiles' heading against that window's name, and both
arrows naming that unit. Paging at Week walks **Week 31 → 30 → 29 → 28** and lands at
`?range=week&period=2026-W28`. `?range=week&period=2026-W26` opens **Week 26, 2026** with Week lit;
`?range=3M` opens **July 2026** with Month lit.

The chips are the control this change could have wrapped, and they do not: the five sit on **one row**
at both widths, spanning **267.1px** at 1440 and **259.1px** on the phone inside a 324px box, the row's
height equal to the tallest chip in it (**29.9px**) in every state. Nothing overflows its container —
`right` against the nearest ancestor that has a box, per element, since `.main-panel` clips and the
document's own `scrollWidth` cannot report an overhang — and the document does not scroll sideways
(390/390, 1440/1440).

The first version of that overhang probe compared against `el.parentElement` whatever it was, and the
page grid's `display:contents` wrapper measures 0x0 at the origin: it reported the summary row as
**1416px past** its container in every state of every viewport, which reads as a layout collapse and
was a probe measuring against a box that does not exist. A wait that was a fixed 120ms had the same
shape of error in the other direction — the phantom API takes **90–260ms**, so five chips in a row all
read back "July 2026" and passed nothing. The waits are the assertions now.

`docs/home.png` and `docs/phone.png` both hold the hero's chip row, and both moved: **5,663 differing of
5,184,000** and **5,755 of 1,035,840** — the width of the change and nothing else. The floor was
measured first, on the unchanged app in this container: **0** against each committed shot, reproduced
twice. Both were re-rendered here and reproduce at **0**, twice. `docs/all-orders.png` holds no part of
either page and was not touched.

### All three engines

Gecko and WebKit were installed for this (`playwright install firefox webkit`, then `install-deps
webkit` as its own command) and the run was repeated in each: **Chromium 141.0.7390.37**, **Firefox
142.0.1**, **WebKit 26.0**, all under Playwright 1.56.1, at 1440x900 and again under a phone profile.
**94 assertions pass in every engine, 0 fail — 282 in all.** The phone profile matched `pointer:
coarse` in all three, including Firefox, which takes the viewport, `deviceScaleFactor` and `hasTouch`
but no `isMobile` and no `userAgent`.

The risk this change carried was text metrics, since the chips are ordinary buttons with no native
control, no shadow-DOM pseudo-element and no vendor prefix under them — and the engines do disagree
about width, by about 6%: the five chips span **267.1px** in Blink, **250.9** in Gecko and **251.1** in
WebKit at 1440, and **259.1 / 242.9 / 243.1** on the phone, inside the same **324px** box. One row in
every engine at both widths, so the narrowest margin any of them leaves is **64.9px**. The longest
pager label, *Quarter 3, 2026*, is **128.6px** in Blink and **121.8 / 121.9** in the other two.

The window counts `react/README.md` states were walked to both ends rather than read off the API, in
each engine and both viewports: **14** windows at Week (oldest *Week 18, 2026*), **3** at Month (*May
2026*), **2** at Quarter (*Quarter 2, 2026*), **1** at Year and **1** at All. Browser Back walks the
pager in all three — forward *Week 31 → 30 → 29*, Back to *Week 30* then *Week 31*.

**Open, and not this change's: WebKit 26.0 crashes its renderer on a reload after Back.** One
`goBack()` over a history entry the app itself pushed, then a reload, kills the page — *Page crashed*,
**3 of 3 runs**. The `goto` between them is irrelevant, and either half alone is harmless: Back then
`goto` without a reload is fine (0 of 2), and reload without a Back is fine (0 of 2). It is not this
change — the build **before the rename crashes 3 of 3 the same way** — and it is not the harness's
sequence being exotic, since the identical sequence in the identical run passes in Blink and Gecko.
Statistics is the only page that reaches it: it is the one place the app pushes a history entry, which
is what makes Back walk the pager, where All Orders writes its filters with `replace`. Not fixed here.
The assertions above put link-opening on a fresh page, which is what opening a link is, so the crash
does not stand in for a failure of the thing under test.

---

## Home — the hero card said "Spent this month" under every width there was

The card carried a range control offering **Week · Month · Quarter · Year · All**, and a heading that
read **SPENT THIS MONTH** for all five. Under the heading, **24.418,57 kr.**, *saved 2.106,00 kr. vs
retail (9,4%)*, **Orders 23** and **Saved 2.106,00 kr.** — July's, every one of them, whichever chip was
lit. Pressing *All* on a store holding **three months** changed the total by **0 kr.**

Only the chart moved, and it did not move to a different window either: *Week* took the last seven
values of the one authored month, *Month* drew it whole, and *Quarter*, *Year* and *All* bucketed **that
same month** into 13, 12 and 6 points. Five names for one month at five resolutions — the resolution
control [Statistics' own chips were already caught being](#statistics--the-range-chips-drew-a-week-and-the-pager-went-on-stepping-months),
one view over.

The chart's own accessible name was the part that had been fixed. It followed both controls honestly
(*Orders per day, all of July* · *Orders across July, bucketed into 6 points*) and it was the only thing
in the card that did, which is what made the defect quiet: the label the rule named had been made true,
and the heading, the total, the saving and both tab figures — five more claims about the same window,
all of them printed larger — had never been read back against the control at all. A card can be wrong in
five places and pass a probe pointed at the sixth.

### The window is real now

The chips fetch a window of the same timeline Statistics pages, so Home has the widths it offers:
**Week 31, 2026** (the clipped *27–31 July*) · **July 2026** · **Quarter 3, 2026** · **2026** · **All
time**, drawn at **5, 31, 13, 12 and 6** points. Everything in the band is that window's and moves with
it — the totals go **5.878,54 → 24.418,57 → 24.418,57 → 63.518,57 → 63.518,57 kr.**, the order counts
**6 → 23 → 23 → 60 → 60**, the savings **507,00 → 2.106,00 → 2.106,00 → 5.957,00 → 5.957,00 kr.** at
**9,4% / 9,4% / 9,4% / 9,1% / 9,1%** under retail. *Quarter* matching *Month* and *Year* matching *All*
is where the records stop, not the control failing: **Q3 is July on its own** and **2026 is the three
months the store holds**. They are told apart by their names and by the resolution they are drawn at.

The two series behind the tabs are the window's own days now — **orders a day** and **kroner saved a
day**, summed into the figure printed on the tab above them, so the line and its number are one series
the way a running total and its figure are on Statistics. The two authored pixel series they replaced —
`orders` and `saved`, in each of the three months, one month long whichever width was chosen — are gone
from the store with the six arrays that held them, and so is the
authored callout: *"Quiet week so far. Biggest day was the 23rd: 4.298,00 kr. at Proshop."* was a
sentence about a day the derived days disagree with — July's biggest is **24 July at 1.959,51 kr.** —
sitting still while the chips moved the chart under it. It reads off the window now, so *Week* says
**31 July: 1.808,78 kr.** and the three wide ones say the 24th.

The category split under the chart is **written per month**, which is as fine as the records cut, so it
keeps the month and says so over its own rows — *Where it went · July* — rather than borrowing a heading
that now moves. `.list-heading` was scoped to `.entry-list` and had to become a base spec to reach it,
which is the same near-miss the file already documents for `.section-label` and `.card-caption`: outside
the one blessed container the heading would have arrived at the UA's 16px.

### Measured

Chromium **141.0.7390.37** under Playwright **1.56.1**, driving the app at `localhost:5173`, every state
entered by clicking what a user clicks — `page.tap` under the phone profile — and read back from the
DOM. **206 assertions pass, 0 fail**, at 1440x900 and again under `devices['iPhone 13']`: per width, the
heading, the card's accessible name, which chip is lit and that exactly one is, the header's link
target, the plotted point count, the total, both tab figures, the saving line, the chart's name, the
callout's shape, the legend's own heading and its computed spec against the entry list's.

**The distinctness is counted per field, not per state**, and that is the assertion to be careful with,
because a tuple of all four fields is one the old card passes: its chart did move — five names and
**7, 35, 13, 12, 6** points — so five states read as one string are five distinct strings, over a
heading and a total that are frozen. Field by field across the five widths, the old card's heading
takes **1** distinct value, its total **1**, its saving **1**, its order count **1**. The card that
replaced it takes **5, 5, 5** for the heading, the chart's name and the point count, and **3, 3, 3, 3**
for the total, the saving line, the order count and the saved figure — three rather than five because
Q3 is July and 2026 is all of it, which is where the records stop and not a chip failing.

Two of the old chart's numbers were their own small untruths, on the way past: the authored series held
**35 values for a 31-day July**, so *Month* plotted 35 points at a day each, and *Week* took the last
seven of those 35 — a stretch that is not the last seven days of anything.

Both of the card's controls were fired against each other rather than each on its own: switching the
series tab moves the chart's name and leaves the heading and the total **unchanged**, which is the shape
of the defect one level down. And the card's header link was followed for each width — it lands on
`?range=week`, `#/stats`, `?range=quarter`, `?range=year`, `?range=all`, with Statistics' pager, its lit
chip and its tiles' heading naming the same window, and **the same total printed on both pages**.

The longer headings are what the fixed-height header band could have broken, and did not. The band
states a height, so a wrapped title would overflow it rather than grow it — the band's own number cannot
report the risk, and was measured beside the title's: **44.67px** band and a **16.67px** title in every
state at both widths, the longest being *Spent · Quarter 3, 2026* at **170.17px** wide. Nothing in the
card overhangs its parent (`right` against the parent's, per element, since `.main-panel` clips and the
document's own `scrollWidth` cannot report an overhang) and neither viewport scrolls sideways. Ten
routes were loaded with the console listened to, after three fields left the store: **no console or page
errors**, and no chart path drawn without a `d`.

**Not rendered here:** `docs/home.png` and `docs/phone.png` both hold this card, and this change left
both stale — the heading, the chart's line and the new legend heading all move. They were regenerated
later, with `all-orders.png` beside them; the numbers are in
[Documentation](#documentation--three-committed-screenshots-had-drifted-from-the-app). Gecko and WebKit are not installed in this
container and were not checked; the change is ordinary text and SVG with no native control, no
shadow-DOM pseudo-element and no vendor prefix under it.

---

## Statistics — the picker moved the tiles and the chart, and five cards went on reading July

The page had a width picker and a pager over one timeline, and everything above the fold obeyed them:
the window's name, the four tiles and their heading, the chart and the scale under it. Below the fold,
five cards did not. **Pace · July**, **Weekly rhythm · July**, **Where it went · July**, **Last six
months** and **Returns · July** came off the month record whatever the picker said, so pressing *Week*
left a page describing two different stretches of time at once — and the frozen half was the larger
one, five cards against four tiles.

Field by field across the five widths, on the page as it stood: the pace card's heading **1** distinct
value, its figure **1** (*30.300 kr.*), the rhythm's heading **1**, its figure **1** (*34% of spend
lands on weekends*), the split's heading **1**, its four rows **1**, the columns' heading **1**, their
labels **1** (*Feb,Mar,Apr,May,Jun,Jul*), the returns heading **1** and its note **1** — ten fields, one
value each, under a tiles heading that took **5**. That is the shape to check for: one moving field is
all a tuple needs to hide ten frozen ones.

Three of the frozen values were untrue on their own terms, not merely stale:

- **The pace card said *25 days in* over a July the store holds 31 days of**, and projected *30.300 kr.*
  from them — a projection for a month whose records are complete, printed as though it were still
  being written.
- **The category split printed the all-time category totals under a heading naming July.** *Groceries
  18.420 · Electronics 12.940 · Household 6.110 · Everything else 5.550* sums to **43.020 kr.** beside a
  card total of **24.418,57 kr.**, and the ring next to those rows was drawn from a *different* set of
  numbers again — the global shares 38/27/13/10 — so the picture and the list beside it had no way to
  disagree visibly, and did.
- **The columns card drew six months of which three do not exist.** *Feb, Mar, Apr* are authored bar
  heights in a store that holds **May, June and July**, under the sentence *July is the highest so far*,
  which was authored too and stayed true only by luck.

The picker itself sat in the Overview card's body, a scroll away from the arrows that step by what it
chooses, and its buttons were **27.94px** high resting and **29.94px** selected against the paging
buttons' **32x32** — one control drawn as two, in two heights, one of which changed with the selection.

### Every card is the window's now

The same ten fields take **5, 5, 5, 3, 5, 3, 3, 3, 5, 5** distinct values across *Week · Month ·
Quarter · Year · All*. Where a field reads **3** rather than **5** the records are what stopped, not the
control: **Q3 is July on its own** and **2026 is the three months the store holds**, so those windows
carry the same days as *Month* and *All* and the same numbers with them — they are told apart by their
names, their day counts and their pace.

Paging inside a width moves the same cards: one step back from July to June takes the pace figure
**24.419 → 20.680 kr.**, the weekend share **22% → 23%**, the split's first row **10.455 → 15.180 kr.**,
the marked column **Jul → Jun**, and the returns note from *One return in July: Zalando on 5 July,
refunded in full: 799,00 kr.* to *No returns in June.* Of the eighteen fields read, four hold across the
two months, and each is a fact about the pair rather than a card that failed to move: the same width is
lit, the axis is a whole month's **01/08/15/22/29** either way, and the meter is full on both because
both months are complete.

What a month authors and a day does not — which categories a purchase fell into — is split across that
month's days by what each day cost, which is how the totals already carry `saved` and `shipping`. So the
split is the window's and the ring is drawn from the rows beside it: July's four rows now read **10.455
· 7.345 · 3.468 · 3.150 kr.**, which is **24.418,57 kr.**, the figure above the chart. The returns note
is derived from the orders themselves, so it is true of a stretch nobody authored a sentence for — and
of an order returned today.

Two things a derived card can reach that an authored one could not, and both are drawn: a window with
**no weekend in it** (*27–31 July* is Monday to Friday) reports **0%** and draws the Saturday and Sunday
tracks empty rather than absent, at a 3px floor; and a window with **nothing before it** — *All time*,
and the oldest week in the store — draws no marker on the pace meter and prints no sentence about one,
where the card previously assumed a previous month always existed.

### The two halves are one control

The picker sits in the pager band, immediately right of the arrows. Every button in it is **32x32**
resting *and* selected — the same box `.icon-button-arrow` draws — and the row's geometry is byte-stable
across the five states: *Week 60.89 · Month 67.11 · Quarter 77.55 · Year 54.89 · All 40.67*, at the same
x in all five, because the selected button changes fill and not padding. The band is **34px** on one row
at 1440 and **119.89px** on two at `devices['iPhone 13']`, where the five widths still share one row and
nothing overhangs its parent. Every card header on the page is still **44.67px**, the height
[measured against the longest title the page can produce](#statistics--the-range-chips-drew-a-week-and-the-pager-went-on-stepping-months)
— and the height this picker broke, at 57.94 and 93.88, the last time it was put inside a card header
instead of beside the arrows. A page band is not a card header: it is the pager's own row and it
already wraps. Taking the picker in cost the band **0px** at 1440 — 34px before and after, with the
Overview card still starting at **340.7** — and **42px** at 390, where it takes a row of its own; the
page is shorter either way, **1426 → 1362** and **2364 → 2343**, because the picker left the card body
it used to sit in.

The name between the arrows holds **213px** — *Quarter 2, 2026* is the longest the pager can reach at
**128.61px**, plus two 32px buttons and two 10px gaps. Without it the picker slid **87px** sideways
between *Year* and *Quarter*, which puts a different width under the pointer that has just clicked one.
The first attempt at holding it computed to `min-width:0`: `.row-inline > *` is set to that deliberately,
later in the stylesheet and at equal specificity, so the rule now sits beside the one it has to beat.

### At 390 the row costs more than the words

The band would not hold on one row at phone width: two 32px arrows, a window name and five widths in
about **350px** of panel leaves the name roughly **96px**, and *Quarter 3, 2026* is **128.6px** written
out. With the widths abbreviated to two letters and nothing else changed, three of the five fitted —
*July 2026* at **79.6px**, *2026* at **41.4** and *All time* at **63.7** — and *Week 31, 2026*
(**113.9**) and *Quarter 3, 2026* wrapped to a second row.

So the phone gives up the written-out name as well: **WK MO QT YR ALL** beside **W31 2026 · Jul 2026 ·
Q3 2026**, the name at 14px, the 213px hold released, and all five widths on **one row** — the pager
band ending at 350.38–360.22px of a 390px viewport in every one of them. That is the abbreviation
[the rule above](#statistics--the-chips-named-durations-and-the-windows-were-calendar-units) exists to
prevent, and it is allowed here on one condition: both forms are in the markup and the stylesheet
renders exactly one, so nothing is announced that is not drawn. The accessibility tree at 390 reads
`group "Range"` over `button "WK" [pressed]`, `"MO"`, `"QT"`, `"YR"`, `"ALL"`, with the window name
`W31 2026`; at 1440 the same nodes read `"Week" [pressed]`, `"Month"`, `"Quarter"`, `"Year"`, `"All"`
and `Week 31, 2026`. One string per control per width — the W30 defect was two.

Desktop is untouched by all of it: the full words, the buttons at the same five widths, and the picker
still starting at **x=485** in all five states.

### Measured

Chromium **141.0.7390.37** under Playwright **1.56.1**, driving the app at `localhost:5173`, every state
entered by clicking what a user clicks and read back from the DOM. **No console or page errors** in any
state. The URL carries both halves and the browser's Back walks them: `#/stats` → `#/stats?range=week` →
`#/stats?range=week&period=2026-W30`, and Back returns through the same three windows with the pace card
following each one; exactly **one** width is `aria-pressed` in every state; a link carrying a width the
product no longer has, `?range=3M`, opens July with *Month* lit.

`docs/` was not regenerated and did not need to be. This branch and `main` were rendered through the
same harness on the same machine: **0 differing pixels of 5,184,000** on Home, **0 of 1,035,840** on the
phone shot and **0 of 5,184,000** on All Orders, against **896,858 of 5,184,000** on Statistics, which is
the change. Against the committed files the same renders differ by **226,194**, **41,303** and **734,958**
— that gap is the staleness [the entry above](#home--the-hero-card-said-spent-this-month-under-every-width-there-was)
already records, and it is not this change: the pages this change can move are the ones that came back at
0 against `main`.

**Not rendered:** Gecko and WebKit are not installed in this container and were not checked. The change
is text, CSS box geometry and SVG, with no native control, no shadow-DOM pseudo-element and no vendor
prefix under it.

---

## Documentation — three committed screenshots had drifted from the app

All three files in `docs/` were renders of an older app. Nothing announced it: a screenshot cannot fail
a test, and the two changes that moved them each said so in their own entry and left the regeneration
for later, which is a note nobody reads at the moment it matters.

Rendered from the app on the build these files were made on — Chromium **141.0.7390.37** under
Playwright **1.56.1**, the pair that reproduces them exactly, so a regeneration here carries the app's
drift and not a different machine's text rasterisation:

| file | differing | of | what had moved |
| --- | --- | --- | --- |
| `home.png` | **226,194** | 5,184,000 | the hero card's heading, its chart and the legend heading under it |
| `phone.png` | **41,303** | 1,035,840 | the same card, at `devices['iPhone 13']` |
| `all-orders.png` | **319,255** | 5,184,000 | the finder's **COMMANDS** group — *Create order with Bilka* |

The third was the one that had to be proved rather than assumed. A shot that holds three pieces of state
at once — the FILTERS panel open, the list filtered to `?vendor=bilka&status=Delivered&from=2026-07-01&to=2026-07-31`,
and `bil` typed into the global finder — reads as a difference whenever the harness drives any one of
them wrong, and an earlier careless run had reported **734,958** for exactly that reason. Cropping the
differing box out of both files settled it: the orders, the vendor row and the *SEARCH ALL ORDERS FOR
"BIL"* footer are identical and in the same order, with one group inserted above the footer in the app
and absent from the file. The state was right and the app had gained a command.

Each file was rendered twice through the same harness and required to agree with itself at **0
differing pixels** before being written — animations frozen, geometry settled across three frames, the
scroll offset and focus put back where a fresh load has them, and the pointer parked off-canvas, since
a probe that leaves any of those behind produces two runs that agree with each other and disagree with
the file. `phone.png` is `devices['iPhone 13']` with `deviceScaleFactor` overridden to 2 at a 390x664
viewport, which is the 780x1328 the committed file is; a bare 390x844 window renders 1170x2532 and dies
on a size mismatch that reads as a layout change and is not one.

**Not rendered:** Gecko and WebKit are not installed in this container. These files are Blink renders,
as they have always been.

---

## Documentation — the harness that renders the screenshots had drifted from the app

The three committed shots are only as good as the script that makes them, and that script had gone
stale in two independent ways at once. Neither could be seen without running it, and running it is
what a change to a documented screen is supposed to trigger.

**It waited on an element that no longer exists.** The home render blocked on `.chart path`, which
matches **0 elements**: the hero's chart sits in `.chart-wrap`, where `.chart-wrap path` matches 2.
The wait timed out at 5s and the script aborted before writing any of the three files, so the failure
looked like a broken environment rather than a stale selector.

**Its filtered state had fallen out of the data.** The all-orders shot pins the list to a vendor, a
status and a month, and the month was written as a literal — July 2026. The fixture is
`{seed: 1, months: 2, orders: 30}` and the dataset is a function of *(seed, today)*, so on a render
day two months later the window held **0 of 30** orders. Moved to the August window the same fixture
gives **3** Bilka Delivered orders, and the header reads *ORDERS • 3 MATCHES* again, which is the
state the committed file documents.

Both are the same failure with different faces: a fact about the app written down in a place nothing
renders. The check the script already prints on every run — the match count of its own filtered
query — is what named the second one immediately.

Rendered twice through the fixed harness, on two independently registered accounts, in Blink
141.0.7390.37 under Playwright 1.56.1: `home.png` and `phone.png` came back at **0 differing pixels**
of 5,184,000 and 1,035,948 — the harness agrees with itself, and neither shot is touched by the card
spacing fixed above. `all-orders.png` differs by **22,819 of 5,184,000**, which is that fix and only
that fix.

**Not rendered:** Gecko and WebKit are not installed in this container. These files are Blink renders,
as they have always been.

---

## Charts — the ruler under every chart was a fixed comb, and the marks were spread evenly

The strip of tick marks under a chart was one CSS declaration:
`repeating-linear-gradient(to right, #D9DDD8 0 1px, transparent 1px 23px)` — a line every 24px, from
the left edge, forever. It knew nothing about the dates printed under it. On the 1114px charts that is
**47 ticks under 5 labels**; on the 704px Orders card, **30 under 5**; on a phone, **14 under 5**. No
tick landed on a label except by arithmetic accident, and the strip read as a scale because it is
shaped like one.

The labels were no better placed. They were spread by `justify-content:space-between`, so mark *i* of
*n* sat at `i/(n-1)` of the box — evenly, whatever the dates were. The chart plots day *d* of a
31-day month at `(d-1)/30`, so the five marks belonged at 0, .233, .467, .700 and **.933**, not at 0,
.25, .5, .75 and **1**. The distance between where the last mark was drawn and where its own day is
plotted:

| chart | width | the "29" was off by |
| --- | --- | --- |
| Home hero, Home's two rail charts, Statistics' overview | 1114px | **74.3px** |
| Orders' overview | 704px | **47.0px** |
| all five, at `devices['iPhone 13']` | 324px | **21.7px** |

Both rows are one component now (`ChartScale`), drawn from one array of marks the window itself
sends — `[{ label, day }]`, where `day` indexes the window's own daily series. A mark is placed at
`left:p%` and pulled back by `p` of its own width, so p=0 sits flush left, p=1 flush right and p=.5
centred: exactly what space-between was doing to the labels, which is why they have not moved, but now
the tick is placed by the same number. Measured across **21 chart states** — Home's hero and Statistics'
overview at all five widths, Home's two rail charts and Orders' overview, at 1440x900 and
`devices['iPhone 13']` — the worst distance from a tick to the nearest point the chart's own path
plots is **1.36px**, against a tick 1px wide. Read off the rendered `d` attribute, since the viewBox is
1:1 with pixels and a path coordinate is therefore a pixel offset.

### A year drawn as 12 equal slices is not 12 months

`RANGE_POINTS` cut a year into 12 buckets of `365/12 = 30.4` days. Calendar months are 28 to 31, so
they slid: 1 Feb is day 31 and lands in bucket 1, and so does 1 Mar, day 59. Two marks, one point. The
axis printed **Jan Feb Apr May Jun Jul Aug Sep Oct Nov Dec** — 11 labels for 12 months, March drawn
and unnamed, and before the marks were placed on their real points it printed both on top of each
other. "All time" was worse at 6 buckets: **12 marks onto 6 points**.

So the cut is the marks themselves for those two ranges — the months the window already names are the
buckets it is drawn in — and 12 points across a year are its 12 months, exactly. A quarter is not
bucketed at all any more: it is ~92 days and a chart draws 92 points of them, so its three month marks
land on their own dates rather than in whichever of 13 weekly slices held them. `RANGE_POINTS` is gone
with it — a count per range was the wrong shape for the question.

| range | the unit it is marked in | marks sent | drawn at 1440 | on the phone | points plotted |
| --- | --- | --- | --- | --- | --- |
| week | its 7 days | 7 | 7 | 7 | 7 |
| month | its 28 to 31 days | 31 | **31** | 16 | 31 |
| quarter | its 3 months | 3 | 3 | 3 | **92** |
| year | its 12 months | 12 | **12** | **12** | 12 |
| all time | the months it spans | 12 | **12** | 10 | 12 |

The marks are the window's calendar, not its contents: a 31-day month sends 31 marks whether it
holds five orders or five hundred.

### How many fit is a question about width, not about range

A month has up to 31 marks and a year of days would have 365, so marks are dropped left to right until
each has room for its own label, keeping the first and the last. The room asked for is the two labels'
own half-widths plus 7px of daylight, not a constant: a flat 34px is what "Jan" needs beside "2025",
and reserving it for twelve three-letter names cost the phone half a year — **6 marks of 12**, missing
Feb, Apr, Jun, Aug, Oct and Nov. Sized off the labels, the phone keeps all twelve months, and a month's
31 days come down to **16** (01, 03, 05 … 31) on a 324px card and stay at 31 on a 1114px one. No two
rendered labels overlap in any of the 21 states, asserted as `left[i] > right[i-1] + 2`.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173` against
a real API and a fresh account with 12 months of demo data, at 1440x900 and under
`devices['iPhone 13']` with `deviceScaleFactor: 2`; every range entered by clicking its button and
confirmed by reading `aria-pressed` back before measuring. **0 page errors** in either profile.

### The screenshots

`docs/home.png` moved **923,487 of 5,184,000** and `docs/phone.png` **92,635 of 1,035,840**; both were
re-rendered. `all-orders.png` is byte-identical — it holds no chart. The whole of that difference is
this change and none of it is drift: the same harness run against the unchanged source reproduces both
committed files at **0 differing pixels**, and each new file was rendered twice and required to agree
with itself at 0 before being written. Most of it is not the scale itself but what sits under it —
Home's three charts had labels and no ticks, so each gained a **17px** strip (8px of margin and a 9px
ruler, against the 4px margin the labels carried alone) and everything below them moved down by it;
each also went from 5 marks to 31, three times over.

The row holding the labels is `height:1lh` and not a pixel count. Every label in it is absolutely
positioned, so the row would otherwise collapse to nothing; a hardcoded 14px was 1.2px short of the
15.225 the 10.5px text occupies, which is three more small shifts on Home for no reason at all.

**Not run:** Gecko and WebKit are not installed in this container. This is a Blink render. The change
is `position:absolute` with a percentage `transform`, which is not an engine-shaped construct, but it
has not been checked in the other two.

---

## Charts — three bars of 100%, 96% and 85% drew the same height

*Last six quarters* is six bars, each given a height as a percentage of the tallest. Three consecutive
quarters were sent **96%, 85% and 100%** and all three rendered at **128.05px**.

The column was a 150px flex column holding the bar *and* its label. A percentage height resolves
against that 150px, so 100% asked for 150 — but the space left after the 6px gap and the 15.95px line
of text is 150 − 6 − 15.95 = **128.05px**, and `flex-shrink` (1 by default) quietly took every bar that
asked for more down to exactly it. 85% asked for 127.5 and fitted, which is why the shortest of the
three was the only one drawn correctly, and why the defect reads as "the tall ones are capped" rather
than as a scale that is wrong everywhere. Anything above **85.4%** drew at the cap: on this data that
was three bars of six.

The bar has a track of its own now, and the label is outside it, so the box a percentage resolves
against is the box the bar can actually fill. Measured across five ranges at 1440x900 and under
`devices['iPhone 13']` — 60 bars — the largest disagreement between a bar's rendered height and
`track x percent` is **0.02px**, and no two bars with different percentages draw within 0.5px of each
other.

### The track is a floor, not a height

150px was also the whole of it, in a card that shares a grid row with the category breakdown — which
is as long as the account has categories. Ten legend rows beside six bars left the bar card 380px tall
with a 150px chart in the top of it and **230px of nothing** underneath. The track is `flex:1` with a
150px `min-height` now, and the card and its body pass the row's height down: measured at 1440, the
chart fills **527 of 527px** of the body's inner width and leaves **1px** below itself, against 230
before. The percentages still resolve exactly against the grown track — 220.13px and 379.5px tracks,
same 0.02px worst error.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.


---

## Returns — one card said four and the other said none

August held four returns. *Statistics* listed them: Proshop on the 9th, 1.510 kr.; Power on the 7th,
669; Føtex on the 5th, 371; Zalando on the 2nd, 3.171. *Orders overview*, one click away and scoped to
the same month, drew a search glyph and the sentence **"No open returns found"**.

Neither page could fail on its own. Statistics rendered correct rows from a correct query. Orders
rendered a correct empty state — correct markup, correct icon, correct spacing, in every engine and at
every width — over data it had never asked for. The card was a stand-in: `EmptyState` with a hardcoded
sentence and a link, no data path behind it, so it drew the same thing over a month with four returns
and over a month with none. The two pages only disagreed with each other, and only about a fact
neither of them printed twice.

Behind it was a flag doing a job it was not for. `getStats(…, { summary })` exists to skip expensive
work for callers that will throw it away — `recent` is up to six extra full aggregate queries for a
bar chart only Statistics draws. `returns` had been put behind the same flag, and it is one indexed
range query that a card renders. Orders overview asked for a summary, got `returns: null`, and had
nothing to draw even once someone thought to draw it. **Skip what costs; never skip what something
renders.**

### One card now, not two copies

`ReturnsCard` is the card, and both pages call it with the window they are showing. Measured at
1440x900 and under `devices['iPhone 13']`, each route loaded fresh:

| page / range | rows drawn | count line |
|---|---|---|
| Orders overview (August) | Proshop 1.510 · Power 669 · Føtex 371 · Zalando 3.171 | — |
| Statistics, month (Aug) | the same four, in the same order | — |
| Statistics, week (Week 33) | none — "No returns in Week 33." | — |
| Statistics, year (2026) | the newest five | The 5 most recent of 40 in 2026. |
| Statistics, all time | the newest five | The 5 most recent of 65 in all time. |

Identical on desktop and phone, 0 page errors, 0 document overflow, the card 392.4px in Orders'
right-hand rail and 366px on a phone with the heading on one line in both.

### The word "open"

It meant a return whose refund has not landed — the record carries a `refunded` flag, and Statistics
prints "· refunded in full" beside a row that has it. Nothing filtered on it: the sentence claimed a
distinction the card never applied. Nothing can *set* it either — no form field writes `refunded`, and
generated data leaves all 65 returns unrefunded — so the open/closed distinction the copy leant on is
one the product cannot currently record at all. The card says returns and lists returns; the empty
sentence names the span it is empty of, which is the thing a reader actually needs.

### The action under it

The closing link was the one card in seven that was not the full-width block button. `.button-link`
declares no top margin of its own, so it sat **2px** under the last row of the list; the six cards that
close with `.button.button-block` sit at **12px**, that variant's own margin. It is now the block
button in all seven, measured at 12px in every state of both pages, at both widths.

Two smaller things went with it. The empty state was the app's only `icon={null}` with a `14px 12px`
padding override — 13 empty states, 12 of them the shape the design system defines, and the odd one
out was the one two pages had to agree on. And the count line's `style="display:block;margin-top:10px"`
became `.entry-list-note`: an inline declaration outranks every rule the stylesheet can write, which
is a bad trade for a value that now has more than one call site.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

---

## Demo data — the button rebuilt the same year every time

FILL WITH DEMO DATA wipes the account and generates twelve months of orders. The generator is
deterministic for a given `(seed, today)` — deliberately, so one harness run can be compared against
another instead of eyeballed — but the seed was a **default parameter on the generator** and the
button was the only caller. It never passed one. So every press of it, on every account, on the same
day, produced the identical year: the same 413 orders, on the same days, from the same vendors, for
the same totals. Pressing it twice looked exactly like pressing it once, which is the one thing a
button that says *fill* must not look like.

The seed belongs to the caller, so the route picks one now and passes it. Three presses, no seed
sent:

| press | seed | orders | month spend |
|---|---|---|---|
| 1 | 1791625037 | 435 | 15.394 kr. |
| 2 | 197403416 | 393 | 19.735 kr. |
| 3 | 1456363375 | 424 | 20.708 kr. |

Three distinct datasets of three, compared as the full sorted list of every order's
date · vendor · status · kind · total · line count.

Determinism did not go anywhere — it moved to where it can be asked for. `POST /api/demo-data` takes
`{"seed": n}`, and the response now says which seed it used, so a dataset can be named in a bug
report and rebuilt. Seed 424242 twice: **413 orders, identical on all six fields**. Seed 424243:
**402 orders, different**. (Row *ids* stay random and always were, so two orders sharing a date can
come back either way round under `date DESC, id DESC`; the fingerprint above is of the data, not of
the tie-break.)

Measured against the API directly at `localhost:4000` — no browser involved, since nothing here is a
rendering question.

---

## Data Rows — the money column was green, so two lists showed the saving

*Latest orders* on Orders overview listed four orders as **+26,04 · +9,39 · +336,98 · +893,77 kr.**,
in green, under a card headed *Spent · August 2026*. Those are the savings. The orders were
**295 · 189 · 2.783 · 3.718 kr.** The same list on Home did the same thing, with the real total
demoted to the meta line beside the date.

The colour came first and the figure was chosen to agree with it. `.entry-list .amount` set
`color: var(--text-positive)` on the *family*, so every list using those rows had a green money
column whatever it put there — and green in this system means one thing, money saved. Three of the
four lists using the family put a total in that slot; the two that put a saving there are the two
that had been written to match the paint.

Nothing could catch it by looking. The figure is correctly formatted, correctly aligned, correctly
right-aligned in the correct column, and the row it sits on links to the right order. The only way
to see it is to read the number against the record it names — so the check does that, fetching each
row's own order and comparing: **15 rows across Home, Orders overview and Statistics, at 1440x900 and
under `devices['iPhone 13']`, all 15 now showing the order's total**, every `.amount` computing to
`rgb(11, 15, 13)` (`--text`) where the two lists were `--text-positive`. Top vendors keeps both
figures the way it always did — the total in `--text`, `saved 7.680 kr.` beneath it in the muted
tone — which is the shape a row uses when it has two things to say.

Removing the family's colour also made the override under it dead: `.entry-list .amount
.tabular-figures { color: var(--text) }` existed to pull the figure back out of the green for exactly
that two-tone case, and with the slot neutral it set the value that was already there. Gone with it.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

---

## Empty states — two of the four cards on Orders overview drew nothing, permanently

The returns card is [one entry up](#returns--one-card-said-four-and-the-other-said-none). It had a
neighbour with the same shape of fault, and removing it is what made the count worth writing down.

*Latest receipts* drew a 42px search glyph, "No receipts waiting. Scan one and the order drafts
itself.", a SCAN A RECEIPT link and a SEE ALL button into the orders list — over no data at all. No
request behind it, no field to be empty, no state in which it would have drawn anything else. Two of
the four cards on that page were therefore pictures of cards, side by side, and both looked exactly
like the working ones: correct spacing, correct icon, correct copy, identical in three engines and at
every width, stable to the pixel run over run.

Both are gone. The month's returns take the position *Latest receipts* held, so the page now reads as
two lists of the same month's orders side by side — the latest, and the returned — measured at
**364x368 each** at 1440x900. Scanning is reached from the top bar on every page, from Home, from an
order and from the create form, so nothing lost its only way in.

*Question of the day* went with them, on both screens that carried it, along with the two aggregate
queries behind it: last calendar month's top category and that category's order count, served from
`GET /api/home/question`. That route now has no caller, so it is gone too — a route nothing reads is
a query somebody has to keep working and a shape somebody has to keep compatible. It was already
split from `/api/home/onboarding` (they used to share one response and every caller threw half of it
away), and that split is what made removing one of them a deletion rather than surgery. Measured
after: Orders overview requests `/api/orders/overview`, `/api/stats` and `/api/categories`;
Categories requests `/api/categories`. 0 page errors on either, at both widths.

Deleting a card means deleting what drew it, and the reach of that is not obvious by reading. The
`QuestionCard` component went with its two callers — and the three CSS rules under it nearly did,
which would have been a regression on a page this change never touched: the scan page writes
`class="card card-question"` by hand for its *What the AI checks* panel. A match count is what said
so (`.card-question` → **1**, not 0), and the panel measures 18px padding, a 10.5px/700 uppercase
label and a 15px/700 title, unchanged. `.card-headline-question` really was orphaned — **0 matches,
0 source references** — and is gone.

---

## Home — three cards in a row, and two of them mostly empty

*Spending rhythm*, *Category breakdown* and *Top vendors* share one grid row, so all three are as
tall as the tallest. Measured at 1440x900 with twelve vendors and six categories carrying spend:

| card | rows | height | empty below its content |
|---|---|---|---|
| Spending rhythm | — | 698px | **403px** |
| Category breakdown | 6 | 698px | 129px |
| Top vendors | 3 | 698px | **~300px** |

Two different faults with the same look. *Top vendors* was cut to three by
`.slice(0, 3)` — a number written once, in the client, with nothing else in the app agreeing to it;
the account had twelve and the card had room for ten. *Spending rhythm* could not be filled at all,
because its bars were **pixel heights computed in the API**: `rhythmOver` scaled the busiest weekday
to 70px and returned that number twice, once as `home` and once as `stats`, so the chart was exactly
as tall as a decision taken where the data is and the card kept whatever was left.

Both are now one number and one shape. The row count is a single exported constant the page's lists
all read, set to 10; the bars are a **share of the busiest day** rendered as a percentage of a track
that grows with the card, which is the shape the month columns already use for the same reason.
After, same account, same viewport:

| card | rows | height | empty below its content |
|---|---|---|---|
| Spending rhythm | — | 698px | **1px** |
| Category breakdown | 6 | 698px | 129px |
| Top vendors | 10 | 698px | **1px** |

The breakdown's remaining 129px is the account's, not the layout's: that list is every category with
spend this month by rule, since the ring above it has to add up to the figure printed in its centre,
and this month has six. The Orders card on the same page went 3 rows to 10 from the same constant
and also closes at 1px.

### The bars were the right size and in the wrong place

The share-of-track rewrite measured perfectly and rendered upside down. Every bar came back within
**0px** of `track x share` — 495.5px track on Home, 62.1px on Statistics, at 1440 and under
`devices['iPhone 13']` — while all seven hung from the top of the track instead of standing on its
floor. `align-self: stretch` was left over from when the bar was a direct child of its column, where
the cross axis is horizontal and stretch is what spanned it; inside the track the cross axis is
vertical, and stretch on an item with a definite height resolves to flex-start. A height check has
no opinion about where a box sits, so it passed. The probe now reads each bar's bottom edge against
its track's bottom: **0px on all 28 bars**, across both pages and both viewports.

The only non-zero figure left is deliberate: a weekday with no spend draws at `min-height: 3px`
rather than vanishing, so a 0% bar measures 3px against a computed 0.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`,
0 page errors. **Not run:** Gecko and WebKit are not installed in this container.

---

## Settings — the entry count and the list order were facts about the build

Two numbers the app stated and nobody had chosen.

**Entries per card** was `.slice(0, 3)` in the client for Home's vendors, `count: 3` for Home's
orders, `count: 4` for the same card on Orders overview, `RETURNS_SHOWN = 5` in the API for the
returns card, `LIMIT 10` for recent scans and `slice(0, 3)` for the hero's legend — six numbers,
none of them chosen together, one of them making the same card two lengths depending which page
drew it. It is one account setting now (1, 2, 4, 6, 8 or 10), read on the server by every route
that truncates a list and in the client by the three lists it derives itself. Driven from the
picker and counted on screen, at 1440x900:

| setting | top vendors | orders card | where it went | latest orders | returns |
|---|---|---|---|---|---|
| 10 | 8 | 6 | 6 | 10 | 4 of 4 |
| 8 | 6 | 4 | 6 | 8 | 4 of 4 |
| 6 | 4 | 2 | 6 | 6 | 4 of 4 |
| 4 | 2 | 1 | 4 | 4 | 4 of 4 |
| 2 | 1 | 1 | 2 | 2 | 2 of 4 |
| 1 | 1 | 1 | 1 | 1 | 1 of 4 |

The API side was checked without a browser too: recent scans, latest orders and the returns card
all cut to the setting, over an account imported with twelve receipts.

**The list order** was `useState('Name')` written once on All vendors and again on All categories —
one answer in two places, which is two places for it to drift. One setting, offering only the three
orders both lists have (Name, Spend, Saved); vendors' own *Orders* and categories' own *Share* stay
on the pages, since a default naming either is one the other list cannot honour. Both lists open in
the chosen order and the segmented control shows it: *Name* → Bilka, Coop, Elgiganten and Clothing,
Eating out, Electronics; *Spend* → Zalando, Matas, Jysk and Everything else, Electronics, Household;
*Saved* → Zalando, Bilka, Jysk and Everything else, Household, Electronics.

Both settings refuse what nothing obeys. `cardRows` of 0, 3, 7, 11, 999, −1, `"ten"` and `null`, and
`listSort` of `orders`, `share`, `colour`, `""`, `null` and `7` are all rejected with the stored
value standing — checked one by one, 14 of 14.

### The graphic above a list is height the list does not get

Filling every card to ten made the card with a donut three rows taller than the card beside it. The
entry count is now the setting less whatever the card drew above its rows, measured by the list
against its own card body rather than tabulated per card — so a headline figure and caption cost Top
vendors two rows, a chart and a caption cost the Orders card four, and the donut costs the breakdown
three, none of which is written down anywhere. Measured on the dashboard row at 1440x900: three
cards, **586px each, 1px, 17px and 1px of unused space** — against 403px and about 300px before any
of this.

Two traps inside that. The row height has to come from a *row*: an entry list opens with its own
heading, so measuring the first child measures a 15px label, divides the graphic by that, and cuts
every card to one row whatever the setting says. And the fold that shortens the ring's list had been
shaped for the legend that first drew it — `{id, name, colour, spend}` — so the first card to render
it as a category *record* crashed on `percent(category.share)`, at settings small enough for the fold
to appear at all. It carries share, saved, orders and a glyph now, like the records it stands for.

A card may still hold fewer than the setting: August had four returns beside a list of ten orders, so
it draws four and keeps its neighbour's height — **690px both**, 323px of it empty, which is the
month being short of returns and not the layout being wrong.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`,
0 page errors. **Not run:** Gecko and WebKit are not installed in this container.

---

## Home — the card with a one-line header gave up two rows

A card's entries are the entry count less what the card drew above them, and the deduction rounded
*up*. Top vendors' headline figure and caption measure **58.7px** against a **56px** row — 1.05 rows
— so it was charged two, gave up 56px to cover 2.7px of overflow, and drew 8 rows where the card
beside it drew 9 and the row it shared was tall enough for 9.

Rounding is what minimises the leftover: a card's content then lands within half a row of the height
it is aiming at, rather than up to a full row under it. Measured at 1440x900 with the setting on 10,
against a target of `10 x rowHeight`:

| card | above the list | in rows | drew | off target |
|---|---|---|---|---|
| Top vendors | 58.7px | 1.05 | 9 rows | **+2.7px** |
| Orders | 208.4px | 3.72 | 6 rows | −15.6px |
| Category breakdown | 150px | 2.63 | its 6 categories | −78px (list ran out) |

Two smaller things came out of the same measurement. The fold row counts against the budget now — a
card given room for seven drew seven real rows *and* the "3 more categories" row, so it stood one
row taller than its neighbour for a row it had not been given. And a budget of one used to spend its
single row on the fold itself, drawing a ring of one grey segment under a row naming nothing; at
least one real entry survives the fold, one over budget, because the alternative is a chart with
nothing in it.

### The check that could not fail

The first version of this measured **unused space per card** and came back 1px, 17px, 1px — clean —
on the same build that shipped the defect. The account under test had six categories with spend,
fewer than the card's budget, so the breakdown never stretched the grid row and there was no gap for
the short card beside it to fail to fill. The rounding was wrong the whole time; the fixture was too
small to show it, and an account with nine categories showed it in a screenshot at a glance.

What replaced it asserts the arithmetic instead: a card's content should land within half a row of
`setting x rowHeight`. That fails at **−53.3px** for the ceiling rule on any dataset, and passes at
+2.7 / −15.6 / −21 for the rounding one. A check that only fails when some other card happens to be
tall is a check on the fixture.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`,
0 page errors. **Not run:** Gecko and WebKit are not installed in this container.

---

## Chrome — settings lived at the foot of one rail

Every default in the app — what the order form opens with, how many entries a card holds, which
order the vendors and categories lists open in, whether a trash asks first, how many orders a page
shows — was reached through a full-width **ORDER SETTINGS** button at the bottom of the right-hand
rail on the Orders overview tab. One tab, of one page, below a category breakdown and a chart; and
titled *Order settings*, after the one part of itself that page happened to own.

It is a glyph in the top bar now, in the 32px tier the back arrow and the top-bar actions already
use, present on every screen. Driven rather than asserted from the markup: nine routes — Home,
Orders overview, All orders, Statistics, Vendors, All vendors, Categories, All categories, Scan —
each loaded fresh, the glyph pressed, and the arrival checked. **9 of 9 at 1440x900 and 9 of 9 under
`devices['iPhone 13']`**, every one landing on `#/settings` with the heading reading *Settings*, and
the ORDER SETTINGS button gone from Orders. 0 page errors at both widths.

The route lost its back arrow and its sidebar key with the move: there is no one page it came from
to send the reader back to, and it belongs under no rail item.

---

## Home — a card with no neighbour was still paying for one

The entry count less what a card drew above its list keeps a card level with the card beside it.
A card with nothing beside it was paying the same toll for a neighbour it did not have — the Orders
card on Home sits on a grid row of its own at 1440 and drew **6 rows of a setting of 10**, four
entries given up to leave room for nothing. On a phone the grid is one column and every card was
doing it: the whole dashboard, cut to make space for cards that were stacked above and below rather
than beside.

Whether a card has a neighbour is read from the layout, not passed in — it is a fact about the grid
at this width, and a card told once would go on believing it at every other. Measured at 1440x900
and under `devices['iPhone 13']`, setting on 10:

| card | 1440 | beside it at 1440 | phone |
|---|---|---|---|
| Category breakdown | 6 (all it has) | Spending rhythm, Top vendors | 6 (all it has) |
| Top vendors | 9 | Spending rhythm, Category breakdown | **10** |
| Orders | **10** | — | **10** |
| Latest orders (Orders overview) | 10 | Returns, Category breakdown | 10 |
| Returns (Orders overview) | 4 (all August has) | Latest orders, Category breakdown | 4 |

Every card closes within 1px of its own content except the two whose lists ran out — the breakdown
at 73px, six categories against room for seven, and Returns at 323px, four returns beside a list of
ten orders. 0 page errors at either width.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

---

## Home — every row into the orders list dropped the window it came from

Under a card headed *Where it went · Aug*, the row reading **Clothing 5.152 kr.** opened
`/orders/all?category=…` — every Clothing order the account has ever held, no dates, a list whose
total contradicts the figure that was clicked and whose filter chips do not mention August. The
same on the two category rings reading *Spent this month*, on Home and on Orders overview, and on
the rows for whatever has no category.

Nothing about it looks broken. The destination is a real, filtered, working list; it is a list of
the wrong thing, and the only way to see that is to add up what it holds. So the check is the
figure rather than the query string: each row's own amount against the total of the orders its link
actually selects. Measured at 1440x900 and under `devices['iPhone 13']`, every link on Home and
Orders overview that opens the orders list — **21 and 8 links, both widths, every one exact**:

| card | row | dated | row figure | list total |
|---|---|---|---|---|
| Where it went · Aug | Everything else | yes | 7.169 | 7.169 |
| Where it went · Aug | Household | yes | 560 | 560 |
| Category breakdown | Health | yes | 3.171 | 3.171 |
| Top vendors | Zalando | no | 49.673 | 49.673 |
| Top vendors | Netto | no | 26.546 | 26.546 |

The undated ones are undated on purpose and check out the same way: Top vendors is an all-time
figure under an all-time caption, SEE RETURN HISTORY is the whole history by name. A card with no
window to pass on passes none.

The link is built in one place now rather than composed at each of the four call sites, because a
filter dropped from one of them is invisible: it still navigates, still filters, still looks right.

### The probe that failed everything

The first run reported a mismatch on every row, including rows that were correct. It forwarded the
page's own query string to the API — and the list page's parameters are not the API's (`category`
against `categoryId`, `vendor` against `vendorId`), so the filter was silently dropped and every row
was compared against the same whole-month total. It also compared links to a *single order* against
a list total, which cannot agree. A probe that fails everything is as useless as one that passes
everything, and it took longer to disbelieve than a probe that had simply said nothing.

## Home — the hero offered five windows on the screen that answers one question

The hero card carried the same five widths Statistics offers — Week, Month, Quarter, Year, All — so
the app had two screens where a stretch of time is chosen and only one of them with a pager, a
comparison against the window before, four summary tiles and a returns card to go with the choice.
Home answers *where am I this month*; the chips are gone and the card is the current month, with the
header opening Statistics, which is the page built for the rest.

The range went out of the API with them: `GET /api/home/hero` took a width, validated it against
five names and returned which one it had used, all to serve a control that no longer exists. It
takes no parameters now and its response carries no `range`. The bucketing on the client went too —
it existed to draw a year as twelve points under twelve marks, and a month is at most 31 days
against a scale that fits 31, so every point is its own day. Measured after: one request,
`/api/home/hero` with no query string, heading *Spent · August 2026*, **0 range chips** at 1440x900
and under `devices['iPhone 13']`, 0 page errors.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

---

## Charts — three of five line charts never said where today was

Home's Orders card drew a dot on today's point. Orders overview drew a haloed disc on it. The
hero, the savings chart and every chart on Statistics drew nothing — so the same question, *where
on this line is now*, had three answers depending which card you were reading.

It is one mark now: a 4.5px circle, white, stroked 2px in the line's own colour, on the point the
window says is today. The window says it — `todayIndex`, null when the window holds no today —
rather than each page working it out from a day count, because "is today inside this window" is a
fact about the window and three pages deriving it separately is three chances to mark a month that
ended in March.

The sweep is the point. Rather than checking the three charts that were changed, every `svg.chart`
in the app is enumerated from the DOM across eleven states and eleven cards, at 1440x900 and under
`devices['iPhone 13']`, against one rule: one marker per line that runs through today, on that
line, in that line's colour; none on a comparison line; none at all in a window paged into the
past. **0 failing, both widths, 0 page errors.**

| state | chart | lines | markers |
|---|---|---|---|
| Home | hero, spend and saved | 2 | 2 — both run to today |
| Home | Orders, Saved vs retail | 1 each | 1 each |
| Orders overview | this month against last | 2 | 1 — the paler line is last month |
| Statistics · week / month / quarter / year / all time | current against previous | 2 | 1 |
| Statistics · March, · 2025 | current against previous | 2 | **0** |

The inset came with it: the circle paints 5.5px past its point and a running total peaks on its own
last day, so the plotted band is inset 6.5px top and bottom on every chart that carries a mark. It
was 3px on the savings chart, which would have clipped the circle in half, and 17px on Orders
overview, held for a halo of r=13 that no longer exists — that chart's line has 10.5px more height
to use.

## Data Rows — an order's total was listed three ways

Four screens list orders: the latest on Home, the latest on Orders overview, the returns card on
two pages, and All orders. Between them the money column had three shapes — rounded with no saving,
rounded with no saving, and exact with a saving printed *only where it was positive*. So the same
order read `1.510 kr.` on one card and `1.509,88 kr.` with a line under it on another, and within
All orders the column changed shape row to row depending on whether that order had saved anything.

One shape now, in all four: the exact total, and beneath it `saved …` in the muted tone, on every
row. **A zero is a figure and is printed** — an order at full price reads `saved 0,00 kr.` rather
than a blank where every neighbour has a line. Swept from the DOM across six routes at both widths:
**every order row in the app carries the saved line, 100% of rows, and every one prints decimals**;
vendors and categories keep their own rounded record shape, consistently within itself.

The sweep caught its own regression on the way: the returns payload had no `saved` field, because
those rows had never printed one, so the first run of the fixed markup drew `saved NaN,undefined
kr.` in the two returns cards. A per-call-site check would have shown two lists agreeing with each
other and disagreeing with reality.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

---

## Data Rows — one saving, three styles; and one question, sorted three ways

Two findings from a full-app consistency sweep (13 routes, both widths, everything enumerated from
the rendered DOM), fixed together because both are the same defect shape: one fact, drawn
differently depending which screen happened to draw it.

**The saved line.** The `saved …` line under a total is drawn by three row families, and the
stylesheet held three specs for it: muted 500 in `.entry-amount-sub` (Home, Orders overview,
Returns), green 600 in `.order-row-total-saved` (All orders) and green 600 in
`.entity-row-amount-sub` (All vendors, All categories) — the same fact in two colours and two
weights, on the lists most often read side by side, and two of the three against the README's own
"muted tone" rule. One spec now. Measured across the six routes that draw the line: **69 instances
at 1440, 70 under `devices['iPhone 13']`, every one `rgb(99,109,100) / 500 / 11px`** — one spec of
one, where the same sweep read two of three before.

**The sort control.** Three working lists ask "order this list by", and they asked it two ways with
two vocabularies: All orders with a combobox offering *Date, newest / Amount, highest / Vendor,
A to Z*, the vendors and categories lists with a segmented control offering bare *Spend / Name /
Orders / Saved* — direction unstated, so *Spend* was secretly highest-first and the reader found
out by pressing it. They also led with Spend while opening on Name, so the selected option sat
second in its own list.

One control and one vocabulary now — and one *scheme*: every ranking column is a pair, on all
three lists. The first pass of this fix gave vendors and categories one direction per column while
All orders offered pairs, which is the same defect moved into the option list. Every ranking
column is a pair now (*Spend, highest / Spend, lowest*, *Orders, most / Orders, fewest*, *Share,
highest / Share, lowest*, *Saved, highest / Saved, lowest*), and the stored setting carries the
direction (`name-asc`), exactly as the orders sort's ids always have — existing bare values
migrated to the direction they always meant, 218 rows checked converted. Settings' "Sort vendors
and categories by" offers the shared five under the identical strings. Driven, not asserted:
**every direction reverses or restores its list** — 6 on vendors, 6 on categories, 4 on All
orders — the directed setting ids round-trip and bare or foreign ids are refused, and *saved-asc*
set once opens vendors on Netto and categories on Home office, at 1440, 0 page errors.

The second pass then over-corrected: symmetry handed every column a pair, including *Vendor,
Z to A* on All orders and *Name, Z to A* on the other two lists, and the alphabet is not a
ranking. The pair rule is about ranking columns, where the reverse answers a different question
("cheapest?" is not "dearest?"); an alphabetical column orders a list for *finding* a record,
and Z to A finds nothing that A to Z cannot. So Vendor and Name stay *A to Z* alone, migrations
map a stored `vendor-desc` or `name-desc` back to the direction that stays, the settings route
now refuses unknown orders-sort ids the way it always refused unknown list-sort ids (the one
field the "stored preference nothing obeys" rule was not yet enforcing), and the README rule
names the exception rather than leaving single-direction columns to read as an oversight. The phone toolbar held: all
three toolbars at 86px, two rows, 0 element overhang, 0 document overflow — checked per element,
since `.main-panel` clips overflow and a clipped overhang never widens the document.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

## The stylesheet that was being overruled by its own pages

**The defect.** The app carried 122 `style` attributes, and about 90 of them were system values
— margins, gaps, sizes, colours out of the token set — written on elements instead of into the
stylesheet. CLAUDE.md had already recorded the mechanism once ("an inline style in a port
outranks every rule the shared stylesheet can write") for a toolbar width; this pass found the
same mechanism live in the shipped app, twice. `.stats-window .panel-heading { font-size:14px }`
sits in the phone media block and had never rendered, because the pager heading carried
`fontSize: 16` inline; `.space-between > .row-inline { gap:6px }` in the same block was silenced
on Order detail's header actions and All orders' pager by inline `gap: 8`. Two phone rules,
written, shipped, and never once drawn.

**What the inline copies were also hiding.** Values that had drifted apart inside the same slot,
which no grep of the stylesheet could see because the stylesheet never had them: the meter under
a figure sat 14px below it on two pages and 16px on Home; the chart under its caption row 8px on
two cards and 6px on the hero; the divider above a summary total 4px in two files (via
`card-divider-tight`) and 2px inline in two others; the icon-action cluster on a data row
`gap:2` in the order forms and `gap:4` on Order detail; two drop targets with two drag-over
outline offsets; Settings' three block buttons at an inline 8px above the lead while
`.button-block` itself says 12; the scan hero's check drawn `#12A56B` beside a `--green` that is
`#14AC72`; and the auth pages' status line — a third styling of the `form-status` verdict the
order forms already define, at 13.5px/500 with a `var(--red, #C0392B)` whose token does not
exist, so the fallback was the colour. Each is now the one value, under the one name.

**The conversion.** Every fixed layout value moved into `react/src/styles/app.css` under a
named class — shared names where the pattern repeats (`.card-lead-flush` ×4, `.summary-saved`
×3, `.chart-legend-fill` ×3, `.row-actions`, `.push-end`, `.is-dragover`), component names
where it does not. What stays inline is the data speaking: record colours, chart shares and
positions, a dragged row's captured size, the toast stack's measured top. Chart, Meter,
WeekdayBars, ProgressBar, DocumentPreview, Note and StatusChip gained `className` passthrough
so call sites can name their slot without a wrapper element. Moving the toast's show transition
into the stylesheet also retired its JS reduced-motion check: the global reduced-motion block
now reaches it, which the inline transition was the one thing preventing.

**Measured.** 52 states — every route plus the driven ones: both confirm dialogs, the added
order line, scan review and its line editor, login and register with their status lines rendered
— at 1440 and under `devices['iPhone 13']`, 10,659 element records per run, 42 computed
properties and a rect per element. The baseline was run twice and agreed at 0 differences before
the diff was trusted, and the harness needed one fix first: the filter panel's combobox options
land from a fetch tens of milliseconds after mount, and a settle loop sampling ~50ms of rAF
frames read the page both before and after they arrived on different runs — 150ms-spaced samples
settled it. After the conversion: **0 element-count changes, 0 tag mismatches, 1,162
differences, every one attributable to a named unification above** (the 2px cascades under a
moved chart account for most of the rect shifts), and the two states a navigation walk cannot
hold — a shown toast, a drag-over — probed directly. The first attempt also minted a colliding
`.form-status` beside the one that already existed, which the walk caught as 12→13.5px on every
form's verdict line: the fix was not a rename but using the existing class, which is how the
auth pages' third styling came to light at all.

**The follow-up sweep.** With the inline copies gone, the stylesheet's own duplication became
countable: 606 rules held 24 groups whose declaration bodies were identical under different
names. The same-concept groups were merged into one rule each — the four icon-size tiers
(15/14/17/13px, twenty scattered rules become four naming their contexts), the 13px and 13.5px
row-title families, the section-label restated verbatim in two scoped copies, the focus ring
written once for `:focus-within` and again for an open combobox, the caption label, and the
saved-subline that the money-column fix had made one spec in three copies. 609 rules to 582,
and the walk read the merge at **0 differences of 10,659 records across 52 states** — a
grouped rule either renders identically or it was not the same rule. Coincidence groups
(`.sidebar-nav` and `.icon-picker` both happening to be `grid; gap:8px`) were left apart:
merging those couples things that only agree today.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`.
**Not run:** Gecko and WebKit are not installed in this container.

## Order Detail — the reading view was paying rent for the form's job

The detail page drew a live, full-width Status segmented control between the category chips and
the items card — a band as tall as any form row, editing the one field the edit page's own
Status control already edits, on the page whose README rule is "the detail page shows, the form
page changes". Removed on review: status is read in the summary card's own row and changed on
the edit page like every other field. The removal was measured, not assumed: the detail page
renders no `[aria-label="Order status"]` and no `.order-status-field` (0 matches app-wide, rule
deleted), the summary row still states the status, and the edit page's `[role="tablist"]
[aria-label="Status"]` still stands. Verified in Blink; Gecko and WebKit not installed.

## Settings — FILL WITH DEMO DATA reset more than it replaced

The fill reused the account wipe that CLEAR STORED DATA uses, so pressing it deleted the
settings row and the dashboard layout along with the ledger and re-seeded the defaults — a
button whose confirm copy promises "every order, vendor and category you have added is removed
first" was also handing back the shipped page size, sort order and card layout. The fill now
wipes the ledger tables only. Driven: page size 25, list order *Spend, lowest* and four entries
per card survive a 400-order fill unchanged, and CLEAR STORED DATA still returns all three to
the shipped state — the two buttons finally differ by exactly what their copy says.

## Feedback — the toast's one line rode high against its dismiss

The toast row was `align-items:flex-start` with a 1px nudge on the glyph, which top-aligned a
19px sentence against a 26px dismiss button — every toast read as a misprint by a few pixels.
The row centres now: glyph, sentence and dismiss measured at a shared vertical centre, worst
offset **0.00px**, with the row's own box as the reference. Verified in Blink.

## API — endpoints the app had stopped asking for

Removing features left surface behind, found by sweeping the whole boundary rather than the
removals remembered: every route the API serves against every path the client calls, then
every client export against what pages import, then every API-side export against its
importers. Dead and now gone: `GET /api/orders/:id/draft` (the client has always composed the
edit draft from `GET /api/orders/:id` itself), `GET /api/scan/documents` and its client
wrapper (the scan flow goes upload → review with the key in hand; no screen lists raw
uploads), `react/src/api/seed.js` (the phantom store's 376-line dataset, imported by nothing
since the API port), the API-side `SORTS` and `RANGES` constants (dead copies of option lists
only the client reads — a copy imported by nothing is drift waiting to happen), and the
`selectUploads` statement and `defaultCardRows` export those left behind. Kept deliberately:
`POST /api/orders/import` and its wrapper (the documented entry point for external
migrations), and `DELETE .../items/:itemId/attachments/:attachmentId` — unused not because it
is stale but because no screen offers removing a saved item photo, which is a gap, not
leftovers. Driven: both removed endpoints answer 404, upload → draft (the OCR plug-in point)
→ recent all still serve, the import endpoint still validates, and the full 52-state walk
renders identically to the pixel where nothing was meant to change.

## Settings — the import card invented a second header band and wrote prose into its JSON

Two consistency misses on one card, both caught in review rather than by the sweeps. The
disclosure shipped as a boxed icon-button riding a passive header — a second implementation of
a band the system already had, since a navigating card header is the whole band with a bare
chevron in its right-hand slot. The disclosure is that same band now: `CardHeader` renders a
`button` styled by the same `.card-header` rules, same 44.75px as every header beside it, the
chevron pointing down or up instead of right. And the JSON blocks carried annotation prose
inside them; the boxes hold only the request or the response now — three of them, each parsing
as real JSON, each explained in ordinary text beneath its own box. Driven at 1440 and on the
phone descriptor: band toggles both ways, chevron rotates, three boxes parse, prose only
outside them, 0 overhang, 0 page errors. Verified in Blink.

## Empty states — two sat left, and the actions offered lists with nothing in them

A fresh account is a state of every page, and driving all ten routes through one found the
absence-shaped defects clustered there. Measured against the card body's inner edge, the
Categories Breakdown and Vendors Where-it-goes empty states sat at **20px left / 840px right**
in a 1154px body while every other one measured 20/20: `.empty-state` is a block-level grid
and fills a plain body on its own, but those two bodies are the ring-beside-legend flex row,
where a flex item shrinks to content and sits at flex-start. The fix is one declaration,
`flex:1`, on the class — after it, all thirteen empty states across the ten routes measure
symmetric at 1440 and on the iPhone 13 descriptor (20/20 everywhere, 0 document overflow).

The stale actions were the same sweep's other column. On an account with no records at all:
ALL CATEGORIES closed the Categories budget card over an empty list, under a sentence
instructing "open a category" with no category to open; ALL VENDORS did the same on Vendors'
favourites; Latest orders on Orders overview drew **a lone SEE ALL and no empty state at
all**; the category breakdown there kept its toggle, a grey 0 kr. ring and ALL CATEGORIES over
zero rows; SEE RETURN HISTORY closed both returns cards onto a filtered list matching nothing;
Scan's recent card drew a bare grey inset band with SEE ALL ORDERS under it; and All orders
answered an empty account with "No orders match these filters" plus CLEAR ALL, blaming filters
nobody had set. The two all-list pages also answered emptiness as a bare left-aligned help
line rather than the system's own empty state. Each list-opening action now exists only while
its list has rows — including the two pages' header chevrons into the empty lists — the
returns cards read the account's own returned-order count rather than the window's (a quiet
month over a year of returns keeps its history button), and the create action is what an empty
account is offered, in the same words on every card that offers it. The six-month bar chart's
"is the highest" note needed the same guard: reduce over all-zero columns picked the first and
named it highest over an account that had spent nothing.

Driven twice, fresh and demo-filled, all ten routes at 1440 and the empty states again on the
iPhone 13 descriptor: fresh shows 13 empty states all at 20/20 with zero list-opening block
buttons or linked headers onto empty lists; filled shows every button and linked header back,
zero empty states outside the scans card (demo data creates no scans), and no console or page
errors beyond the pre-existing 401 the signed-out `auth/me` probe answers. Verified in Blink;
Gecko and WebKit unverified.

## Order Detail — the row's figures dropped to a line of their own, over room they never measured

On a phone, every row on Order details broke after its title: the item rows put their total on a
second line, and the attachment rows put all three of their buttons there, right-aligned under
130px of empty first row. The titles those rows carry — "Vaskepulver, 2 kg", `IMG_4309.jpeg` —
fit with room to spare, so the break read as a bug about space and was not one: it was the phone
rule the line *editors* need, reaching rows it was never written for.

The phone stylesheet wraps `.item-row` and gives the title block `flex:1 1 64%`. That basis is a
reservation, not a measurement — it decides where the flex line breaks before the text has a say,
so any trailing group wider than what 64% leaves goes to the next line whatever the title's actual
length. On New/Edit order's line editor that is the right trade: a grip, a 36px tile, a nowrap
price and two buttons genuinely leave the description nothing (grouped, its title measures **64px**
and stacks mid-word two and three lines tall — measured before deciding those pages keep the
wrap). On Order details' read rows it charged the same price with nothing to buy: a lone total, or
three 44px buttons, dropped below a title using a fraction of its line.

The fix is an opt-out a row states, `.item-row-group`, defined only inside the phone media block —
desktop carries no rule for it and is untouched, as is every row that does not claim it. A grouped
row keeps `flex-wrap:nowrap`, hands the title block `flex:1 1 auto`, and truncates the title to
one line with an ellipsis — `overflow-wrap:anywhere` on a grouped row breaks a long filename
mid-word into a narrow multi-line column, which is how a 112px attachment row happened. The meta
already truncates from the base rules. The full name stays reachable where each row already shows
it: the attachment's in the preview under the row, the item's on the order's edit page.

Measured on `devices['iPhone 13']` at `deviceScaleFactor: 2`, Blink 141.0.7390.37, demo data plus
one short-named and one long-named attachment:

| row | before | after |
| --- | --- | --- |
| item rows | 81px, total on line 2 (7px under the title block) | 56px, total on the title line |
| attachment, `tiny.png` | 94px, three buttons on line 2 | 56px, buttons on the title line |
| attachment, 42-char name | 112px, name wrapped mid-word over two lines | 56px, name ellipsized |
| title block width | 276px (the whole row) | 199px items, 160px attachments |
| overhang past the row | 0 | 0 |
| document overflow | 0 | 0 |

Verified in Blink only; Gecko and WebKit are not installed and were not checked. The New and Edit
order line editors keep the 64% wrap on purpose, measured above — grouping is a claim the title
can afford, and there it cannot.

## Form Validation — the scan review submitted a blank line, and the 400 came back as "try again"

ADD LINE on the scan review seeds its blank row into the draft the moment the editor opens, and the
draft is what SAVE ORDER sends. The line editor's own rules ran only at its SAVE LINE button, so a
line abandoned mid-edit — the editor still open at save, or left behind by opening another line's
pencil — travelled to the API as `{"title":"","quantity":1,"price":0}`. The save's guard counted
lines (`needs at least one line`) without checking any, so one blank line passed where zero lines
were refused.

The server refused it correctly — `POST /api/orders` 400, `"Describe the item."`, the same rule from
`ORDER_FIELDS`/`ITEM_FIELDS` both doors share — and the form's catch flattened that sentence into
"That did not save. Try again.": a validation failure reported as a network blip, with no field
marked and nothing on screen naming what was missing. Retrying resubmitted the same rejected draft.

The fix is both halves of the sentence the README now states. Saving sweeps every line in the draft
with the same three rules the line editor runs, reopens the first line that fails and names the
field in the status line; and a refused save shows the API's own sentence in the feedback layer,
keeping the generic line only for errors that carry none. New order and Edit order admit items only
through their validated item form, so the sweep is the scan review's alone.

The flattened catch was a class, not a site, and the app-wide count settled its scope: of the 20
write-path catches, 3 flattened the server's sentence into a generic line, 6 more threw the error
away for their own generic line, 9 showed the sentence but fell back to the browser's raw transport
prose ("Failed to fetch") on a network failure, and 3 writes had no catch at all -- a failed scan
upload did nothing, a failed scan-document attach lost the receipt silently after the order saved,
and the dashboard-card editor toasted "Your cards were saved." before the request settled and then
swallowed the refusal under a comment about localStorage, a relic of the phantom store. The rule now
has one copy -- `failureMessage(error, fallback)` beside the ApiError it reads -- and every write
catch shows the server's words when it has them and the action's own sentence when it does not.
The three legitimate exceptions are named rather than silent: the dashboard grid's sessionStorage
probe (not an API call), the command palette's per-keystroke search (aborts and degrades to empty),
and the stale-chunk reload in the router (the reload is the handling).

Measured after, in Blink 141.0.7390.37 (headless, 1280x720), driving the app from a fresh account
through upload → review: SAVE ORDER over zero lines shows "An order needs at least one line.",
**0 POSTs**; ADD LINE then SAVE ORDER without saving the line shows "Cannot save — Description
needs fixing.", reopens the line's editor with focus on `line-description`, **0 POSTs**; filling
and saving the line then saves the order with **1 POST** and lands on the order page. The catch
was measured by interception on a previously-swallowing site (Settings): a routed 400 with
`{"error":"The server said no."}` toasts exactly **"The server said no."**, and the same control
with the request aborted toasts the action's own **"That did not save."** Gecko and WebKit are not
installed and were not checked.

## Language and Formats — every date was written in one reader's shape

Every date in the product was assembled from a hardcoded English month list, day-first, with a
dotted short form; the one timestamp on the settings page was built with `toLocaleString('da-DK')`
and printed "12. august 2026 kl. 11.30" — Danish prose in a product whose copy is English. Both are
the same mistake pointing opposite ways. `da-DK` is the *number* grammar's locale, borrowed for a
date because it was the locale already in the file, and the month list was one reader's shape
frozen for every other reader.

Nothing could catch either. A date renders, renders identically run to run, renders the same in
every engine, and has correct geometry and computed styles in all of them — a wrong shape is a
*correct render of the wrong thing*, which every instrument in this repo agrees with.

Two traps under the fix, both of which render a plausible wrong answer rather than failing:

A date-only value is a calendar day, not an instant. `new Date("2026-07-18")` parses as midnight
**UTC**, so formatting it anywhere west of UTC renders the 17th — every date in the product off by
one for every reader in the Americas, with no error anywhere and no failing assertion. Building the
date from local components instead holds the day: verified at 18 July in Copenhagen, Los Angeles,
Tokyo and Honolulu. A timestamp is the opposite case and *must* convert, which is why the two are
separate functions rather than one with a flag.

And the screenshot harness named no locale, so it inherited the machine's. The committed shots were
rendered when dates were hardcoded; the same source on a box whose ICU default is `en-US` renders
"July 18", and the diff has nothing in it to say whether the app moved or the machine did. The
harness now names `en-GB` and `Europe/Copenhagen` — which is the render the shots already hold, so
pinning it changed nothing and stops the next machine changing everything.

## Language and Formats — the browser was asked which language its menus are in

Defends: *Asking the browser is asking a different question, so the reader is offered the answer*,
and the zone rule beside it.

The settings page told a reader in Copenhagen their build was made "August 18, 2026 at 02:26 PM
GMT+2". Every part of that is the fix above working as designed — the instant is right, the zone is
converted, the shape is the browser's — and the sentence is still wrong for the person reading it,
because `Intl.DateTimeFormat(undefined, ...)` resolves to `navigator.language`, which is the
language the browser's own menus are in. The regional format a reader writes dates in is a separate
OS preference, and no web API exposes it: a Dane running an English-language browser is `en-US` to
every formatter in the product, and the Unicode region override (`en-u-rg-dkzzzz`) that claims to
fix exactly this is ignored by this ICU — it returned the en-US shapes byte for byte.

So the shape is a setting now: `auto` (keep asking the browser, the shipped behaviour and the
default) or one of six locales spanning the currencies offered. One guess is made on the reader's
behalf, at registration, from the only regional fact a browser states plainly — its IANA timezone
(`Europe/Copenhagen` → `da-DK`, ~24 zones mapped, everything else stays `auto`) — and the guess is
then *shown*: the new account lands on the settings page once, told which control was set for it.
The picker's options each carry a sample drawn through the product's own formatter, because "Danish"
names a shape nobody can see from the label. Two traps under the fix: the formatters are cached per
locale rather than once, or every date keeps the previous choice until a reload, which reads as a
setting that did not save; and an unknown code reaching `Intl.DateTimeFormat` throws rather than
falling back, so the server refuses anything off the list and keeps what is stored — verified by
PATCHing `nonsense-tag` and reading `da-DK` back.

The stamp also stopped naming its zone. "A converted time with nothing marking its zone cannot be
told from the raw one" is true of a time that travels; this one is shown to one signed-in reader on
their own machine, where GMT+2 was a label on their own afternoon.

Measured, in Blink, browser language `en-US` with zone `Europe/Copenhagen` — the reporter's exact
pair: registration posts `da-DK`; the landing headline reads Welcome to Spendly; the stamp renders
"18. august 2026 kl. 14.26" at weight 600 over its lead's 500; the seven options render six
distinct stamps (auto duplicates en-US, as it must on this profile) and the new-order summary date
follows the same setting (`18.08.2026`, `18/08/2026`, `2026-08-18`, `08/18/2026`); a second sign-in
lands on Home; nine routes render with no error card and no page errors. `.card-lead b` matches
exactly one element app-wide. The screenshot harness registers over the API with no locale, so its
account stores `auto` and keeps the pinned `en-GB` render — the committed shots are unaffected, and
were not regenerated. Gecko and WebKit unverified — not installed, and nothing here is
engine-shaped.

## Language and Formats — money was formatted at every site that printed it, and one of them was the server

How an amount looks was decided wherever an amount was printed, and nowhere else — so the product
held one answer per site and no rule anywhere. That is invisible while there is one currency, which
is every account the product had until the symbol became a setting: with only one right answer,
every copy of it agrees.

Six of those sites ended a sentence with an amount. Five wrote a full stop after it and printed
`1.187,25 kr..`, because `kr.` already carries one. The sixth had exactly that doubling reported
against it, deleted **its own** full stop, and left the other five — the fix went to the instance in
the report rather than to the rule, which is the same failure as fixing the one card on screen, and
it left a comment behind explaining why this one line had no stop.

Then the currency became a setting and the deleted stop became a second bug pointing the other way:
`$20.680` carries no full stop, so the one place that had been "fixed" was now the only place
leaving a sentence unpunctuated. Whether an amount closes a sentence is a fact about the symbol, so
neither writing the stop nor deleting it can be right in a product with more than one currency —
it has to be asked. Asking it in one function is also what makes the count checkable: six call
sites, one rule, and the doubling cannot come back to the sixth after being fixed in five.

Three more of the sites were not in the client at all. Those statistics tiles arrived from the API
as finished strings — `"1.510 kr."` — built with a hardcoded symbol and Danish grouping, which made
the server the one place in the product deciding how an amount looks. It is the wrong place twice
over: the currency belongs to the account and the grammar to the client, and the server was told
neither. An account that chose dollars read its own averages in kroner on one card and in dollars on
the card beside it.

Eleven money *inputs* had the same defect from the other side, with `kr.` written into the markup as
the unit label — so a dollars account typed into a field labelled in kroner while the figure it
rendered underneath said dollars. The defect was latent in the markup for as long as there was only
one right answer.

The tell that found all of them was cheap and worth keeping: switch the account to a currency whose
symbol is not `kr.`, then grep the rendered page for the old one. Anything still printing `kr.` is a
place that never asked.

## Vendors — the vendors list was the one vendor search that ignored aliases

Defends: *A vendor answers to more names than the one it shows*, and its clause about one match
rule per runtime.

An account files Netto receipts under Salling Group, with Netto stored as the alias that makes the
filing automatic. Typing Netto into the vendors list's own search answered `No vendor matches
"Netto"` — the one screen devoted to vendors refusing a string the order form, the importer, the
scan review and the command palette all resolve. Enumerating the class instead of fixing the
instance found a second, worse case: the All orders text filter had the same gap, so
`/api/orders?query=Netto` returned 0 while `/api/search?query=Netto` returned the order — two pages
stating the same fact and disagreeing, on one account, in one session, which is the two-pages rule
exactly.

The cause was structural, not a typo. `lib/textSearch.js` shared the *mechanics* of matching — the
Unicode fold LIKE cannot do, the `%`/`_` escaping — but "which vendors does this text find" was
restated at every site that asked: the palette's statement remembered the aliases, the orders
list's forgot them, and the vendors page's client-side filter never knew. A rule spelled out where
it is used is a rule the next place has to remember.

So each runtime now states it once, next to the resolution rule it mirrors. The server grew
`vendorIdsMatching` in `lib/textSearch.js` — name or any alias, one fragment composed into an
`IN (...)` by both the orders filter and the palette. The client grew `vendorTextMatch` beside
`vendorByAnyName` in `client.js`: resolution answers what a string *is* (exact), search answers
what it *finds* (substring), and the vendors list now consumes the answer instead of writing one.
The row names the alias that matched (`… • also Netto`), since the typed text may appear nowhere in
the row it returns, and the field's placeholder says "name or alias" because copy that enumerates
is a contract.

The first cut of the fragment used UNION, and `queries:check` flagged it: the merge sorts both
sides in temp B-trees, for a dedup that buys nothing inside a membership test. UNION ALL removed
every sort — 14 findings down to 6 — and the remaining 6 are byte-identical to the walks the old
statements were already blessed with, carried forward.

Measured, in Blink: on All vendors, the alias returns its parent vendor with the alias named in the
meta, a partial (`nett`) and a second alias both match, a name match adds no clause, a miss still
misses, and the header counts `1 of 2`. Over the API, the two routes answer identically for
`Netto`, `nett`, `Salling`, `zzz` and `føtex` — the last through the non-ASCII fold path. No page
errors. Gecko and WebKit unverified — not installed, nothing engine-shaped.

## Vendors — the order forms' own vendor picker was three more copies of the same gap

Defends: *A vendor answers to more names than the one it shows*, the same clause the entry above
defends, against the same rule breaking the same way at sites that entry never reached.

An account with COOP filed under the alias `cop` typed `cop` into New order's vendor field and
found nothing — the dropdown never opened the action row, never listed COOP, nothing. The fix
above added `vendorTextMatch` (name-or-alias, substring) and wired it into All vendors' own
search field, the orders list's server-side filter, and the command palette. It never reached the
combobox every order form's vendor field is built from: `Combobox.jsx`'s own filter matched an
option's `label` and nothing else, so a vendor's aliases were invisible to it regardless of what
any other page already knew how to find. Three call sites carried the identical hand-copied
block — resolve the typed text against `vendorByAnyName` for the CREATE/USE action row, build one
combobox option per vendor — and all three inherited the same blind spot, because the block itself
predates `vendorTextMatch` and nothing after it went back to update the copies.

Grepping every `getVendors` call site rather than trusting the two just fixed (New order, Edit
order) found a third: Scan's vendor field is the same wizard step with a different save path, and
carried the same block verbatim. A fourth site was a different shape of the same gap rather than a
missing action row — All orders' vendor filter has no create-a-vendor flow, so it was never a
candidate for the New order fix's copy-paste, but its combobox options were still built from
`v.name` alone.

`Combobox.jsx` grew one optional field: `search`, which the component's own filter matches against
when a caller supplies it, falling back to `label` when it does not — every other combobox in the
app (categories, sort orders, settings pickers) passes no `search` and is untouched. New order,
Edit order and Scan's shared block became `useVendorPicker` (`react/src/api/useVendorPicker.js`),
one hook wrapping `vendorByAnyName` for the action row and `vendorTextMatch` for the option list's
`search` field and its `also <alias>` meta clause, so a fourth order-form vendor field gets both
for free. All orders' filter has no action row to share, so it calls `vendorTextMatch` directly for
its `search` field the same way All vendors' search box already did — a second consumer of the
same function, not a second copy of the matching rule.

The tell worth keeping: fixing the two reported call sites and stopping there would have left Scan
and the orders filter exactly as broken as they were before the report, silently, because neither
was mentioned in the bug and neither renders anywhere near New order. `grep -rln getVendors
react/src/pages` and reading what each result actually matched on took under a minute and found
both.

## Checkbox row — two options on one settings page, drawn as prose beside a control

The Import tab's options had been rebuilt as checkbox rows — box, bold name, description hanging to
the name's edge — and the two on Settings / Overview, one tab away, were left in the shape that fix
replaced: a `<div>` holding a grey sentence with a switch pushed to the far right, no name to scan,
no divider, nothing marking one option from the next. The rows measured **26px and 34.78px** tall at
1440, padding **0**, the whole option a single 12px/500 `rgb(99,109,100)` sentence; Import's beside
them were **63.89px and 64.89px**, padding **13px 12px**, name 12px/**600** `rgb(11,15,13)` with the
description hanging **0px** off its left edge. The same product, two shapes for one question, decided
by which tab you were on.

What kept them apart was a rule, not an oversight: a switch states what is true now, a checkbox asks
what a later act should include, and these two save on the click. The rule cost more than it bought.
The timing it encodes was never legible from the control — nothing about a pill says "this is already
saved" — while the thing a reader *does* pay for is learning a second row shape for the same kind of
question. The confirmation is where timing actually shows, and both of these had a toast the whole
time. So the row is now the one shape for a binary option, and the README rule it defends says the
difference is in what follows the click.

Measured after, in Blink 141.0.7390.37 (headless), fresh account, both tabs in one run: rows
**63.89px and 64.89px** — Import's own two numbers to the pixel — `<label>`, 2 tracks with the first
at **20px**, gap 12px, padding 13px 12px, name 12px/600 `rgb(11,15,13)`, hanging indent **0px**,
divider **1px `rgb(237,239,234)`** between the rows and none above the first, box **20x20**. Both
states drawn three ways: fill `rgb(20,172,114)` → `rgb(255,255,255)`, edge `rgb(20,172,114)` →
`rgb(131,140,132)`, tick present only when checked. The click is the save: clicking the name and
clicking the description each toggle the box, the server reads back `showScanCard=false`, the toast
says "The scan card is off." and Home stops drawing the card. On the iPhone 13 descriptor with
`pointer: coarse` matched, a tap on the description toggles, rows stand **81.28px and 99.67px**, **0**
document overflow and no overhang past the card. Across nine routes `.toggle-help` and
`.switch`/`[role=switch]` match **0 elements**; twelve routes open with **0** error cards and **0**
uncaught page errors. Gecko and WebKit are not installed and were not checked.

## Checkbox row — the hover fill stopped 14px short of the divider it belongs to

On Settings / Overview the two options in *On screen* were drawn inside a `.filter-section`, whose
grid sets `gap:14px`. The divider between two rows is the following row's `border-top`, so the gap
opened **14px** of bare card between the end of the hovered row's tint and the line under it: one
stack of options rendered as two lit boxes with a strip of nothing between them, and the row's own
`border-radius` cut its bottom corners against the gap rather than against the divider. The Import
tab's two rows, sitting in a plain `.card-body` with no gap, met their divider exactly — the same
component, correct on one tab and wrong on the other, decided by the container above it.

The value the gap comes from now has a name (`--stack-gap`, declared where the gap is declared) and
a row that follows another subtracts it, so the stack closes up wherever it is put; a container that
spaces nothing resolves the property to `0px` and the rule takes nothing away.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, fresh account, 1440x900 at dSF2: between
the two rows on Overview, gap **14px → 0px**, divider **1px** on the second row, hovered fill bottom
**1291.02px** against the divider's top **1291.02px** — the same number, so the tint ends on the
line. Import's pair, unchanged by the rule, stays at **0px**. The change is CSS-only and the two
tabs' 4 check rows are its whole reach.

## Combobox — the panel outgrew the viewport, and nothing could scroll it

Every dropdown in the app is one combobox, and its panel is `position:absolute` — floated on the
card shadow, out of the document's flow. Out of flow means it adds nothing to the page's height: on
an account with enough vendors the vendor list ran hundreds of pixels past the viewport's bottom
edge, the page's own scrollbar never grew to follow it, and the panel had no `overflow` of its own —
so every option below the fold rendered, and could not be reached, hovered or picked. The category
list on the same forms was one screen shorter only because the account had fewer categories; the
defect was the panel's, and every combobox shared it. Reported from a real account's vendor list; a
fresh demo fill of 12 vendors reproduces it in a 720px-tall viewport.

The panel now caps itself at `min(342px, 60vh)` and scrolls inside, and the create-action at its
foot is `position:sticky` — the one row that is a promise about the foot stays in view while the
list behind it moves.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, fresh account, demo fill
`{seed: 1, months: 12, orders: 220}` (12 vendors), 1280x720:

| | before | after |
| --- | --- | --- |
| vendor panel `clientHeight` | 551px (whole list) | **340px** |
| `scrollHeight` against it | equal — nothing to scroll | **551px**, scrolls 211px |
| last option (*Zalando*) | below the viewport, unreachable | scrolled to, clicked, field reads **Zalando** |
| create-action, scrolled to either end | — | inside the panel both ends, gap 1px / 7px |

The category panel on the same page reads the same cap (340px against 472px of content) with no rule
of its own, which is the point: the fix is the component's, so no list a combobox is given can
outgrow reach again.

## Combobox — typing marked the matches and moved none of them closer

"Type to search" is the component's own promise, and typing did run a search — it just spent the
answer on a highlight. Every option stayed in the panel wherever it already stood, matches wrapped
in `<mark>` in place, so on a list long enough to scroll (the panel caps at 342px — the entry above)
a match past the fold was exactly as unreachable after typing as before it: the search *found* it
and the list never said so. On an account with ~50 vendors, typing a vendor's name left the
Favourites group and every non-match standing between the reader and the row they had just named.

Typing now filters: the panel keeps only the options whose label contains the typed string, a group
filtered empty gives up its heading with it (Favourites included), and a search that matches nothing
prints *No match for "..."* above whatever create-action the field offers. The one string that does
not filter is an option's own label standing whole in the field — that is the resting selection a
closed combobox displays, and reopening on it has to offer the full list, not the one row already
chosen. The mark stays; it now lands on rows that are all matches.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, fresh account, demo fill
`{seed: 1, months: 12, orders: 220}` (12 vendors, 2 favourite), 1280x720, on New order's vendor
field:

| typed | the panel |
| --- | --- |
| `` (empty) | 12 options in 2 groups (Favourites 2, All vendors 10) — unchanged |
| `pro` | **1 option** (Proshop), marked, under Favourites alone — All vendors dropped its heading |
| `zzz-none` | 0 options, *No match for "zzz-none".*, CREATE VENDOR "ZZZ-NONE" below it |
| `Bilka` standing whole | 12 options — the resting name filtered nothing |
| Proshop picked, reopened | 12 options — same rule after a click as after typing |

The category combobox on the same page, given `clo`, answered 1 option against the API's 1 — the
same rule, from the component, with no change of its own.


## Combobox — the list could be searched, and not walked

Typing filters the panel to the matches (the entry above), and then the keyboard had nothing more
to offer: Down opened the list and stopped, Up did nothing, and Enter either picked an exact name
or ran the create-action. A search that narrowed fifty rows to three still ended with a hand moving
to the mouse, because no key could mark one of the three and no key could take the marked one. The
input declared `aria-autocomplete="list"` — a promise of exactly this — with no
`aria-activedescendant` behind it, so a screen reader was told the list navigates and then given
nothing to navigate with.

Down and Up now move a mark through the options the panel shows — the filtered set, across group
boundaries, wrapping at either end — and Enter picks the marked row. The mark is indexed against
the *shown* list, never the full one, resets whenever a keystroke, an open or a close can have
changed the list under it, keeps itself scrolled into view inside the capped panel, and is named in
the input's `aria-activedescendant`. With nothing marked, Enter keeps its standing rule — exact
name picks, anything else creates — so the new path sits beside the old ones rather than across
them.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, fresh account, demo fill
`{seed: 1, months: 12, orders: 220}` (12 vendors, favourites Bilka and Proshop), on New order's
vendor field:

| keys | the panel |
| --- | --- |
| Down, field closed | opens, nothing marked — see the list, then walk it |
| Down | *Bilka* marked, in view, `aria-activedescendant` names its row |
| Up, Up from the top | wraps to *Zalando* — last row, scrolled into view inside the 340px cap |
| Down from the end | wraps back to *Bilka* |
| type `o` | 6 options, mark reset by the keystroke |
| Down, Down | *Coop* — the walk crossed from Favourites into All vendors |
| Enter | field reads *Coop*, panel closed |
| type `zzz-new-vendor`, Enter, nothing marked | the vendor is created — the standing rule kept |

---

## Statistics — changing the width threw the window away

The picker and the pager are one control, and one half of it discarded the other. Paging back to
**2022** and then picking *Month* opened **August 2026** — this month, on an account whose reader had
just spent four clicks walking four years back. Nothing on the page was misdrawn: the URL still said
`?range=month`, the pager still stepped months, the tiles, the chart and the six cards below were all
that month's. The window was simply gone.

The discard was a fallback with good manners. A window id is written for its own width (`2022`,
`2022-Q4`, `2022-12`, `2022-W52`), so the id in hand after a width change never parses as the width
being changed to — and the API answered the one thing it could not be wrong about, the current
window:

```js
const id = windowId && windowBounds(userId, width, windowId) ? windowId : currentWindowId(width)
```

Every probe written for this page passes over that line. The chips change the chart on every click and
the arrows move the window on every click, which is the two-controls rule already in this repo; what
neither can see is that the second control silently resets what the first one was set to, because the
reset *is* a valid window, correctly drawn, of the width that was asked for.

An id now re-anchors instead of falling back: the new window is the one holding the **last day** of the
old one, clamped to today. Measured in Blink 141.0.7390.37 under Playwright 1.56.1 against the app at
`localhost:5173`, fresh account, demo fill `{seed: 7, months: 36, orders: 600}`, `en-GB` /
`Europe/Copenhagen`, today 2026-08-18 — each row is the API's answer for the id the width before it
left behind:

| from | id handed over | to | before | after |
| --- | --- | --- | --- | --- |
| Year | `2022` | Month | August 2026 | **December 2022** |
| Year | `2022` | Quarter | Quarter 3, 2026 | **Quarter 4, 2022** |
| Year | `2022` | Week | Week 34, 2026 | **Week 52, 2022** |
| Quarter | `2022-Q2` | Month | August 2026 | **June 2022** |
| Month | `2022-05` | Week | Week 34, 2026 | **Week 22, 2022** |
| Week | `2022-W20` | Month | August 2026 | **May 2022** |
| Month | `2022-05` | Year | 2026 | **2022** |
| All time | `all` | Month | August 2026 | August 2026 |
| Year | `2026` (this year) | Month | August 2026 | August 2026 |

The last two rows are the clamp, and they are why the anchor is *the last day, but never later than
today*: the newest window ends in the future, and a picker that walked into September would land on a
window the pager's own forward arrow refuses to reach.

Driven through the UI — click *Year*, back-arrow twice, then each width in turn — the pager reads
2026 → 2024 → **December 2024** → **Week 1, 2025** → **Quarter 1, 2025** → **2025**, and the URL
follows it: `?range=year&period=2024`, `?period=2024-12`, `?range=week&period=2025-W01`,
`?range=quarter&period=2025-Q1`, `?range=year&period=2025`. (December 2024's last day is 31 December,
which is in ISO week 1 of 2025 — weeks run across the end of a year because weeks do.) No page errors
in 18 width changes and 6 pages back.

**The URL is rewritten from the answer, and that rewrite has a race in it.** `useApi` keeps the last
good data across a refetch — deliberately, so the layout does not collapse — so between a click and
its answer the window *on screen* is the previous one. An effect that canonicalised the URL from it
undid the reader's own click: pressing the back arrow to 2025 wrote `?period=2025`, and the effect
wrote **2026** straight back over it from the data still rendered. It fires now only where the id in
the URL cannot be a window of the width beside it, and only once the data on screen is that width's.

**Not run:** Gecko and WebKit are not installed in this container. Nothing here is a rendering
question — every figure above is text read back from the DOM or from the API.

## Statistics — the budgets were defined and never read

A category carries a **monthly budget**, set on its own page, and Statistics — the one screen in the
app whose whole job is a stretch of time broken down — never mentioned one. *Where it went* named
each category and its spend for the window and stopped there; there was no budget card at all. The
figure existed, the form to set it existed, and the page that would have to convert it to say
anything was the page that did not ask.

Converting is the whole of the problem, and it is why the omission was not a missing card so much as
an unanswered question: a budget names a month and this page draws five widths. Both directions of
the conversion are now on screen, and which one is used is decided by which invents nothing —

| width | months in the window | what the card compares |
| --- | --- | --- |
| Week 34, 2026 | 0,225806 | the week's spend against 0,23 of each monthly budget |
| August 2026 | 1 | the month's spend against the budget |
| Quarter 3, 2026 | 3 | the monthly average against the budget |
| 2026 | 12 | the monthly average against the budget |
| All time | 29,580645 | the monthly average against the budget |

`months` is summed a day at a time as each day's share of its own month, so a calendar month is
exactly 1, a quarter exactly 3 and a year exactly 12 whatever the lengths of the months in them, and
a week is the fraction of *its own* month it really is. Days over 30,44 makes February 0,92 of a
month and prints an allowance nobody set.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, app at `localhost:5173`, fresh account,
demo fill `{seed: 7, months: 36, orders: 600}`, 9 of 10 categories carrying a budget, 11.200 kr. of
monthly budget between them:

| width | window spend against allowance | the card | recomputed from the category list |
| --- | --- | --- | --- |
| Week | 2.223 kr. of 2.529 kr. | 88% | 2.529 kr. |
| Month | 21.501 kr. of 11.200 kr. | 192% | 11.200 kr. |
| Quarter | 39.636 kr. of 33.600 kr. | 118% | 33.600 kr. |
| Year | 148.679 kr. of 134.400 kr. | 111% | 134.400 kr. |
| All time | 579.187 kr. of 398.503 kr. | 145% | 398.503 kr. |

Every row's own arithmetic was read back the same way: `perMonth × months = spend` and
`used = spend ÷ (budget × months)` hold to the øre on all five widths, and each row's spend was
checked against the same window's category split — the second source for that fact, since the ring
beside it is drawn from one and the card from the other. They agree on every category at every
width.

**The muted line wrapped, because only one row family in the app had a rule against it.**
`.item-row-meta` is one line with an ellipsis and says why in its own comment; `.category-row-meta`
carried no such rule and neither did the legend's new one, so on an iPhone 13 descriptor the budget
card's six rows all wrapped to two lines and the week's narrowest one to three — 16px of meta drawn
as 32 and 48, in a list whose rows are otherwise 57px each. Both families follow the item row now
(one line, ellipsis, `min-width:0` on the wrapper so the box can actually get shorter than its
text), and the copy was shortened to fit rather than to be cut: every row reads
`522% of a 400 kr. budget` at every width, since the qualifier that percentage is read under is the
same for all nine rows and belongs in the card's header. All 15 meta lines on Statistics, 10 on
Orders overview and 6 on Home are one line at 390px, none of them clipped. Forced past its box the
rule fails as it should: a 83-character meta stays 16px tall, `scrollWidth > clientWidth`, drawn
with an ellipsis and 94px inside its row — while a long category *name* still wraps to 57px, since
the title names the thing and may not be cut.

The rows in *Where it went* carry the same percentages from the same computation (Hobby 522%,
Clothing 208%, Home office 229% over 2026), which is the point of joining them rather than
recomputing: the two cards sit one above the other and could not be checked against each other by
eye if they were two derivations. The qualifier moved to the card header after the first render —
*monthly average* on each of ten rows wrapped four of them onto a second line, 73px against 57px,
and the same move shortened the budget card's own rows once the phone was measured.

A fresh account with no categories draws the card's empty state and no ring; the demo account's
9 budgeted categories are 6 rows and a foot line reading *3 more budgeted categories • 5 over budget
in 2026*, since the denominator counts every budget whether it was spent from or not. On an iPhone
13 descriptor at `deviceScaleFactor: 2` the worst element in either card sits 1px inside its card
and the document does not scroll sideways.

**Not run:** Gecko and WebKit are not installed in this container.

## Meters and progress — a month's budget was measured against every month there had ever been

*Against budget* on the Categories overview read **6664% of this month's budget used**, with the
meter under it full end to end, on an account holding one 1.000 kr. budget and a year of orders. The
caption named the month and the arithmetic named the account: the figure divided each category's
**all-time** spend by its **monthly** allowance, so it grew with the age of the account and could
only ever come back down by someone deleting orders. Every neighbour of the number was right — the
caption, the meter, the help line's category count, the layout — which is why it survived: nothing
on the card was misdrawn, one of the two numbers behind it was measured over the wrong stretch of
time.

The same reading sat in three more places, all of them the same rule broken rather than four bugs:

- the KPI note *1 over this month*, counting categories whose all-time spend passed a monthly budget;
- the same over-count inside the card's own help line (*1 over it*);
- every All categories row, whose meta printed **1.456.574 kr. of 1.000 kr. budget** — two figures
  one line apart, of two different periods, neither saying which.

Orders overview draws the same percentage from the same helper and was closer but not right: it fed
the helper the ring's list, which is cut to categories with spend *this month*, so a budgeted
category nobody bought from this month dropped out of the **denominator** and the figure read high.
Two pages printing one fact, disagreeing — and each defensible on its own terms, which is the only
reason the pair went unread.

The join is one function now (`monthSpend` beside the all-time `spend` on every category record), and
the two helpers that compare a spend to a budget take `monthSpend` by name, so a caller handing over
an all-time list gets `undefined`, not a plausible number. The All categories row names its period.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`, fresh
account, demo fill `{seed: 7, months: 12, orders: 200}` — 9 budgeted categories carrying 11.200 kr.
of monthly budget between them, 18.890 kr. spent against it this month and 168.965 kr. spent in the
categories since the account was made:

| what the reader sees | before | after | the API's own figure |
| --- | --- | --- | --- |
| Categories, *Against budget* | 1509% | 169% | 168,7% this month |
| its meter's accessible name | 1509% of budget used | 169% of budget used | — |
| Categories over budget (KPI and help line) | 9 | 5 | 5 this month, 9 all time |
| Orders overview, same fact | 178% | 169% | 168,7% |
| All categories, *Clothing* | 17.835 kr. of 800 kr. budget | 230 kr. of 800 kr. budget this month | 230 kr. this month |

A second account, one category with a 1.000 kr. budget and no orders at all, reads **0%** with the
help line still counting it as a budget — the branch where a month is genuinely empty, which the
all-time reading could never produce once an account had any history. All 16 routes were opened
after the change: no error card, no page errors.

**Not run:** Gecko and WebKit are not installed in this container, and neither is a rendering
question — every figure above is text read back from the DOM.

## Meters and progress — every limit was added up and drawn as one month's budget

A category's budget is a **ceiling on that category**, and three cards divided a period's spend by the
sum of all of them: *Against budget* on the Categories overview, the same card on Statistics, and the
Budget half of the Orders overview breakdown. The arithmetic was sound and the number was still not a
fact about the account — nobody had ever set a total, so the denominator was a target the product
invented. A limit on gifts stands in the months nobody has a birthday, and in those months it sat in
the denominator anyway.

It fails in both directions at once. Downward: five ceilings totalling 11.200 kr. with one 321 kr.
purchase read **4% of budget used** in a month where the one category bought from was at 64% of its
own — plenty of room left, said about categories that were never going to be bought from. Upward, on
a ledger with history behind it, the same figure ran to three digits and was no more readable. And in
every direction it hid the rows it was made of: on a demo account of nine budgeted categories, one
figure of **337%** stood over a range from 45% to 1178%, so a category at more than eleven times its
own ceiling was invisible in the number drawn above it.

Each card was internally consistent — the caption, the meter, the help line and the rows all agreed
with the figure, and the two pages that printed it agreed with each other to the øre. That is what
kept it: nothing on any card was misdrawn, and the quantity itself had no referent.

The cards are the rows now, fullest ceiling first, each category against its own budget and nothing
else. No total of the limits, no percentage of one, no bar filled by one. The count is the summary a
period gets — *8 of 9 over this month* names the ceilings someone actually set. A budgeted category
with a quiet month is a row at 0% rather than an invisible share of a denominator, which is the case
the old figure could not show at all. `budgets.used`, `budgets.allowed` and `budgets.spent` are gone
from the API with the cards that read them; the per-row ratio stays, computed once server-side over
Statistics' window and once in the browser over the month, from the same three sort keys — used,
then spend, then name — so untouched budgets, all of them 0%, cannot rank differently on the two
pages.

Measured in Blink 141.0.7390.37 under Playwright 1.56.1, driving the app at `localhost:5173`, fresh
accounts registered and filled through the UI:

| account | what the reader saw | now |
| --- | --- | --- |
| 5 budgets, 8.700 kr. of ceilings, one 321 kr. order | 4% of budget used | Biking 64% of a 500 kr. budget, 321 kr. |
| the other four, untouched that month | not drawn at all | four rows at 0% of their own budgets |
| demo fill, 9 budgets, 11.200 kr. of ceilings | 337% of budget used | Hobby 1178%, down to Eating out 45% |
| Categories overview against Statistics, same account | two cards, one figure each | six rows each, identical name, meta and amount, in identical order |

The three cards no longer print the string "of budget used" anywhere. Orders overview keeps one ring
instead of two behind a toggle: its Expenses view is the month's split and adds up to the figure in
its own centre, and the Budget view it toggled to was a third copy of a number the Categories page
and Statistics already carry with the context to read it. Categories names the month in the card
header, as Statistics does, rather than in each row. On an iPhone 15 descriptor at
`deviceScaleFactor: 2` all three cards sit 1px inside their card box, no meta line is clipped, every
meta is one 16px line, and no page scrolls sideways. The empty branches were driven too: no
categories, categories without budgets, and a budget with no spend — each draws its own sentence. All
19 routes were opened after the change: no error card, no page error, no console error.

**Not run:** Gecko and WebKit are not installed in this container. The `docs/` screenshots were not
re-rendered: they show Home and the All orders list, neither of which draws any of these three cards,
and the one style rule deleted (`.card-toggle-row`) had no other match in the app.

## Create and Edit — the fields for a line stood 587px from the line

Both order forms drew one item form above the item list, permanently, and put a pencil on every
row that loaded that row's values back into it. The form was the same four fields whichever job
it was doing, so the only thing on screen saying which was about to happen was the verb on a
button below the fields — and a toast that read, in as many words, **"Editing Rugbrød. The form
above holds it."** A screen that has to tell the reader where the answer went is a screen where
the answer is not where they are looking.

Measured on the demo fill's largest order — five lines — at 1440×900 in Blink 141.0.7390.37
under Playwright 1.56.1, with the row already on screen before the pencil was pressed:

| | old, form above the list | new, card in the row's place |
| --- | --- | --- |
| Description field, relative to the row that was pressed | **587px above it** | **99px below its top**, inside the card that replaced it |
| distance added per further line | one row, ~56px | none — the card is always at the line's own index |
| details card / list / rows above, on open | — | **0px, 0px, 0px** moved (document offsets, identical before and after) |

Five lines is the *largest* order the demo fill produces; a real receipt is longer, and the gap
is the one number in the table that grows with the data. The two figures that do not move are
what the "opening one moves nothing above it" rule is: opening line 3 of 5 left the details card
at 93, the list at 1024 and the two rows above it at 1032 and 1088 — the same offsets they held
before the click. The page itself still scrolls when it has to: the card is 446px where the row
was 56px, and `block: 'nearest'` moved the viewport 204px to bring the taller box in, which is
the least that fixes it and 0px when the card already fits.

Driven rather than screenshotted, because none of this is visible in a still: 33 assertions over
the edit page and the wizard's item step, and 29 more over the half the first pass never touched
— the photo picked, previewed, replaced and removed; delete from a row and from the open card,
both through the one ask-before-deleting dialog; the header chevrons walking line to line;
Cmd/Ctrl+Enter saving and opening the line below; leaving a valid card saving it and leaving an
invalid one asking first; and the grip still reordering with the arrow keys when no card is open.
All 62 pass, with no page errors, and the edited and added lines were read back off the order's
own detail page after the save, so the round trip through the API is in the count. Verified in
Blink; Gecko and WebKit are not installed here and are unverified.

**What no instrument here would have caught on its own.** The card's own phone rules were written
into the stylesheet's `@media (max-width:700px)` block, and the base rules they override were
written *below* it — equal specificity, later wins, so the media block was dead. The build was
clean, the desktop was correct, and every assertion that did not name a phone passed. On an
iPhone 13 descriptor the card rendered its photo frame at **128×128** instead of 76×76, its
fields as a two-column grid at **262 / 123 / 123 / 123px** instead of four stacked at 262, and
`.line-photo-foot` overhung its column by **45px**. Moving the base rules above the media block
fixed all three in one edit: 76×76, 262 × 4, and 0 elements past their container, with the
document at 390 against a 390 client width. The lesson is in `CLAUDE.md`, because it is about
where a rule is written rather than what it says.

**One rule of the design system was deliberately not taken from the design.** The sketch this was
built from deletes a line immediately and offers an undo for a few seconds. README: Deletion says
ask-before-deleting is one setting read by every delete, records and their parts alike, and that
the asking is a modal dialog — so a line keeps the same question every other delete asks, from
the row and from the open card alike, and the card's wider button is not a reason to invent a
quieter delete for it.

## Create and Edit — one list, two headers, and an add row that lined up with neither

Three defects in the line list, all of them alignment or naming rather than behaviour, and none
of them reachable by the assertions that cleared the list itself.

**Two headers over one list.** The Items card drew a `CardHeader` reading `ITEMS • 4` and the list
under it drew its own section label reading `LINES • 4` — one list, two names for it, and the same
count printed twice, stacked. The name is *Items* in both places now, the word the rules, the
empty-state sentence and the footer total already use; *Lines* was a third name for the same
thing, inherited from the section label the old form sat above.

Which of the two headers to keep was got wrong first, and the correction is the useful part. The
card's header was the one deleted, on the reasoning that whatever owns a list owns its name — and
that reasoning ignored what a `CardHeader` *is*. It is not a label; it is the card's header band,
45px tall, `14px 20px`, an 11.5px section label in it and a hairline under it, and every other
card in the app draws one. Replacing it with a bare label inside `card-body-tight` left the Items
card as the only card on the page without a band, which is what got reported. The band is back,
built the way Order details' own items card builds it, and the list is told not to draw a second
one. Measured against a neighbouring card's header: **45px, `14px 20px`, 11.5px** on both, desktop
and phone. A component that names itself is right up until the host has a place to name it, and
the place here is a shape the design system already defines.

The hint about dragging rides in the band's right-hand slot, the way that card puts its subtotal
there, and it goes when the thing it describes goes: opening a line withdraws the grips, so
`.card:has(.line-card) > .card-header .field-help` withdraws the hint with them. Hidden rather
than removed, so the band does not change height when a line opens — **45px in both states**, and
one line with nothing past either edge at 390px. An order with a single line draws no grip and no
hint at all.

**The add row lined up with nothing.** It was a bordered dashed box, and a box has to pad its
content inwards. Measured against the first row's tile and title in the panel's own coordinates,
at 1440×900:

| list | add row's glyph and text, against the rows' tile and title |
| --- | --- |
| 1 line, no grips drawn | **+13px** — the box's own 12px padding and 1px edge |
| 2, 3 and 4 lines, grips drawn | **−14px** — the box also had no grip column to leave empty |

So it lost the box. It takes `.data-row`'s own `padding:10px 0` and gap, and what marks it as the
one row in the list that is not a line is a dashed rule above it and a dashed tile — neither of
which moves anything. The grip column is reserved on exactly the condition the rows draw a grip
on, `showGrips`, read by both so they cannot disagree. All four cases now measure **0px** on both
the glyph and the text, on desktop and on an iPhone 13 descriptor.

**The stand-in was 3px wide of the thing it stood in for.** The empty grip column was first built
as a hidden copy of the grip carrying the grip's own class, on the theory that the same class
cannot drift from itself. It drifted immediately: the rule that sizes that glyph to 15px is
`.item-row .item-row-grip svg.icon`, scoped to a row the add row is not inside, so the icon fell
back to the stylesheet's 18px default and every tile and title sat 3px off. The fix is to name
the stand-in in that same shared declaration rather than to copy the number — and then to take
the grip's class back off it, because a hidden non-grip wearing `.item-row-grip` makes every
count of *how many grips is this list offering* come back one too many. That is not hypothetical:
it is how the defect was caught, by an assertion that counted grips against rows.

Neither the double header nor the misalignment could fail anything that had been written: the
list rendered, every control worked, nothing overflowed, and both were reported from a screenshot.
A rendered heading is not a heading that has been read against the one above it, and a row that
draws correctly is not a row that lines up with its neighbours — see the standing rule about two
things drawn to be read together being measured against each other rather than each on its own.

## Charts — a ring and its legend stacked two different ways on a phone

Four cards in the app draw a ring with the list that names its segments. Home's *Category breakdown*
and Orders overview's build it as a stack — `.donut-box` over `.category-rows` — and the other three
(Categories' *Breakdown*, Vendors' *Where it goes*, Statistics' *Where it went*) lay it across a row,
`.ring-row`, which was `display:flex; align-items:center; gap:24px; flex-wrap:wrap`.

On a phone that row cannot hold both. The card body is **364px** wide under `devices['iPhone 13']`,
and the row asks for the ring, a 24px gap and `.chart-legend-fill`'s `min-width:170px` before the
legend has printed a single name: 326px for the 132px donut, 364px for the 170px gauge. So the wrap
fired at every phone width and produced a stack nobody had designed — the ring pinned to the card's
left edge with the legend under it. Measured as the ring's centre against the body's centre:

| Card | Ring | Off centre, before | Off centre, after |
|------|------|-------------------:|------------------:|
| Home — Category breakdown | donut 132px | 0px | 0px |
| Orders — Category breakdown | donut 132px | 0px | 0px |
| Categories — Breakdown | donut 132px | **-96px** | 0px |
| Vendors — Where it goes | donut 132px | **-96px** | 0px |
| Statistics — Where it went | gauge 170px | **-77px** | 0px |

Every instrument in this repo agreed with it. Nothing overflowed (`documentElement.scrollWidth`
matched `clientWidth`, and no child's right edge passed its parent's), the ring rendered, the legend
rendered, and the two are drawn from one array, which is the rule that ring cards are usually caught
by. The defect is only visible as a comparison between two cards that draw the same chart — the same
shape as the standing rule about two pages that state one fact, one level down.

Below 700px `.ring-row` now takes Home's arrangement rather than falling into its own: `flex-direction:
column`, the ring `align-self:center` with `flex:none`, the legend at the body's full width, and the
two spacings copied off the card they are copying — 6px above the ring, `--gap-block` (12px) between
ring and legend. Five cards, three routes, one geometry:

| | Home | Orders | Categories | Vendors | Statistics |
|---|---:|---:|---:|---:|---:|
| Ring off body centre | 0px | 0px | 0px | 0px | 0px |
| Ring below the divider | 20px | 20px | 20px | 20px | 20px |
| List below the ring | 12px | 12px | 12px | 12px | 12px |
| List width vs body's content box | 0px | 0px | 0px | 0px | 0px |

**Two near misses inside a three-declaration change.** The 6px lead-in was first written as
`padding-top:6px` on `.ring-row`, which *replaces* `.card-body`'s own 14px rather than adding to it:
the ring came to 6px under the divider against Home's 20, a lead-in shorter than the one it was
copying. It belongs on the ring as a margin. And `.chart-legend`'s `margin-top:4px` — a spacer from
where the legend sits under something else — stacked on top of the new flex gap and stood the legend
16px below the ring against Home's 12. Both were one number off in a rule whose whole job is to
match another card; neither is visible without measuring the card being matched.

Desktop is untouched by construction — the whole of it is inside `@media (max-width:700px)` —
and measured anyway: at 1440x900 and at 760x900 all three ring rows still put the legend beside
the ring (`listSameRow: true`), at the same offsets before and after. Verified in Blink;
Gecko and WebKit unverified, neither installed here.

## All lists — filtering, opening a row and coming back cleared the filters

Filter All orders, click an order, press Back, return to the list: no filters. Nothing had been
cleared, and the page reporting it was working exactly as designed — which is what made it read as
a bug in the filters and is why the first answer to it was wrong.

The state was never lost. All orders holds every filter in the query string, deliberately, so a
filtered list is a place you can send; the fault is that nothing the app itself links with ever
says one. The sub-tab is a literal `/orders/all` (`routes.jsx`), the back button off an order
detail is a fixed `/orders` — the overview tab, not even the list you came from — and SEE ALL, the
palette entry and the post-delete redirect are bare too. Every route back in was an instruction to
show everything, so the URL did.

Measured on the running app, Chromium 141, before: arriving at
`#/orders/all?vendor=<id>&status=Delivered` gave 2 chips over 5 rows; opening a row and pressing
the app's own Back landed on `/orders`; the *All orders* tab from there gave `/orders/all`, **0
chips, 30 rows**. After: the same round trip returns `/orders/all?vendor=<id>&status=Delivered`, 2
chips, 5 rows.

The other two lists were worse and the report had not reached them yet. All vendors and All
categories put only the *page* in the URL and kept the keyword and the sort in `useState`, so those
two were lost on any navigation at all and could not be linked in the first place — the same rule
the README states for paging, obeyed for one field of three. Both now hold `q`, `sort` and `page`
in the query string like All orders, which is what lets one component remember a list as one
string.

### Two ways to get the restore wrong, both measured

**Reading the snapshot on every render undoes CLEAR ALL.** "No query string" is not only true on
arrival — it is true again the instant CLEAR ALL empties one. A live condition therefore read a
snapshot taken before the click and wrote the cleared filters straight back: the URL sat at
`/orders/all` for a frame and bounced to `?vendor=<id>&status=Delivered`, the page overruling the
one control whose entire job is to empty it. The first probe very nearly passed it, printing the
bare URL in the frame before the bounce and the restored filter one step later, where it read as a
successful restore. Waiting for the hash to hold still for three polls is what separated them.

**A latch that flips a ref while rendering works in the build and not in the dev server.**
StrictMode renders every component twice, so `if (!decided.current) { decided.current = true; ... }`
answers "restore" on the first invocation and "carry on" on the second. Storing the *decision*
rather than a flag saying a decision was taken makes the second render agree with the first.

Restoring is a redirect during render rather than an effect, so the unfiltered list is never
requested: an effect fires after the first commit, by which time the page below has asked the API
for page 1 of everything and painted the answer.

Verified in Blink only — 12 assertions across the three lists on the running app: the round trip on
each, a deep link overriding the memory (`?status=Returned` stays Returned), CLEAR ALL surviving a
round trip, a restored page number, a second tab starting clean and the first keeping its own. Plus
the 16-route smoke, no error card and no page errors. Gecko and WebKit unverified — no binary
installed, and nothing here is engine-shaped.

## Create and Edit — every line cost two rows so the title could keep a width it never used

On a phone, every line on New and Edit order broke after its title: the price and both action
buttons dropped to a second line, right-aligned, under a title block using a fraction of its own.
It cost the short names as much as the long ones — *Towel*, a five-letter line, stood **94px** tall
with `149,00 kr.` and its two buttons stranded on a line of their own — so the list read as a
column of half-empty rows rather than as a list of items. Four lines came to **430.1px** of a
664px screen before the add row was drawn.

This was a decision, not an oversight, and it is already written down
([*Order Detail — the row's figures dropped to a line of their own*](#order-detail--the-rows-figures-dropped-to-a-line-of-their-own-over-room-they-never-measured)):
`.item-row-group` was written for exactly this shape, and the line editors were held back from it
because a grouped title measured **64px** there — a grip, a 36px tile, a nowrap total and two
buttons leave nothing — and 64px of a compound product name is a mid-word stack nobody asked to
read. The measurement was right. What was never asked is whether the row had to keep all five.

It did not. The total is the one figure in the row the row already states: the meta beside it reads
`2 × 39,50 kr.`, so the line total is that arithmetic printed twice, and on every line whose
quantity is 1 the two are the same number twice over. Hiding it at phone width — scoped to this
list, not to `.item-row-group`, since Order details' read rows have no card to open and no second
copy of the figure — pays for the grouping, and the title goes from 64px grouped to **141px**. The
figure is still drawn on a desktop, where the row has the width for it, and still in the card the
pencil opens, which prints `Per piece · line total X` under the price as it is typed.

Measured on `devices['iPhone 13']` at `deviceScaleFactor: 2`, Blink 141.0.7390.37, on a fixture of
four lines chosen to stress it: a 62-character spaced title, a 39-character unspaced one, a line
carrying a retail price (which is what makes a meta long enough to need its own ellipsis) and a
one-word line.

| line | before | after |
| --- | --- | --- |
| `Bosch Styline MUM5 Stand Mixer…` (62 ch) | 130.47px, 2 flex lines, title wrapped to 3 | 56px, 1 line, title ellipsized |
| `AA Batteries`, retail priced | 94px, 2 flex lines | 56px, 1 line, **meta** ellipsized |
| `Kaffemaskineafkalkningsmiddelkoncentrat` | 111.63px, 2 flex lines, broken mid-word | 56px, 1 line, title ellipsized |
| `Towel` | 94px, 2 flex lines | 56px, 1 line |
| four lines together | 430.1px | 224px |
| title block | 221px, on a line of its own | 141px, sharing the line |
| line total | drawn, 2nd line | `display:none` |
| overhang past the panel | −14px | −14px |
| worst child overhang past its row | 0 | 0 |
| document overflow | 0 | 0 |

Desktop is untouched and was read on both sides to say so: 1440×900 gives the same four row heights
(73.63 / 56 / 56 / 56), the same title blocks (440.58 / 158 / 313 / 69) and the total still `block`
on every row — `.item-row-group` is defined only inside the phone media block, so the class the
markup now states is inert above 700px.

States beyond the one screenshot, since one state is not coverage: a one-line order (no grip column
reserved, title 168px, still 56px and one flex line); a three-line order (grips on every row, all
56px); the transient SAVED badge, which is a fifth thing competing for a row that can no longer
wrap — it squeezes the title to 71px and the row stays 56px, one line, 0 overhang; and New order's
step 2, the other page this component renders on, walked through step 1 rather than deep-linked
(its URL alone lands on step 1) — 56px, one line, no error card, no page errors.

Verified in Blink only; Gecko and WebKit are not installed and were not checked. Nothing here is
engine-shaped — no native control, no prefixed property, no shadow pseudo-element — but that is a
reading of the diff, not a run. `docs/` is unaffected: its three shots are Home twice and All
orders, and none of them renders a line list.

Two probes had to be fixed before their numbers meant anything, both of which had first reported a
clean pass. Counting distinct child `top` values called every row 5 lines, because children of
different heights centre to different tops on the same line; and once that was fixed the hidden
total's all-zero rect became a phantom band of its own, so every phone row reported 2 flex lines
while the desktop reported 1 — the fix is to count only children that are actually laid out. A
third read the wrong order entirely: `/orders/A/edit` to `/orders/B/edit` changes only the hash, so
the document never reloads and the form keeps A's draft, and a bare `waitForSelector` was satisfied
by A's rows. The three-line order came back as one row and would have been recorded as one.

## Loading and Errors — the loading state was one line, whatever the content behind it

Every `Async` region drew the same one-line "Loading..." card while its data was in flight, sized
for its own sentence and nothing about the content it was about to become. On Home, authenticated
with a year of demo data, the swap from that card to the dashboard-cards grid — three cards
stretching to 418px each in one CSS-grid row — measured **0.386** cumulative layout shift on
Lighthouse (0.25 is "poor"), almost all of it one region:
`div.async-live > div.content-column-main > div.async-live > div.dashboard-cards` going from a few
words tall to over a thousand pixels in a single frame, with the reader's cursor typically sitting
right where the jump landed. The performance score read **79**, with every other metric (FCP 1.7s,
LCP 2.5s, TBT 60ms) unremarkable — CLS was carrying the whole deficit on its own.

Skeletons shaped like their content (`Skeleton.jsx`: a shimmering block, and `SkeletonCard`/
`SkeletonRow(s)`/`SkeletonKpiRow` built from the real `Card`/`CardHeader`/`CardBody` components and
the real `.data-row`/`.kpi-row` classes, not a second copy of their metrics) replaced the one-line
card everywhere `Async` is used. Where the eventual shape is genuinely unknown — the dashboard's
own cards load from a separate request that decides how many there will be — the skeleton
approximates the account's own default (three) rather than guessing at zero, and the CSS grid that
stretches every card in a row to the tallest one (`.dashboard-cards`' own default
`align-items:stretch`) does the rest: one skeleton card sized close to a real card's measured
height (418px, three cards, a demo account) carries the other two along with it.

**Instrument:** Lighthouse (performance category only) against a served production build
(`react/dist` via `api/src/server.js`), authenticated, a year of demo data (80 orders, 12 months),
Chromium 141.0.7390.37 under the 1.56.1 Playwright bundle. Two runs each side.

| | before | after |
| --- | --- | --- |
| CLS | 0.386 / 0.386 | 0.0014 / 0.0014 |
| Performance score | 79 / 79 | 97 / 97 |
| FCP | 1658 / 1653ms | 1569 / 1656ms |
| TBT | 61 / 12ms | 79 / 26ms |

FCP and TBT move a little run to run, the way any timing does; CLS did not move at all within
either side, and it and the score built from it are what the change actually moved. Verified in
Blink only; Gecko and WebKit are not installed and were not checked, and nothing about a
shimmering `<span>` and a CSS grid stretch reads as engine-shaped enough to expect a difference,
but that is a reading of the diff, not a run.

## Input types — three pickers listed everything, and a starred record led nothing

Defends: *results are grouped **Favourites → Recent → All***, against a rule every call site was
trusted to obey on its own.

An account that had starred Electronics, Groceries and Household opened All orders' FILTERS panel
and found them nowhere near the top: the category picker there listed all ten alphabetically, so
the three records the reader had marked as the ones they reach for sat between Eating out and
Health. The vendor picker beside it did the same to Bilka and Proshop. The Wishlist's own category
filter, written later, listed everything too — not because anyone decided to, but because it was
written from the picker next to it.

The rule was already in the design system and already obeyed on four forms. What broke it is that
the two groups were hand-written at each call site: a `.filter(c => c.favourite)` list mapped with
`star: true`, then a `.filter(c => !c.favourite)` list mapped without it, seven times. Nothing in
that shape tells a later author it is a rule rather than a layout choice, so a picker written from
the wrong neighbour, or written fresh, simply lists what it was given.

`react/src/api/pickerGroups.js` now holds `categoryGroups` and `vendorGroups`, and every picker
calls one of them: All orders' two filters, the Wishlist's filter, New order, Edit order, the
vendor form, the wish form, and `useVendorPicker` for the order forms' vendor field. `exclude`
takes the names a chips field has already collected, which is the one thing that genuinely differed
between the copies. 80 lines of duplicated grouping became 24.

Measured on a seeded account: all seven pickers open with FAVOURITES first and a star on each of
its rows. On a new account with nothing starred the heading is not drawn at all — the combobox
already drops a group whose options filter empty, so the shared builder needs no case for it.

The tell worth keeping: the three broken pickers were all *filters*, and the four correct ones were
all *forms*. A rule enforced by copying spreads along the lines authors actually copy, so the gap
follows the shape of the page rather than the shape of the rule.

---

## Forms — the top bar's own search box had neither a `name` nor an `id`

A sweep of every real `<input>` and `<textarea>` in the app (no `<select>` exists; every choice list
is the combobox) turned up nine controls with neither attribute: the top bar's global search, the
list-toolbar search and its sort combobox (shared by All orders, All vendors, All categories and the
Wishlist), the Stats "Window width" combobox, the order form's reference and note fields (New order
and Edit order both), the category form's colour-picker custom swatch and icon-picker search field,
and every hidden file input the app opens for a receipt, an attachment or a line photo.

None of it looked broken. Every one of these drew, focused, and took typed or picked input exactly
like its neighbours — the gap is invisible to a screenshot and to a click-through, because nothing a
sighted, mouse-driven pass exercises depends on the attribute. What does: a `<label for="...">` has
nothing to point at without an `id`; a password manager and a browser's own autofill match a field by
`id` or `name`; and a test or a future page reaching for `document.getElementById(...)` finds nothing.

`TextInput`, `DateInput`, `TextArea` and `Combobox` already accepted an optional `id` — so a field got
one exactly when the screen composing it happened to name it (order-vendor, order-date,
filter-min-amount, every field a validation rule or `focusField` needed to address). The nine that
didn't were exactly the fields nothing else needed a stable name for, plus two shared controls
(`ColourPicker`'s custom-colour input, `IconPicker`'s search field, `ListToolbar`'s own search box,
`HiddenFileInput`) that had no `id` prop to accept in the first place.

The fix sits below every screen, not on nine of them: each shared control that renders a real
`<input>`/`<textarea>` now generates a fallback id for itself whenever none is supplied, so composing
one without naming it is no longer possible. A control that can appear more than once on the same
page at once (a hidden file input, one per line photo) gets a fresh id per instance rather than a
literal string that would collide the second time it renders.

### Measured

Read back from the running app after the fix, registered fresh and rendered at 1440x900:

| control | before | after |
|---|---|---|
| Top bar search (global finder) | no `id`, no `name` | `id="global-finder-search"` |
| List toolbar search (All orders) | no `id`, no `name` | a generated id (e.g. `_r_2_`) |
| List toolbar sort combobox | no `id`, no `name` | a generated id (e.g. `_r_4_`) |
| Stats "Window width" combobox | no `id`, no `name` | a generated id |
| New/Edit order "Order reference" | no `id`, no `name` | a generated id |
| New/Edit order "Note" | no `id`, no `name` | a generated id |
| Category colour picker's custom swatch | no `id`, no `name` | a generated id |
| Category icon picker's search field | no `id`, no `name` | a generated id |

Every field that already carried a meaningful id (order-vendor, order-date, filter-min-amount, and
the rest) kept it unchanged — the fallback only fills what was missing, it never overrides a name a
screen already gave.

## Charts — the busiest day's bar was filled 55% of the way up, and the 55% was not a value

The weekday rhythm card on Home and on Statistics draws one bar per weekday, each a share of the
busiest one, and marked the busiest by redrawing **the bottom 55% of that bar** in `--green` over the
track colour. The 55% was a constant. Nothing in the data was 55% of anything.

So the peak bar was the one bar on the card carrying two lines: a height, which is the day's spend
against the busiest day, and a fill boundary, which is nothing. On a demo account where a single day
holds the month's spend, that reads as "the busiest day is a bit over half of something" on a chart
whose only other bars are 3px floors. Measured on the rendered app at 1440x900, one account, both
cards:

| Home — spending rhythm, peak bar | before | after |
|---|---|---|
| the bar | `path` 206px, track colour | `path` 206px, `--green` |
| the green on it | `rect` 113.3px, clipped to the path | — |
| green as a share of the bar | 55.0% | 100% |

Read off the rendered app at 1440x900 (dSF2), demo data seeded so both runs draw the same week; the
other six bars measure 3, 79.3, 41.6, 3, 3, 3px in both runs, track colour in both.

The card next to it already had the rule: `MonthColumns` fills the current window's column whole in
`--green` and every other in the track colour, so two bar charts in one app answered "which one is
marked" two different ways. The peak bar is now the same single path as every other bar, with only
its fill differing — which also drops the clip path the overlay needed to stay inside a rounded top.

Verified in Blink; Gecko and WebKit unverified, neither installed here. Home's committed screenshot
moves with this: rendered before and after on one machine, `home.png` differs by **3,515 of
5,184,000 pixels**, all of them inside that one bar, with run-to-run difference **0**.

## Create and Edit — the rail restated the item list standing beside it

Edit order is two columns: the item list in the main column, the order summary in the rail. The rail
printed **every line again** — name, quantity and line total, one summary row per item — beside the
list that already draws each of them with its price, its retail price and its own edit control.

An order of 11 lines therefore carried 11 rows of the rail's total height for facts already on
screen, and the rail's own rule is that it stays shorter than the item list. The same shape was on
new order's step 2, where the list being copied is the one being typed into.

The rail now states the items as a single row — their summed price — between Kind and the discount
and shipping rows, so the card reads down to the total instead of restating the list. Measured on the
running app, one demo account, at 1440x900:

| Edit order, the same 5-line order | before | after |
|---|---|---|
| rows in the rail | 10 | 6 |
| of those, one per item | 5 | 0 |
| rail height | 619px | 418px |
| the items on screen | list + rail | list only |

The five rows it dropped read 12,00 / 11,71 / 46,62 / 4,00 / 69,93 kr., and the one row that
replaced them reads 144,26 kr. — their sum, which is what the total was already built from.

New order's step 2 had the same rail, over the list being typed into. That rail was also hiding
categories, kind, discount and shipping to make room for the item copy, so its estimated total was
the one figure on the card no other row accounted for. With the list gone those rows fit and the
arithmetic closes, measured on a two-line draft: items 150,00 kr. + shipping 49,00 kr. = estimated
total 199,00 kr.

One line of that card was also false rather than merely redundant: with no retail saving to report,
step 2's rail printed "Items are added in step 2; the total builds as you add them" — on step 2,
under the items it was describing as still to come. That sentence is now step 1's only.

## Screenshots — the docs render checked its own state with a filter the list does not read

`all-orders.png` documents a filtered list: one vendor, one status, one month, three matching orders.
The render script asserts that state before shooting, and asked for it as
`/api/orders?vendor=bilka&status=Delivered&from=…&to=…`. The list route reads `vendorId`. A
parameter it does not read narrows nothing, so the check was counting **every** August delivery in
the account and printing it as Bilka's.

On the render day this was found, the two numbers were **9** (what the check printed) and **1** (what
the page actually drew, and what the shot would have been regenerated with). Both are wrong for a
shot whose state is three. The check now sends `vendorId`, reads the count back, and throws rather
than shooting a state the shot is not documenting — the difference between a probe that can fail and
one that only reports.

The `vendor` spelling is not a bug in the app: it is the page's own address (`/orders/all?vendor=…`),
which the page turns into the `vendorId` it sends. A harness reading the address bar and calling the
API with it is reading two different vocabularies as one.

With the seed re-picked so the account holds three August Bilka deliveries, all three shots render
identically twice in a row: **0 differing pixels** of 5,184,000 (desktop) and 1,035,948 (phone).

## Responsive Layout — the phone tab bar left the screen for the foot of the page whenever a finger pulled down

Pulling down at the top of a page moves the whole shell with the finger, and the shell was moved by a
`transform` on one box wrapped around it. A transform makes its own element the anchor every
`position:fixed` descendant resolves against, and below 700px the bottom tab bar is fixed. Wrapped,
it stopped measuring from the screen and started measuring from a box as tall as the document.

On the front page, in an iPhone 15 context (786x1318 at `deviceScaleFactor: 2`, 659px of viewport),
the bar's top edge over one gesture:

| | at rest | 50px of pull | 100px of pull | released, easing | settled |
|---|---|---|---|---|---|
| wrapped | **589** | **2582** | **3350** | **3334** | 589 |
| per column | **589** | **639** | **689** | 648 | 589 |

Nearly **2000px** of displacement for a 50px pull, and the front page is where every session starts at
scroll top — so any downward drag there, the commonest gesture on the page, threw the bar off the
screen and snapped it back on release. The wrapped row is also why it read as random movement rather
than a constant offset: the anchor is the document's height, which grows as content loads.

The pull now moves the shell's two columns rather than a box around them, so the bar carries its own
transform and keeps measuring from the screen; it trails the page by exactly the pull distance
(589 → 639 → 689 for 50 and 100px). The rail and the panel still move as one on a wide screen, both
by 80px for an 80px pull.

`--pull-shift` is unset when nothing is being pulled, and that is load-bearing: a `var()` with nothing
behind it makes the declaration invalid at computed-value time, so `transform` computes to `none` and
neither column anchors anything. A literal `translateY(0)` would have kept both of them anchors and
the defect with them. Measured at rest: `transform: none` on the wrapper, the rail and the panel, the
bar 3px from the bottom of the screen at all seven scroll positions sampled from 0 to 2661, and **0
differing pixels** against the unchanged source on both the phone (1,035,948 px) and desktop
(5,184,000 px) front page.

No `position:fixed` element sits inside the panel on any of the ten phone routes, checked by walking
the DOM of each — the toast stack, the update bar and the pull spinner are all outside the shell the
pull moves. Verified in Blink (Chromium 1.56.1 via Playwright); other engines unverified.

---

## Honest Affordances — a disabled button was drawn exactly like one that works

`.button` set one resting look and nothing under it answered `:disabled`. Four disabled rules
existed and three of them were for something else: `.icon-button-reorder:disabled` at `opacity:.35`,
`.item-row-grip:disabled` at `.4`, `.pager-arrow:disabled` at `.45`, and one rule that did reach a
button — `.pager-buttons .button:disabled` — scoped to the pager it was written in.

Measured in Chromium 141 (Playwright 1.56.1) on `button.button.button-primary` with and without the
attribute, reading computed style: **`opacity` 1 in both, `cursor: pointer` in both, identical
background and colour**. Settings' "check for updates" button takes `disabled={checking}` and sat in
that state saying nothing about it.

The rule now lives once, on `.button:disabled` beside the base spec, at the `.45` the pager already
used; the pager's own copy is gone, since a value stated twice is a value that can disagree. After:
`opacity: 0.45`, `cursor: default`, against `1`/`pointer` enabled.

Not checked: Firefox and WebKit. The rule is one declaration on a pseudo-class every engine has.

## Buttons — `primary block` painted itself white, and said nothing

`.button.button-block` and `.button.button-primary` are both `(0,2,0)`. Block was declared at
app.css:888 and primary at 359, so block won on order, and its own surface trio —
`background:var(--bg-card); color:var(--text); border-color:var(--border-control)` — is character for
character `.button-outline`'s. A control named primary rendered **`rgb(255, 255, 255)`** on a
**`rgb(25, 77, 48)`** promise.

Nothing in the app writes the two together, so nothing was visibly wrong; the combination was simply
a lie waiting to be told, and a preview card drew it before a screen did. This is the case
`CLAUDE.md` names in general terms — a base rule placed below an override wins on equal specificity —
in the one place the file itself had it backwards.

Block now sits directly under the base spec, above every surface variant, and `.button-primary`
states `border-color:transparent` rather than inheriting it, so a surface variant combined with one
that draws an edge does not keep the edge. Measured after, computed style at a 400px container:
`primary block` **`rgb(25, 77, 48)`**, white text, transparent border, 400/400px wide; `block` alone
unchanged at **`rgb(255, 255, 255)`** with a **`rgb(226, 228, 223)`** edge, 400/400px.

## Honest Affordances — the same text link was underlined as a button and bare as a link

`a[data-go] { text-decoration:none }` (app.css:525, `(0,1,1)`) outranks `.button-link`
(app.css:889, `(0,1,0)`), and every in-app link carries `data-go`. So the component underlined
itself only while it had nowhere to go.

Measured in Chromium 141, computed style on both forms of the one component: `<button>`
**`underline`**, `<a data-go>` **`none`**, with colour `rgb(11, 15, 13)`, weight 700 and size 12px
identical across both — the difference was the underline alone. Four call sites take the link form:
`Orders.jsx:110`, `AllOrders.jsx:285`, `Home.jsx:549`, `Wishlist.jsx:221`. `Button variant="link"`
with a `to` produces the same class and would have lost it the same way; nothing writes that today.

The exception now sits with `.button-link` as `a.button-link { text-decoration:underline }` —
`(0,1,1)`, the same weight as the reset, declared after it, so it wins on order and competes on
nothing but the underline. After, on `/orders/all` at 1440px, the page's single anchor-form link
reads `underline`.

**The first fix for this was a regression, and it is the reason the rule below exists.** Narrowing
the reset to `a[data-go]:not(.button-link)` reads like a smaller selector and is a larger one:
`:not()` carries its argument's specificity, so `(0,1,1)` became `(0,2,1)` and outranked
`.button.button-primary` and `.button.button-caps` at `(0,2,0)`. Every button the app renders as a
link — the topbar's SCAN RECEIPT, the vendor and category heroes' ADD buttons — took
`color: inherit` and drew near-black `rgb(11, 15, 13)` on `rgb(25, 77, 48)`. Measured on the page
and confirmed by reverting the one selector.

It shipped because the verification asked the wrong question twice. A sweep of the button variants
covered `<button>` elements and a single `<a class="button-link">`, and never the link form of a
button variant, which is the only shape that fails. And the screenshots did catch it: `home.png` and
`all-orders.png` each moved by **1978 of 5,184,000 pixels** and `phone.png` by **968 of 1,035,948**,
where the phone's label is the shorter `SCAN`. The same number on two different pages is a shared
element, not a page's own content — the diff was read as a total and its cause assumed rather than
located. A pixel count answers *how much* moved; only looking answers *what*.

## Loading and Errors — the shimmering title on every waiting card was zero pixels wide

`SkeletonCard` drew its header as `<CardHeader title={<SkeletonBlock width="42%" />} />`. `CardHeader`
puts the title in `span.section-label`, and `.card-header` is `display:flex`, so that span is a flex
item sized to its own content — whose only content is a bar asking for 42% of it. Each waits on the
other and both resolve to nothing.

Measured in Chromium 141, `getBoundingClientRect()` on all four header-drawing cells: **span 0px, bar
0px**, inside a header **378px** wide and **44.67px** tall. Seen again from an unrelated route
(`RecordWait`'s waiting state): bar 0×13 in an 850×44.67 header while the body lines below it drew
729px. Every waiting card on Home, Orders, Statistics, Settings and the list pages showed an empty
band.

The height contract was never the casualty — the band held its 44.67px and the divider drew, so the
job of not shifting the page was done throughout. What was missing was the only part a reader can
see. The bar is a length now, not a fraction of a width that is waiting on it. After: **bar 140px,
header height 44.67px**, unchanged.

## Charts — a thinned axis named the wrong columns and reported nothing

`MonthTick` and `WeekdayTick` read `months[index]` and `days[index]`. Recharts drops ticks when an
axis runs out of room and numbers the survivors from zero, so `index` is a position among what is
still drawn. The same two functions already read `visibleTicksCount`, so the thinning was known
about; only the lookup missed it.

Measured in Chromium 141 on six weeks of data, comparing each label's centre against the bar centres
under it:

| chart width | bar centres | labels drawn | sat over columns |
|---|---|---|---|
| 520px | 43, 130, 217, 303, 390, 477 | Week 14 … Week 19 | 1, 2, 3, 4, 5, 6 |
| 348px | 29, 87, 145, 203, 261, 319 | Week 14, Week 15, Week 16 | 2, 4, 6 |

At 348px three columns were named, and all three were named wrong. It bites at Week and Quarter
width, whose labels have no short form (`api/src/lib/stats.js:53,70`), on a card narrow enough to
thin — a phone. A month window escapes because "Dec" always fits.

The row is looked up by the value the axis is keyed on, not by tick position. After, same instrument:
348px draws **Week 15, Week 17, Week 19** over columns 2, 4 and 6, and 300px agrees.

## Form Validation — quantity refused a half, and the README had never asked it to

The Fields and Forms rules state `quantity > 0` and `amounts max two decimals`. Both ends of the app
enforced something else: `react/src/api/rules.js` tested `WHOLE_NUMBER_PATTERN` (`/^\d+$/`) and
`Number(v) < 1`, and `api/src/lib/validate.js` tested `Number.isInteger(quantity) || quantity < 1`.
The column had been `quantity REAL NOT NULL` since `001_init.sql`, and the totals triggers multiply
it — so half a kilo was storable and summable, and only the two validators stood in the way.

A quantity now takes the rule the two price fields take, `AMOUNT_PATTERN`, and is bounded above 0 and
at or below 9999. Measured against the running API: `0.5` accepted and decorated to subtotal
**6.25** and saved **1.25** from `0.5 × 12.50` against a `15.00` retail; `1.1` accepted; `0.333`
and `0` refused 400. In the browser at 1440px the line reads **`0,5 × 12,50 kr.`** and a whole two
still reads **`2 × 24,95 kr.`**, not `2,00`; the edit field pre-fills **`0,5`**; typing `0,755` is
refused in the field's own words and `0,75` saves to **`9,38 kr.`**

One trap worth the line it costs: a two-decimal test written as `Math.round(q * 100) !== q * 100`
refuses `1.1`, `2.2` and `8.7`, because `1.1 * 100` is `110.00000000000001` in binary floating point.
Rounding and comparing back — `Math.round(q * 100) / 100 !== q` — accepts all three and still refuses
`1.005` and `0.333`. Checked across 19 values before it shipped.

Not checked: Firefox and WebKit; every measurement above is Blink.

## Create and Edit — the note field was given the quantity's column

`.line-card-fields` is a two-track grid. Description and Retail price each carry a class that spans
it; Quantity and Price paid take a track each and are meant to. The note carried no class at all, so
it auto-placed into whatever track came next — column one, which on a phone is the 92px box sized for
a two-character quantity.

Measured on an iPhone 15 descriptor at `deviceScaleFactor: 2` (Chromium 141), reading
`getBoundingClientRect()` inside the open line card: grid **265px** across at
`grid-template-columns: 92px 157px`; Description **265px**, Retail **265px**, Note **92px** with a
**60px** input. A field for free text was drawn a third the width of the field above it and the
field below it. At 1440px the same fault was quieter and still there: **241px** of an available
**498px**.

The README's own test is the content, not the importance — full width when the content has no
predictable length, and it names notes in that list. The fix is the class the description already
uses, on both line forms that have this shape: the item card and the scan review's line card. No new
rule; a second name for `grid-column: 1 / -1` would have been one declaration in two places waiting
to disagree.

After, same instrument: Note **265px** on the phone (input **233px**) and **498px** at 1440px, level
with Description and Retail at both.

Not checked: Firefox and WebKit.

## Form Validation — the field filter promised more than it delivered

`sanitizeAmount` runs on every keystroke in a money field, and the comment above it claimed the
result: *"The field cannot show a value the app never accepts."* It stripped a sign and letters
and nothing else, so nine shapes reached the field and were refused only on save. Measured by
running the live filter against `AMOUNT_PATTERN`:

| typed | field showed | on save |
|---|---|---|
| `1,2,3` | `1,2,3` | rejected |
| `0,755` | `0,755` | rejected |
| `89,,95` | `89,,95` | rejected |
| `,5` | `,5` | rejected |
| `1.23` | `1.23` | rejected |

Nine money fields ran the filter and **four ran none at all** — the category budget, the wish
price, and both amount filters on All orders. Same kind of field, two behaviours, and the two
raw `<input>`s on All orders were the only money fields in the app not going through
`TextInput`.

The filter now collapses a second comma and a third decimal into the value being typed and
drops a separator standing before the first digit, while leaving a trailing comma alone so
`12,` can still become `12,5`. Verified in the browser by typing into the real fields:
`1,2,3` → `1,23`, `0,755` → `0,75`, `89,,95` → `89,95`, `,5` → `5`, `-12,50` → `12,50`,
`12,` → `12,`, and `1.234,56` untouched. All thirteen money fields run it.

One shape is deliberately still left to the save: a misplaced grouping dot (`1.23`, `1..234`).
A dot is either grouping or a typo, and the app cannot tell which — `1.23` could be a slip for
`1,23` or the start of `1.234`. Guessing would silently change a figure nobody asked to change,
which is worse than a rejection that names the shape it wants.

Not checked: Firefox and WebKit.

## Order read — the status log hid the one step it existed to show

`order_statuses` is a log: `saveOrderStatuses` always writes an `Ordered` row from the order's own
date, then `Delivered` and `Returned` when they exist. The Details card printed
`statusHistory[0]` under the fixed label `Date` and only named the entries after it, so the first
step lost its name. On an order that reached Delivered the same day it was ordered, the card read:

| row | shown | actually |
|---|---|---|
| Status | Delivered | the current status |
| Date | 04.09.2026 | the **Ordered** step |
| Delivered | 04.09.2026 | the Delivered step |

Two rows, one word between them, and `Ordered` appeared nowhere on the page. Read straight down it
says Delivered twice and reports no history at all.

The SHOW/HISTORY control was measured in the same pass. Every other child of that card body spans
the card's full 350px; the link spanned **1045→1143, 98px**, left-aligned in a column whose values
are all right-aligned, sitting between two label/value rows with no rule tying it to either.

The log is now its own card, collapsed behind its header band, and every row is the step's own
name against its date. Verified in the browser on an order with `[Ordered 04.09, Delivered 04.09]`:
collapsed the body reports `hidden`, `aria-expanded="false"`, width 0; expanded it draws
`Ordered 04.09.2026` and `Delivered 04.09.2026`, both **350px**, level with every row in Details.
On an iPhone 15 the rows measure 327px and `documentElement.scrollWidth` stays 393 against a 393
`clientWidth`, before and after opening it.

The card is drawn only when the log holds more than one step: an order still only ordered would
otherwise get a card repeating the date the Details card already shows. Measured both ways — a
two-step order draws `Details, Status history, Note`, a one-step order draws `Details` and no
history card at all.

Opening it once left it open on every order after that. The page keeps the same component across
a change of `:id`, so walking order → order carried the state over and the next order arrived
expanded on a log nobody had asked for; a bare `goto` hides this, since only in-app navigation
reuses the component. Reset on the id, and re-measured along the same walk: open on one order,
away, back — `aria-expanded="false"`, body hidden.

`CardHeader`'s disclosure branch already existed and nothing in the app called it. It was the
design-sync pass that recorded that, which is how it was found rather than rebuilt.

Not checked: Firefox and WebKit.

## Honest Affordances — three values printed in the language of the code

Three strings reached the screen describing how a record is stored rather than what the reader
chose:

| where | printed | what the reader can do with it |
|---|---|---|
| Order read, Details card | `73860 km` | nothing — a bare unlabelled line under a divider |
| Category summary | `#7A8B2E` | nothing — the tile above already is that colour |
| Category summary | `music` | nothing — the tile above already is that glyph |

The order note was a `field-help` span measured at **1045→1105**, no label of any kind, sitting
after a divider at the foot of a card of label/value rows. Nothing on the page said the words were
the note the account wrote, so a note that happens to be a bare number reads as a stray figure.
The design system already put notes in their own card; the code had folded them into Details.

The colour row ran `resolveColour(...).toUpperCase()` and the icon row printed the Tabler
catalogue key. The vendor summary carried the same colour row, found by grepping rather than by
being shown — one report, every instance.

After: the note is its own card with its own header, and the three rows are gone. The category
summary now lists Name, Favourite and Monthly budget; the vendor summary keeps Initials, which is
a value the account typed and can act on. Verified by reading the rendered rows back from both
cards.

Not checked: Firefox and WebKit.

## Tooltips — one look, written out four times

The app drew four hover labels and none of them shared a rule. Measured from the stylesheet
before the change:

| where | surface |
|---|---|
| line chart | `--bg-card`, `--radius-page`, no border, `0 2px 6px /.06, 0 14px 34px /.12`, 11.5px |
| weekday bars, month columns | `--bg-card`, `--radius-compact`, **1px border**, `0 2px 6px /.08`, 11px |
| donut ring | the same as the bars, written out again |
| sidebar build-quality callout | the chart's surface again, with `16px` in place of the radius token |

Three looks across four copies, and the wide shadow pair appeared in two of them as a literal
while `--shadow` already held that exact shape for the auth card and the prompt bar.

They are now one `.tooltip` rule that every caller wears, and each keeps only what is really
its own — the chart's grid and `min-width`, the bars' row gap, the ring's weight, the callout's
position. Read back from the browser, all five callers now compute identically: white,
`12px`, `0px` border, `11.5px`, and the same two-layer `--shadow`. The literal
`0 14px 34px` no longer appears anywhere in the stylesheet.

The icon grid was the fifth caller and the reason for the pass. 5,129 glyphs and no way to
learn what one is without choosing it, and the grid clips: its declared `overflow-y: auto`
makes the computed `overflow-x` `auto` too, so a label drawn inside it loses its top edge. It
is drawn into `document.body` and placed against the viewport instead.

Placement tries north, south, east, west and takes the first that fits, then slides along the
free axis. Forced against each edge by shrinking the viewport, hovering every tile of a search
and reading the chosen side and the label's own rectangle back:

| viewport | side chosen | off-screen |
|---|---|---|
| 1440x900 | n | 0 of 5 |
| 1440x240, grid pinned to the top | s | 0 of 5 |
| 1440x90 | e | 0 of 5 |
| 320x560 | n on four, w on the tile at the right edge | 0 of 5 |

It answers keyboard focus as well as hover, checked by focusing a tile with no pointer over the
grid at all.

One trap came with it. The label spells the name in spaces, so `gas-station` reads "gas
station" — and the search matched only the hyphenated form, meaning the words the tooltip
showed returned nothing when typed back. A typed space now reaches a hyphen.

Not checked: Firefox and WebKit.

## Tooltips — sharing the look is not sharing the component

The pass above put every hover label on one `.tooltip` surface and called it done. It was not:
one of the five was still a different thing wearing the same coat. The sidebar's build-quality
scores kept their own mechanism (`position: absolute` in the footer, revealed by a CSS
`:hover`/`:focus-within` rule, no viewport awareness) and their own three content classes,
whose row and figure did exactly what `tooltip-row` and `tooltip-value` do:

| | sidebar scores | Tooltip component |
|---|---|---|
| surface | shared | shared |
| placement | absolute in the footer | fixed, portal to `document.body`, picks a side |
| shown by | a CSS hover rule | pointer and focus handlers |
| content | `build-quality-title` / `-row` / `-meta` | `tooltip-title` / `-row` / `-value` |

It passed review because it looked right. That is the whole hazard: a shared surface over a
private mechanism reads as finished and drifts the moment either half moves.

It is the component now. The reason first given for keeping it separate — that it stays open
while focus is inside it, which `pointer-events: none` would break — did not survive checking:
nothing inside it is focusable, so `:focus-within` only ever meant the band itself, which is
what the component's own focus handling does. Four private rules deleted, and the padding
that was only the sidebar's is the shared default for all five.

Verified in the browser on the real sidebar: hovering the band draws the label as a child of
`document.body` (the portal), side `n`, padding `10px 14px`, fully inside the viewport, and
focusing the band with no pointer draws the same thing. All five callers compute one surface.

Not checked: Firefox and WebKit.

## Components the app had and did not use

The tooltip was not the only one. Sweeping the source for raw markup wearing a component's own
classes found **eight `<button className="button …">`** across four files — `ListToolbar`'s
FILTERS disclosure, `DashboardCards`' EDIT / DONE / CANCEL / ADD, `OrderDetail`'s ADD FILES and
two on `Scan` — each hand-writing exactly what `Button` renders (`<button type="button"
className={classes} {...rest}>`).

All eight are the component now. Verified in the browser that nothing was lost in the swap,
since `Button` forwards everything through `...rest`: FILTERS keeps `data-filters-toggle`,
`aria-expanded` and `aria-controls` and still opens its panel; `data-add` survives on the tray
buttons; and the `ref` that `DashboardCards` focuses still works — cancelling puts focus back on
EDIT, which is the only proof that a ref reaches the real element. Scan's OPEN and DETAILS are
behind a loaded receipt and were not reachable in this pass; same markup shape, compiles clean,
not seen rendering.

Two raw `<button>`s on Scan are deliberately left: they carry no `button` class and are styled
by `.ai-suggestion-row button`, a different control.

`SummaryRow` was the other one: **25 raw `<div className="summary-row">`** across six files
(CategoryForm 2, EditOrder 4, NewOrder 5, OrderDetail 6, VendorForm 5, WishForm 3). They were
not laziness. The component hard-coded `tabular-figures` on its value, so a row whose value is a
word ("Delivered", "Expense") or a link looked wrong to write through it, and callers routed
around — the component too narrow for its own call sites.

The escape turned out to be from nothing (see the next entry: that class changes no pixel with the
current typeface),
so the widening needed is small. `SummaryRow` takes a `variant` for the tone, the way `Card`
takes class words, and its value was always free to be a node. All 25 are the component now.

Proved neutral rather than asserted: the four reachable summary panels were screenshotted
before and after and diffed pixel by pixel — **0 differing pixels across 6,533,832**, max delta
0. Checked besides that the one toned row still computes
`summary-row-value-saving` at rgb(14, 122, 82), and that the Vendor and Categories rows still
render real links.

Not checked: Firefox and WebKit.

## `tabular-figures` has never done anything

Chasing why 25 rows avoided `SummaryRow` led to the class they were avoiding. It is applied in
**36 places** in the source and backed by three `font-variant-numeric: tabular-nums` declarations,
and it changes no pixel anywhere.

| check | result |
|---|---|
| computed style on an element carrying the class | `font-variant-numeric: tabular-nums` — the class does reach |
| eight `1`s vs eight `8`s, without the class | 112px vs 200px at 40px type |
| eight `1`s vs eight `8`s, **with** the class | 112px vs 200px — identical |
| same again via `font-feature-settings: "tnum" 1` | identical |
| woff2 table directory (uncompressed, so readable without tooling) | `GPOS GSUB OS/2 cmap glyf loca head hhea hmtx maxp name post` |

The chain breaks at the font, and precisely there: the class asks correctly, the layout tables
exist, and Poppins simply has no tabular digit set to answer with — its figures are proportional
by design. Counting strings in the `.woff2` proves nothing either way and should not be used as
evidence: woff2 table data is Brotli-compressed, so a tag can be present and unfindable. The
table directory is the part that is readable, and the rendered advance widths are what settle it.

The consequence is small but real: money columns do not align on the decimal. The `kr.` lines up
because the values are right-aligned, and that is all that was ever holding them. Nothing on
screen changes if the class is deleted.

**Kept anyway, deliberately.** The declaration costs nothing while it does nothing, and it states
the intent for every figure in the app — so the day the typeface changes to one with a tabular
set, the alignment arrives without hunting for the places that wanted it. What must not happen is
a second reading of the same fact: this entry is why the class looks inert, so nobody deletes it
as dead code.

Not checked: Firefox and WebKit.

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

## Cards — a note and the action under it

The question card's answered state — the green answer, then SEE THOSE ORDERS — drew the button **flush
against the note, 0px measured**. `.button.button-block` declares a 12px top margin of its own and
`.button.button-ghost` declares none, so the gap depended entirely on which variant the answer
happened to be followed by: the same pair on Orders / Overview stood correctly at 12 because the
button there was the block variant.

The fix sets the gap from the note (`.note + .button { margin-top: 12px }`), so the pair is 12px
whichever button follows it. The block variant's own margin computes to the same 12 rather than to 24
— equal specificity, and the note rule is later in the file.

Measured after, in Blink 141.0.7390.37 at 1440x900: the four children of `.card-question` sit at
9.3 / 12 / 12, the ghost button's computed `margin-top` is 12px where it was 0, and the block pair on
Orders is 12. The rule matches no element in the prototype's own markup — its two notes are followed
by field rows — so none of the three committed screenshots moved: **0 differing pixels of
11,403,840**.

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

The chips choose a width and the pager steps by it: **14 windows at 1W**, **3 at 1M**, and **1 each at
3M, YTD and ALL** — every day the store holds, with both arrows disabled at once. Paging left from
*20–26 July* reaches *13–19 July*, and keeps going into June, which no month pager could reach. The
arrows name their own step: *Previous week*, *No later month*, *No earlier range*.

The weeks are **ISO weeks**: Monday to Sunday, numbered so that week 1 holds 4 January, and labelled by
that number and its year — **18, 2026**. Chunking each month into sevens from its own 1st was the first
version of this and it named a stretch of time no calendar agrees with: the store starts on **Friday 1
May**, which is the tail of week 18 and the head of nothing. **12 of the 14** windows are whole weeks,
each running Monday to Sunday — asserted on the weekday of both ends, not on the arithmetic that
produced them — and the two clipped ones are where the records stop: week 18 holds *1–3 May*, week 31
holds *27–31 July*. One week, 27, spans two months (*29 June – 5 July*), and the cards beside it read
the month most of its days fall in, which for a whole week is the month holding its Thursday — the rule
ISO itself uses to place a week in a year.

**A window compares against the same number of days before it, or against nothing.** Week 19 is a whole
week with only three days behind it in the store, so it carries no comparison rather than a seven-day
window measured against a three-day one.

**18, 2026 is a number and a year, and nothing in it says week**, so the word is in the accessible name
and not in the pixels: `Week 18, 2026` read back off the heading, *18, 2026* drawn. The days are on the
card below it — *Overview · 29 June – 5 July* — and the arrows say *Previous week*.

**Changing the width never walks the reader off the month the cards were showing.** Each window stands
on the newest day belonging to the month it is filed under, and that day is what the new width resolves
against: asserted over all **17** windows, 1M from any of them lands on the month that window's own
cards named.

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

What cannot follow the window says which month it is about instead of sitting silent: the KPI row took
a heading — **JULY 2026 IN NUMBERS** — and the rhythm card reads *of July's spend lands on weekends*.
The pace, the split and the returns already named the month and were left alone.

### Measured

Chromium **141.0.7390.37** under Playwright **1.56.1**, driving the app at `localhost:5173`, every state
entered by clicking what a user clicks and the state read back rather than assumed. **37 assertions
pass**, at 1440x900 and again under `devices['iPhone 13']`. A second pass over the data layer — **63
assertions** — walks all five widths end to end, **14, 3, 1, 1, 1 windows**, no pager looping, every
list walked to both ends, and checks each window's running total against the figure printed above it.

The header band is what a longer title could have broken, and did not: at 390 every `.card-header` on
the page is **44.67px**, the one band tall, measured on the longest title the page can produce —
*Overview · 29 June – 5 July*, the week that spans two months. Nothing overflows its
card (`right` against the parent's `right`, per element, since `.main-panel` clips and the document's
own `scrollWidth` cannot report an overhang), and the document does not scroll sideways. No console or
page errors in either viewport.

`docs/home.png` is the shot this change could have moved, since the hero's chart label now follows both
of its controls. Re-rendered from the app in this container it comes back at **0 differing of
5,184,000** — the label is an accessible name and moves no pixels. `docs/all-orders.png` and
`docs/phone.png` hold no part of Statistics and were not touched. There is no committed shot of
Statistics, so the two states above were read out of the DOM rather than compared against a file.

Gecko and WebKit are not installed in this container and were not checked.

**Not fixed, and deliberate:** 3M, YTD and ALL all land on the same 92 days, because 92 days is
everything the store holds. They are told apart by what they are called — *May – July 2026*, *2026 so
far*, *All time* — and by the resolution they are drawn at (13, 12 and 6 points), not by their span.
Three chips that cover the same days are honest here only because each label answers its own question;
give the store a fourth month and 3M stops covering all of it, with no code to change.

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

Older detail still sits inline in `README.md`, written before this file existed. It moves here when
the section it is in is next touched, rather than in one sweep — a rule rewritten while nobody is
looking at it is a rule nobody re-verified.

---

## §10 Cards — a note and the action under it

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

## §13 Honest affordances — FILTERS starts closed, and the panel shows the filter

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

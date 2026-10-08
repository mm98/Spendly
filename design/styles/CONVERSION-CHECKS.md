# Checks to run after converting a page

**Run `styles/check.js` first.** It is this document as assertions, and a clean run
means the mechanical rules hold. From a script step:

    const factory = eval(await readFile('styles/check.js'));
    const { report } = await (await factory)({ readFile, ls });
    log(report);

It checks, across every page and stylesheet: markup balance, unique ids, resolving
references, every class resolving to a rule, every token defined, no `var()` fallbacks
outside the four per-instance hooks, no inline styles, one rule per selector per scope,
at-rules declared after their base rule, no duplicate rules, one name per role, every
control named, a field label bound to its control, a combobox named once, the title
stack pattern and its card-body exception, the saving rules, typographic tells, and
gaps on the scale.

Rule 19 answers the question that kept recurring - "why is this card gap 16?" The
documentation frame separates *drawings* at 16, and a drawing is a labelled specimen.
A wrapper holding bare components with no label between them is not separating
drawings; it is a row of cards, and it takes 12. The wrapper decides this itself in
`doc.css`, so it applies to specimens that do not exist yet.

Rule 18 is worth stating in words too: **a full screen sits in a screen frame.** A
drawn screen - anything carrying a bar and the content under it - is
`.doc-screen.doc-frame` on desktop and `.sp-phone` on a phone, so every screen is the
same 1400 width, on the same ground, with the same border and radius. Three pages had
their own instead (1240, 1240, 1280), and a screen laid out directly on the
documentation page takes the page frame's spacing rather than its own. A lone sidebar,
top bar or tab bar is a component specimen and needs no frame.

Two things it cannot check, which still need eyes: whether a thing *looks* right, and
whether two components that share no code nonetheless draw the same state two ways
(five treatments for a selected row, three for a pressed option). When a check finds a
defect the file did not predict, add the assertion rather than fixing only the instance
- otherwise the next pass finds only what someone remembered.

## 0. Never hand-build. Copy the specimen.

The single largest source of defects in this conversion. Every one of these was
built by looking at an old page's drawing and assembling something that resembled
it, instead of copying the component's own markup:

- an attention row as count + text + spacer + label, where c24 is count + text
  carrying `sp-grow` + `.sp-list-item__chevron` - two type sizes each centred on
  the row, so their baselines never met
- a toolbar as a flex row of boxes, where c20's `.sp-controls` already grows the
  search, holds the combobox and button at content width, and sets the trigger to
  `width: auto` - the hand-built version overflowed its card by up to 720px
- a search as a div with an icon inside it, where `.sp-picker__search` exists
- ⌘K as placeholder text, where `.sp-kbd` in `.sp-field__kbd` exists
- a screen title as `doc-section__title` - documentation chrome inside a mockup

The rule: find the component in `Components.dc.html`, copy its markup, put the
page's content into it. If the component does not cover the case, say so and ask - do not approximate it. A page rule is only ever for what a mockup needs and the
app never renders: a device frame, a specimen width, a stand-in block.

## 1. One variant per role

Group every control by the role it plays, not by what it looks like, then assert
one variant per group. The roles that matter:

| Role | How to detect it | What it must be |
| --- | --- | --- |
| Dialog or sheet foot | inside `.sp-dialog`, `.sp-sheet`, `.sp-line-editor__foot` | `--caps` |
| Card footer, committing | inside `.sp-card__footer`, and it changes data or closes a decision | `--caps` |
| Card footer, revealing | inside `.sp-card__footer`, and it only shows more of what is already there ("Show all 200 vendors") | `--text --small` |
| Card header | inside `.sp-card` beside a `.sp-section-label` | `--small` |
| Page or form action | loose in a page, a toolbar, or a form | default, 42px |

The distinction in a footer is **commit versus reveal**: "Update view", "Merge
them", "Delete order" change something, so they are caps; "Show top 8 only"
expands the card's own content, so it stays a text button.

**The footer decides, not the button.** A footer either commits or it does not, so
every button in it agrees - including the way out. "Cancel" beside a caps "Save"
is caps too, at `--text --caps`: it keeps the quiet treatment and takes the
committing size, because a pair reads as a pair only when both halves are the
same size. A 12px sentence-case Cancel next to an 11px caps Save is the most
common version of this defect, and it looks deliberate until you measure it.

Check: for every group of two or more buttons, if any is `--caps` they all are.

Same exercise for every other repeated element: a list row, an identity mark, a
gauge, a summary row, a field label. If two pages draw the same role differently,
one of them is wrong - and it is usually the one whose class came from an old
inline style rather than from the component's own specimen.

## 1b. A card's action is in the footer, not loose in the card

`.sp-card__footer` is the card's action area. A button dropped straight into the
card's own stack lands in the same place with the same spacing and no rule above
it, so the two read as one thing drawn two ways - and a full-width button with no
rule above it reads as one more row of content.

The rule above the footer is about context, not about the footer: it draws where
content ends and action begins, and `.sp-well + .sp-card__footer` drops it where
that boundary is already drawn.

Check: `.sp-card > .sp-btn` must return nothing. Settings had nine.

## 2. Labels are written in sentence case

`--caps` uppercases in CSS. A label typed in capitals renders identically, so the
defect is invisible in the browser and only shows up in the source - and it is
how a button ends up uppercase in the *wrong size*, because the text was changed
instead of the variant.

Check: any `<button>` whose text is all capitals. If it is on a `--caps` button,
put the text back to sentence case. If it is not, the variant is missing.

## 3. No class for a state the element owns

The stylesheet's own opening says it: states are the element's own - `:hover`, `:focus-visible`, `:checked`, `:disabled`, `[aria-invalid]`. So an
invalid field is `aria-invalid="true"`, never `.sp-input--error`. Three such
variants were invented during conversion and had to be deleted.

Check: any variant class named after a state rather than a kind.

## 4. Copy the specimen, do not infer the class

The failure mode behind most of this: reading an old page's inline style and
picking the class that matches it. A mapping pass folded a 12px/600 label into
`.sp-title`, and an entire page rendered its field labels at 14px with zero
`.sp-field__label` in it.

When a control exists in Components, copy its markup from the specimen and put
the page's own content into it. Do not rebuild it from what the old page drew.

## 5. Nothing the component already owns is restated

Padding, gap, radius, control height, mark size, column widths. If a page rule
sets one of these, either the component is missing a variant or the page is
overriding it - both are defects. `--card-pad` is the only padding a bar or a
card has.

## 6. Documentation chrome is outside the mockup

No `doc-*` class inside a `.sp-shell`, and no sentence inside a card that
explains how the design works. Mechanism goes in the notes beneath.

## 6b. Structure checks to run after ANY restructuring script

Three defects recurred on every page where a script moved or replaced a region,
each time invisible in the markup and obvious on screen. Run all three after any
script that inserts, slices or re-balances markup - not at the end of the page.

1. **Every tag closes the tag it names.** Walk the body with a stack; a closer
   whose name does not match the top of the stack is a defect, even when the
   counts balance. Replacing a `<div>` with a `<span>` and leaving `</div>`
   balances and still nests wrongly.
2. **Every `doc-specimens` and `doc-notes` is inside a section.** A slice that
   consumes a `</section>` leaves the trailing CSS panel sitting on `.sp` with no
   section padding. This happened four times on one page.
3. **The `.sp` wrapper closes last.** An auto-balancer will happily close it after
   the fourth section and leave three outside the scope, which silently drops
   every component style from them.

## 6c. A page rule cannot hide an element that carries a component class

`display: none` in `@layer base` loses to `.sp-field { display: flex }`, which is
unlayered - whatever the specificity. An element a page needs to show and hide
must carry only page classes; put the component on a child.

This one recurs, so check it mechanically rather than by eye. It bit four elements
on one page in a single session - `.rr-facet-trigger`, `.rr-rail-summary`,
`.rr-facets`, `.rr-panel`, `.rr-list-chevron` - each time by *adding* a page class
onto an element that already carried a component class, which reads as tidy and
silently kills the rule.

Check: for every page class whose rule sets `display: none`, list the elements
carrying it and assert none of them also carries a component class that sets
`display`. Sharing an element with a component class that does **not** set display
(`.sp-data`, `.sp-right`, `.sp-col-*`) is fine.

And do not trust the markup: probe the computed value at the width the rule is
written for. `getComputedStyle(el).display` at a 1200px container is the only proof
that a 1280px query actually swapped anything.

## 7. One value per job, and two values that are not the same job

Spacing drifts by being decided per page. The values, and the test for each:

- **12 between cards.** Card against card, anywhere inside a drawn screen - two-up pairs, screen columns, stat grids. Eleven rules across five pages had it
  at 8, 10 or 16, so a screen's rhythm changed page to page.
- **16 and 8 in the documentation frame, and nothing else.** 16 separates one
  drawing from the next, 8 holds a drawing together with its label and its notes.
  12 is the product's gap: when the frame used it too, the paper and the thing
  printed on it spaced alike. The two exceptions are the ones that *are* the
  product - `.doc-table__row`'s column gap, which must match `.sp-table`'s, and
  `.doc-card`, which is a card.
- **6 and 8 inside a card are different jobs.** 6 is lines of one thing: a title
  with its meta, subtitle or second line. 8 is separate things: values in a row,
  buttons, a section label and what follows it. Both are correct; using one where
  the other belongs is the defect.

Check: grep every `gap:` in the page stylesheets, and every `sp-gap-*` in the
markup, and sort them by what they separate rather than by their value.

## 8. A token with a fallback is two values

`var(--sp-24, 24px)` looks like a token and is a literal: `--sp-24` does not
exist, so the 24 is what renders, off a scale that stops at 16. Worse, the same
invented name can carry different literals on different pages - `--shell-deep`
was `#14261c` on one page and `#1f1c19` on another, giving the system two dark
grounds where it has one.

A fallback is legitimate only for a per-instance hook that something actually
sets (`--swatch`, `--p`). Everywhere else it hides either a missing token or a
value that should not exist.

Check: every `var(--x, y)` in every stylesheet. Assert `--x` is defined
somewhere; if nothing sets it, the fallback *is* the value, so write the value.

## 9. One name, one rule

`.dm-pair` was a two-up grid at 12 and an inline swatch pair at 6, in the same
file, with the inline rule second - so the one element wanting the grid silently
got `inline-flex`. Later wins, and nothing warns.

Check: for every class defined more than once in a file, assert the declarations
do not conflict. Different `display` values under the same name is the signal.
Variants under `@media` or `@container` are not this - they are the same rule at
another size.

## 10. Every class resolves, and every class is reached

Two directions, both defects:

- a class in the markup with no rule behind it - six of them, including a head row
  carrying a deleted `--head` class, which had been rendering as an ordinary row
- a rule no markup reaches - twenty-one, including a hand-built phone and sheet
  left behind when that page was converted

Check both ways: every class in the markup has a rule; every page rule matches
something.

## 11. Sweep on text, not on classes

A rule about what the design *says* is checked by searching the text and ignoring the
class. A class-scoped sweep misses every instance sitting on another class, and that
is exactly where violations hide: a saving rendered on `sp-subtitle`, a card header on
`sp-title`, a list row on a page-prefixed div.

Two rules that need this check:

- **A saving is always `Saved N kr.` in green**, never a percentage, never "vs retail".
  Zero stays grey. A percentage is fine for a limit ("+18% over the limit"), which is
  a different thing.
- **A saving sits under the amount it belongs to**, never in a meta line beside the
  record's name: in a table row that is `.sp-cell-amount` (amount, then the saving
  beneath it), in a card it is `.sp-record__foot`, and in the narrow list card it is
  the third line of the right column. A saving stated as a fact in a grey subtitle
  reads as prose and takes the subtitle's ink, which is how nine of them ended up
  grey while the rest were green.
- **No em dashes, no en dashes, no curly punctuation, no decorative emoji** - anywhere,
  including comments and markdown. Check the entity forms too (`&mdash;`, `&rsquo;`,
  `&ldquo;`); a character sweep does not see them.

## 12. Compare whole rule profiles, not single rules

Two names for one job is the same defect as two implementations. Finding them needs
every rule a class carries - its states, variants and descendant selectors - compared
as one profile. A single-rule comparison found 5 duplicate names in this system; the
profile comparison found 29.

Two things that look like duplicates and are not: a class that owns child elements
(`sp-picker`, `sp-shares` - collapsing the block orphans `__search`, `__row`), and
unrelated components that share one declaration by coincidence (four components are
a column with gap 6; that is not an alias).

## 13. Then look at it

Zero inline styles and a clean class audit still miss: a pill stretched full
width because it was a column child, a mark 85px below the controls it labels
because `.sp-top` was never defined, two columns 2px out of line because each
stated its own gap. Measure the things that should align, and compare a role's
computed size across the pages that use it.

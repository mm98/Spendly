# Project rules

## Reuse what exists; never invent a new screen

This project is one connected flow of sections, areas and pages. A question about behaviour is answered inside the section, area or page that already owns it - by showing another state of it, or by adding a note to it. Do not answer by adding a new screen, a new section, or a parallel version of something that already exists.

Before building anything, find where it already lives and read it. If the answer genuinely needs a new screen, ask first.

Never present alternative versions of an existing element (two bars, two navs, two layouts) unless asked for options. One design, applied consistently everywhere it appears.

## One implementation per component, everywhere

This design system is read by Claude Code to build components, not one-off screens. Two versions of the same thing on two pages produce two components in code, which is a defect.

So: a component is drawn once and reused. Every later appearance uses the same markup, the same dimensions, the same spacing and the same states - a list row, a mark, an amount field, a picker, a bar, a card looks identical on every page that shows it. If a page needs a variation, it is a state of the existing component, documented next to it, not a second implementation.

Spacing and gaps are part of the component, not per-page decisions: reuse the established gap, padding and radius values rather than picking a new number that happens to fit the page.

Before drawing anything, find the page that already owns that component, read it, and copy it exactly.

## A finished component stays finished

Once a component looks right, its appearance is closed. No later work may change it - not by editing its rules, not by adding a page or base rule that outranks it, not as a side effect of something else. If new work needs a different look, it is a variant class on that component, added beside it.

In `styles/components.css` this is enforced by the cascade, not by care: page and base rules live in `@layer base`, component rules are unlayered, and unlayered styles always win over layered ones whatever their specificity. Keep it that way - never move a component rule into the layer, and never raise a base rule's specificity to beat one.

After touching that file, check the components you did not intend to change still render as they did.

## Ask before changing type, colour or any established style value

Font sizes, weights, colours, radii, spacing scale and component dimensions are settled. Do not change them - including "while I'm here" adjustments, or to make new content fit. If something does not fit at the established values, say so and ask.

Adding a state or a note to an existing component is normal work. Restyling it is not.

## No em dashes, and no other typographic tells

Every dash in this solution is a plain hyphen. No em dash, no en dash. This holds everywhere, not just in product copy: mockup text, notes, CSS and JS comments, commit messages, the markdown documents, and any handoff package built from them. The entity forms count too - `&mdash;`, `&ndash;` - since a character sweep does not see them.

The same applies to curly punctuation: straight apostrophes and straight quotes only (`'` and `"`, or `&quot;` where a double quote would break an attribute). No `'`, no `"`.

No decorative emoji anywhere. The check marks, sparkles and arrows that read as machine-written are out; an icon from the register does that job.

After any writing pass, sweep the files for `—`, `–`, `'`, `"`, `&mdash;`, `&ndash;`, `&rsquo;`, `&ldquo;` and fix what turns up.

## A saving is always an amount, never a percentage

Anywhere the design shows what an order or a vendor saved, it reads `Saved 1.320,00 kr.` - the capital, the amount, the currency - and it is green (`sp-amount-secondary--positive`, or `sp-stat__delta`). Never a percentage, never "vs retail", never "compared to retail", never a bare `-80%`.

A saving of zero stays grey: `Saved 0,00 kr.` on plain `sp-amount-secondary`, since nothing was saved.

A saving sits under the amount it belongs to, never in a meta line beside the record's name: in a table row that is `sp-cell-amount` - the amount, then the saving beneath it - in a card it is `sp-record__foot`, and in the narrow list card it is the third line of the right column. A saving stated as a fact in a grey subtitle reads as prose and silently takes the subtitle's ink.

A percentage is legitimate for a limit or a target, which is a different thing: "+18% over the limit" is correct.

## Run styles/check.js before saying anything is consistent

The rules below are written as assertions in `styles/check.js`. Run it instead of
inventing a scan:

    const factory = eval(await readFile('styles/check.js'));
    const { report } = await (await factory)({ readFile, ls });
    log(report);

A clean run means the mechanical rules hold across all pages and stylesheets. Run it
after any pass that touches markup or CSS, and before reporting that something is
consistent - "I checked" without it means "I checked what I happened to think of".

When a defect turns up that the checker did not predict, add the assertion first and
fix the instance second. A rule that exists only in a summary is a rule that comes
back.

## A new page joins the checks

Any new `.dc.html` page is added to the `PAGES` list in `checks.html` in the same pass that creates it, and to `index.html`. `styles/check.js` asserts the first; a run that reports "every page is checked" means a page was added without it.

## Sweep on text, not on classes

When checking a rule that governs what the design says, search the text and ignore the class. A class-scoped sweep misses every instance that happens to sit on another class, and that is where the violations hide - a saving on `sp-subtitle`, a card header on `sp-title`, a list row on a page-prefixed div.

The same applies to structure: compare a class's *whole* rule profile - every state, variant and descendant selector - not one rule at a time. Two names for one job is the same defect as two implementations, and a single-rule comparison finds only a fraction of them.

## Mechanism explanations never go inside the layout

Copy inside a mockup is **product copy** - what the user would actually read on screen. It describes outcomes in their terms.

Anything explaining *how or why the design works* - implementation reasoning, when a control appears, what a value is derived from, why an option exists, internal costs, caching, API behaviour, or notes about the mockup itself - goes **outside** the layout, in the annotation block beneath or beside it (the thin-rule "NOTES FOR IMPLEMENTATION" pattern).

Test: could this sentence ship to a user who has never seen the design doc? If not, it is a note, not copy.

Common violations to avoid:
- "Only offered when…", "so it is absent here", "shown for illustration"
- Referring to the scanner, the model, the database, a hash, a cache, or a cost
- Explaining a default rather than stating the choice
- Telling the user what the design decided instead of what will happen

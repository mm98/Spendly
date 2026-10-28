# Project rules

## Questions are asked here, never handed on

Every design question a change raises is asked in this chat, with the question form, before the work is called done - never left for Claude Code to ask. Claude Code receives answers, not questions. A handoff is not built while a question is open; ask first, then design.

Once answered, the answer is designed in the same pass: written into the page that owns it, as the drawn state or an implementation note beside the screen. Then it goes into the handoff's CHANGES.md, with the page and screen id. A decision never lives only in chat.

## Read later.md in the repo before every task

`later.md` lives at the root of the GitHub repo (`mm98/Spendly`, branch `main`), not in this project. Read it with the GitHub tools at the start of every task, before designing anything. It lists known faults and things put off for later, some of them in the drawings, which only this project can fix.

Every entry that is a design fix is done in the same pass as the task, unless the user says otherwise, and goes into the handoff's CHANGES.md as its own section, naming the later.md entry it settles so Claude Code removes it from the file. An entry that cannot be done now is asked about here, not skipped silently.

This project writes nothing to the repo's later.md; Claude Code removes an entry in the change that settles it.

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

The same applies to curly punctuation: straight apostrophes and straight quotes only (`'` and `"`, or `&quot;` where a double quote would break an attribute). No `’`, no `“`.

No decorative emoji anywhere. The check marks, sparkles and arrows that read as machine-written are out; an icon from the register does that job.

After any writing pass, sweep the files for `—`, `–`, `’`, `“`, `&mdash;`, `&ndash;`, `&rsquo;`, `&ldquo;` and fix what turns up.

## A saving is always an amount, never a percentage

Anywhere the design shows what an order or a vendor saved, it reads `Saved 1.320,00 kr.` - the capital, the amount, the currency - and it takes the positive colour of the account's colour scheme, green in the Green scheme (`sp-amount-secondary` with `data-color="success"`, or `sp-stat__delta`). Never a percentage, never "vs retail", never "compared to retail", never a bare `-80%`.

A saving of zero stays grey: `Saved 0,00 kr.` on plain `sp-amount-secondary`, since nothing was saved.

A saving sits under the amount it belongs to, never in a meta line beside the record's name: in a table row that is `sp-cell-amount` - the amount, then the saving beneath it - in a card it is `sp-record__foot`, and in the narrow list card it is the second line of the right column. A saving stated as a fact in a grey subtitle reads as prose and silently takes the subtitle's ink.

A percentage is legitimate for a limit or a target, which is a different thing: "+18% over the limit" is correct.

## Run styles/check.js before saying anything is consistent

The rules below are written as assertions in `styles/check.js`. Run it instead of
inventing a scan:

    const cache = new Map();
    const rf = p => { if (!cache.has(p)) cache.set(p, readFile(p)); return cache.get(p); };
    await Promise.all((await ls('')).filter(f => f.endsWith('.dc.html')).map(rf));
    const factory = eval(await rf('styles/check.js'));
    const { report } = await (await factory)({ readFile: rf, ls });
    log(report);

The pages are read once, in parallel, and shared: read one at a time and twice over,
they take longer than a script is allowed to run.

A clean run means the mechanical rules hold across all pages and stylesheets. Run it
after any pass that touches markup or CSS, and before reporting that something is
consistent - "I checked" without it means "I checked what I happened to think of".

When a defect turns up that the checker did not predict, add the assertion first and
fix the instance second. A rule that exists only in a summary is a rule that comes
back.

## Every component documents its props in JSDoc

Every exported component in `react_handoff/` carries a JSDoc block directly above it, in the app's form (`react/src/components/` on main), since Storybook builds each component's props table from it:

    /**
     * What the component is, when it is not obvious from its name.
     *
     * @param {object} props
     * @param {keyof typeof VARIANT} [props.variant]
     * @param {import('react').ReactNode} [props.children]
     */

One `@param` per prop the component destructures, optional props in brackets, types as the app writes them (`import('react').ReactNode`, `keyof typeof MAP` for a closed set). A component that gains or changes a prop changes its block in the same pass. `styles/check.js` asserts it.

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

## Handoff zips

Every handoff package has the same shape, so the reader always finds the same things in the same place:

- `README.md` - the design's overview, copied unchanged from the project root. A package never writes its own note into it.
- `CHANGES.md` - the one note for the package, and the only one. No `HANDOFF.md` or other second note. It opens with a title naming the brief it answers, then one section per point of the brief (or per fix), each stating:
  - **The problem** - what was wrong or missing, and how it showed in the app or the design.
  - **What changed** - the decision, in product terms, and any value or copy it introduces.
  - **Where** - the page and screen id (`Settings and import 11b`), the stylesheet and selector, or the `react_handoff` file, and the app files the brief names (`react/src/pages/...`).
  - **What is still open** - anything not changed and waiting for a decision, marked "please confirm".
- It closes with a **Files** list (every file in the package, and why it is there) and the `styles/check.js` result.
- The pages that changed, plus everything they load to open from the folder: `support.js`, `components.js`, `icons.js` if loaded, `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, and only the `styles/pages/*.css` those pages link.

A `_fixed` package keeps the whole `CHANGES.md` and adds, at the top, what was fixed from the package it replaces.

A handoff package that has been presented is never changed in place. When a fault turns up after it was presented, copy it to a new folder with the suffix "_fixed", apply the fix there, say at the top of its CHANGES.md what was fixed, and present the new one.

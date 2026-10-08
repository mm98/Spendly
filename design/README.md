# Spendly - design system handoff, full

8 October 2026. A complete package: replaces handoff_2026_10_02, handoff_2026_10_08_full and every changes package between them. Nothing needs to be applied on top of an older one.

## Fixed since handoff_2026_10_08_full

- **index.html** carried four developer sections from an older system: a build prompt pointing at DECISIONS.md, BEHAVIOUR.md, `screenshots/` and an `offline/` folder, none of which exist, and telling the reader to transcribe inline styles; a folder structure of CSS modules and `tokens.js`; and naming rules that contradicted `react_handoff/`. They are replaced by one section pointing at README.md, PROJECT-RULES.md and CLAUDE-CODE-PROMPT.md. The STEP numbers on the cards numbered that removed prompt and are gone.
- **index.html screen ids** now match the pages exactly. It listed 14b-14g, 16c-16h, 5g, 5m and 5n, which no page has, and left out 3d, 4d-4f, 9i, 11a, 11c, 11d, 15f and 17e.
- **Type specimen** used the id 1a, which is Order editing's first screen. It is 23a now.
- **PROJECT-RULES.md** named `sp-amount-secondary--positive`, which does not exist. A green saving is `sp-amount-secondary` with `data-color="success"`.
- **styles/CONVERSION-CHECKS.md**: rule 1 told dialog and footer buttons to be `--caps`, a variant that was removed; it now says the committing surface sets the size. Rule 2 (uppercase labels) is replaced by the CardHeader rule. Rule 11 said the saving is the third line of the narrow list card; it is the second. Removed names kept as examples now say they were removed.
- **styles/COMPONENT-STATUS.md**: the limits named five image sizes (there are four), a type scale and radius list that did not match tokens.css, and "the twenty controls in Input types 14d" (no such section); all corrected from tokens.css. The status table gains CardHeader, the path and spread cards, the row that opens, and the narrow fields. The log now says at its head that its entries name classes as they were on their date.
- **styles/RECOVERED-NOTES.md** is not shipped. It was working notes from removed sections, with literal colours and sizes from before the tokens.
- Every doc in the package names the rules file PROJECT-RULES.md, its name here. In the repo, update the root README's link to it.
- **check.js** now also asserts that the start page's ids match each page, that it names no missing file, and that PROJECT-RULES, CONVERSION-CHECKS and the React README name only classes and tokens that exist.

## About these files

Everything here is a design reference built in HTML: high-fidelity mockups with final colour, type, spacing and states. They are not production code to ship. Recreate them in the target codebase with its own framework and patterns. `styles/` and `react_handoff/` are written to be lifted closely, since the components are defined there once.

## What is here

    *.dc.html                    26 pages: the component library, every screen, three tools
    index.html                   where to start - the map of the pages
    checks.html                  the rendered checks, run in the browser
    PROJECT-RULES.md             the rules the design is held to (the project's CLAUDE.md)
    CLAUDE-CODE-PROMPT.md        the prompt for implementing this in the app
    github.md                    the source repo and which screens came from which files
    Behaviour gaps.md            behaviour the design has not settled yet
    styles/tokens.css            every value: colour, size, radius, spacing
    styles/components.css        every component rule
    styles/doc.css               the documentation chrome, not part of the product
    styles/pages/*.css           one file per page, for that page's layout only
    styles/check.js              the mechanical rules as assertions
    styles/COMPONENT-STATUS.md   what is settled, the limits, the change log (history)
    styles/CONVERSION-CHECKS.md  the checks to port into the app
    react_handoff/               the React components, see its README
    Playground.dc.html           drop components on a canvas and set their props
    playground-registry.js       what the playground knows about each component
    icons.js                     the icon register: Tabler outline, MIT
    components.js, support.js    the runtime the pages need to render

Open `index.html` first. Every page opens directly in a browser with no build. Every file a page loads is in this package.

## State of the checks

- `styles/check.js`: 0 findings across 26 pages.
- `checks.html`: clean, 23 rules over 26 pages.

Both are the baseline: any finding is a regression. Run `check.js` like this:

    const factory = eval(await readFile('styles/check.js'));
    const { report } = await (await factory)({ readFile, ls });

## Settled since the 3 October package

These supersede anything older that says otherwise.

**CardHeader** (Components c10, React `CardHeader` in `Card.jsx`). A card's name is always in one, and it is always `<div class="sp-card__head">` as the card's first child, with the name as its own first child. There is no other markup for a head; all 191 heads on every page use it. It is the list toolbar's box: `--card-header-h` (54px) including a transparent 1px bottom border, `--sp-12` between its parts, every part centred on the name's line, the card's top padding given up to it. One line at every width: the name never breaks, text beside it takes the cut, controls and buttons keep their width.
- Each view has one place: the name, then meta beside it; at the right end, in this order, an aside (meta, note or danger), one control, one status pill, at most two actions (always the small outline button), a dismiss.
- In React, `CardHeader` is only a child of `Card`. Card renders it first; anywhere else, including nested inside a card's content, it renders nothing and reports the call. It takes no children, `className` or `style`.

**A head button on touch** keeps its 34px box and takes the 48px tap area as an invisible area above and below, as the bookmark chip does.

**The Showing bar** (Statistics 4b, 4c; Mobile 7a; Components c8) is `sp-card--path`: a CardHeader with the drill path after it. In a card at least 640px wide the path stands on the head's line between the name and Reset / Open in orders, on one line, and the longest crumb takes the cut. In a narrower card it drops below the head and wraps. React: `Card variant="path"`.

**A crumb is text only.** No crumb carries a mark: a path mixes periods, statuses and ranges with vendors and categories, and only some of those have one. Every crumb's text is in `.sp-crumb__label`.

**A legend is always under its chart**, never between the head and the chart.

**A row that opens something** is `sp-row-opens` on an `<a>` or `<button>`: no underline, the card's ink, hover `--hover`, the focus ring, both at `--r-tile` and reaching 6 above and below and 8 at the sides so the content does not move; at least `--row-h-touch` on touch. Used on Statistics By status and Top vendors, Home Categories this month, Mobile Drafts and Recent orders.

**Variants that replaced page rules on parts:** `sp-card--spread` (the Home month panel), `sp-combobox--narrow` and `sp-segmented--narrow` at most `--field-w` (280, Settings 11a). Order create's 720 reading column is a page box around the parts, not a class on them.

## The rules the components follow

- Every variant is a named prop with a closed set of values. An unknown value is reported.
- Two axes, never one: structure rides in the class, colour rides in `data-color` (`primary` default, then `warning`, `danger`, `success`).
- No `className` or `style` reaches a control. A look the props cannot express is a gap in the system: add it to the library first.
- A variant name says what it is for, not how it is drawn.
- Anything derivable is derived: a vendor's initials and colour from its name, an icon button's label from its icon.
- `react_handoff/` emits class names only and sets no styles; `components.css` is the single source of appearance.

Design tokens are listed with their values in `styles/tokens.css` and explained in `styles/COMPONENT-STATUS.md` and `Typography.dc.html`. Do not add values outside those lists without changing the system on purpose.

## Known and open

- `react_handoff/` imports `./Icon.jsx` but does not ship it: the icon is the app's own. Supply an `Icon({ name, size })` that draws the Tabler outline icon by name from `icons.js`. The two harness pages stand one in.
- At the 280px card minimum three heads do not fit on one line: Showing (two buttons), Spend by month (the switch), Categories this month (meta and a button). At 400px and on a phone all fit. Not decided yet.
- Statistics shows its change as a percentage on Total spend and Average order (+18,4%, +3,6%), while a note on the same page says "Saved compares amounts, like the other three". Not decided yet.
- Several pages still put a page class straight on a part (Settings `st-w260`, `st-w560`, `st-w120`, `st-theme`; Order create `oc-amount-field`, `oc-col--narrow`; Statistics `os-col`), and two page stylesheets select parts (`.hm-split > *`, `.st-trio > .sp-well`). Unchanged until the app needs them.
- From the 3 October package and not re-audited since: four variant sets mix axes (`Combobox`, `Menu`, `ListItem`, `TextField`); `Mark` has three near-empty fills (`plain`, `none`, `empty`); unbuilt list behaviours (keyboard row navigation, selecting a whole filter, long-press on touch).

## Copy conventions

Plain hyphens only, no em or en dashes, straight quotes only, no decorative emoji. A saving is always an amount (`Saved 1.320,00 kr.`), green unless zero, never a percentage. Explanations of how the design works live in the notes beneath each mockup, never inside the layout.

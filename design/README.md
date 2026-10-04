# Spendly - design system handoff

## About these files

Everything here is a design reference built in HTML: high-fidelity mockups with final colour, type, spacing and states. They are not production code to ship. Recreate them in the target codebase with its own framework and patterns. `styles/` and `react_handoff/` are written to be lifted closely, since the components are defined there once.

## What is here

    *.dc.html               26 pages: the component library, every screen, three tools
    index.html              where to start - the map of the pages
    checks.html             the mechanical checks, run in the browser
    CLAUDE.md               the rules the design is held to
    styles/tokens.css       every value: colour, size, radius, spacing
    styles/components.css   every component rule
    styles/doc.css          the documentation chrome, not part of the product
    styles/pages/*.css      one file per page, for that page's layout only
    styles/check.js         the assertions - run these, do not eyeball
    styles/COMPONENT-STATUS.md  what is settled, the limits, the change log
    react_handoff/          the React components, 24 files, see its README
    Playground.dc.html      drop components on a canvas and set their props
    playground-registry.js  what the playground knows about each component
    icons.js                the icon register: Tabler outline, MIT
    support.js              the runtime the pages need to render

Open `index.html` first. Every page opens directly in a browser with no build.

## Areas of the design

**Budget** (`Budget.dc.html`, 21a-21h). A yearly budget of income and cost rows grouped under headings. Months view: the current month as a dark card with left over, income, costs and a gauge against the plan, then a twelve-month strip of wells. Whole year: an editable sheet, one row per budget line, Jan to Dec plus Year and Per month, with sticky row names and header. Edit a row in place; check a bank statement against the month. Group headings in the month wells are `sp-subtitle sp-strong sp-ink`: same size as before, bold and full ink so they separate from the rows.

**Bookmarks** (`Bookmarks.dc.html`, 22a-22d). Items the user is interested in, separate from orders and budget. In the product it is Bookmarks, route `/bookmarks`. A card grid (one column below 640px) with one picture, name, price without decimals, URL and categories. The picture strip opens the URL and the rest of the card opens the bookmark's edit page; edit, archive and unarchive are in the card menu. Clicking a category chip filters on it. Filters: category and Open / Archived. Bookmarks use the existing Categories, not a separate set; typing an unknown category name in the editor creates it with the default colour, the same way an unknown vendor is created on a new order. Deleting a category leaves a bookmark's other categories in place.

**Navigation.** The sidebar groups are Orders, Budget and Library (Vendors, Categories, Bookmarks), then Settings. Bank check left the sidebar; it is an action on the Budget page.

**Mobile** (`Mobile screens.dc.html`, 7a). Phone frames added for Budget months, Budget whole year and Bookmarks. Budget on a phone: year, Months / Whole year and a menu (Edit, Check a bank statement) share one bar; one month at a time with a stepper; the whole-year sheet scrolls sideways and opens on the current month. The More list now carries Budget and Bookmarks in sidebar order.

**React components and Playground.** `LineEditor` is now in both: r14 on the React components page with an existing row and a new one, and under Surfaces in the playground. The Go to menu matches the page's sections (r1-r15), and `check.js` fails when a Go to menu and its page disagree. The Touch section (r13) shows the save bar and the tab bar on separate screens: a record being edited takes the save bar in the tab bar's place. The phone body in both harness pages sits 12 from the screen edge and 12 under a bar, as on Mobile screens.

**Checks.** `checks.html` covers every page, and `styles/check.js` fails when a page is missing from its list. The overlap check compares two texts only when they sit on the same layer, so a menu drawn over a card is not reported.

## Before changing anything

Run `styles/check.js`:

    const factory = eval(await readFile('styles/check.js'));
    const { report } = await (await factory)({ readFile, ls });

It holds the system's rules as assertions: one colour vocabulary, a saving is always an amount, a well sits inside a surface, notes may not name a class that does not exist, every page is checked. Then open `checks.html` for the rules that need a rendered page (overlap, clipping, hit targets).

## The rules the components follow

- Every variant is a named prop with a closed set of values. An unknown value is reported.
- Two axes, never one: structure rides in the class, colour rides in `data-color` (`primary` default, then `warning`, `danger`, `success`).
- No `className` or `style` reaches a control. A look the props cannot express is a gap in the system: add it to the library first.
- A variant name says what it is for, not how it is drawn.
- Anything derivable is derived: a vendor's initials and colour from its name, an icon button's label from its icon.
- `react_handoff/` emits class names only and sets no styles; `components.css` is the single source of appearance.

Design tokens (colour, the spacing scale 6/8/10/12/14/16, radii 4/8/9/12/28/999, the type scale) are listed with their values in `styles/tokens.css` and explained in `styles/COMPONENT-STATUS.md` and `Typography.dc.html`. Do not add values outside those lists without changing the system on purpose.

## Known and open

- `react_handoff/` imports `./Icon.jsx` (ten files) but does not ship it: the icon is the app's own. Supply an `Icon({ name, size })` that draws the Tabler outline icon by name from `icons.js`. The two harness pages stand one in.

- `check.js` reports 0 findings.
- `checks.html`: Type specimen and Playground can exceed the 6 second load limit and then report as not loaded.
- Four variant sets still mix axes: `Combobox`, `Menu`, `ListItem`, `TextField`. `Mark` has three near-empty fills: `plain`, `none`, `empty`.
- Unbuilt list behaviours: keyboard row navigation, selecting a whole filter, long-press on touch.

## Copy conventions

Plain hyphens only, no em or en dashes, straight quotes only, no decorative emoji. A saving is always an amount (`Saved 1.320,00 kr.`), green unless zero, never a percentage. Explanations of how the design works live in the notes beneath each mockup, never inside the layout.

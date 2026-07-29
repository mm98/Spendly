# Spendly, in React

The prototype one directory up is a single HTML file with no build, no dependencies and no
network. This is the same product as a React application: every page, every control wired,
and a phantom API standing where a real backend goes.

**Nothing here is a picture of a control.** Every button, tab, switch, chip, combobox and
pager does what it says: creates, edits, deletes, filters, sorts, pages, saves. Where the
prototype draws something inert, this either does the thing or does not draw it.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/, openable from anywhere -- see "Hash routing" below
```

The point of the port is not that React draws these screens. It is that the prototype's
thirteen pages carry their figures in markup — 24.418,57 kr. is typed into the file eleven
times — and this one reads all of them from a single source. A total that changes changes
everywhere it is shown, which is the thing hand-written markup could not promise.

## What is here

```
src/
  api/          the phantom data source: seed.js, client.js, useApi.js, format.js
  components/   the design system as components -- one file per family
  pages/        ten page modules over fifteen routes
  styles/       spendly.css, the prototype's stylesheet, unmodified
  routes.jsx    the routes, and the four things the shell reads off each one
```

### The pages

| Route | What it is |
| --- | --- |
| `/` | Home: the month, the hero chart, and the cards the user chose |
| `/orders` | Orders overview: the month against the one before, latest orders, suggestions |
| `/orders/all` | All orders: search, filters, sort and a pager, all in the URL |
| `/orders/new`, `/orders/new/items` | New order, in two steps that share one draft |
| `/orders/:id` | One order: status, items, attachments, edit, delete |
| `/orders/:id/edit`, `/orders/:id/edit/items` | The same two-step form, with the order loaded into it |
| `/scan` | Scan: four ways in, each naming the document it hands the flow |
| `/scan/reading` | Reading the document that was chosen |
| `/scan/review` | The draft, editable line by line, saved as a real order |
| `/vendors` | Vendors: create, favourite, delete, search, sort |
| `/categories` | Categories, and a Manage tab that renames, budgets and deletes |
| `/stats` | Statistics, with a pager over three months |
| `/settings` | Order settings — what ORDER SETTINGS opens |

### The stylesheet is the prototype's, untouched

`src/styles/spendly.css` is lifted verbatim out of `spendly.html` — the same rules, the same
comments, the same three Poppins faces as woff2 data URIs. It is the design system the README
one directory up specifies, and this port had no business rewriting it. Nothing here adds a
rule, which is why the phone render of this app is pixel-identical to the prototype's
(0 differing pixels of 1,035,840 — see "What was measured").

It is a *copy*, though, and a copy is the near-miss the uniformity rule is about: the two
agree until the day one of them is fixed. So it is not maintained by hand.

```bash
npm run css:check    # fails if the two have drifted
npm run css:sync     # re-extracts it from the <style> block in ../spendly.html
```

A fix to the design system belongs in `spendly.html`, and `css:sync` brings it here.
`css:check` is what catches the reverse — an edit made here that the prototype never got.

Two consequences worth knowing:

- Rows and headers that navigate carry `data-go`, because `a[data-go] { color:inherit;
  text-decoration:none }` is what makes a link look like a row. The attribute says what it
  said in the prototype: where this element goes.
- A page's root is `<div class="page is-on">` even though only one page is ever mounted.
  `.page.is-on` is the grid that lays a page out, and Vendors and Categories switch what is
  on screen through `[data-view]` on that same element.

### The phantom API

`src/api/client.js` is the whole surface a real backend would have to implement. Every page
reads through it and none of them reach into `seed.js`.

- **Async, with latency.** Every endpoint takes 90–260ms. A component written against an
  instantly resolved promise is a component with no loading state, and the loading state is
  the half that breaks when the fetch is real.
- **Abortable.** Every endpoint takes an `AbortSignal`, and `useApi` passes one, so a slow
  answer cannot overwrite a fast one that arrived after it.
- **It writes.** Saving an order stores it and persists it; the dashboard's card order
  persists. Both go to `localStorage`, and storage being refused is not an error worth
  surfacing — the choice still holds for the session. Clearing storage returns the app to
  its shipped state.
- **It can fail.** `getOrder` on an id that is not there throws a 404, and the page says
  "Nothing here." rather than rendering an empty frame that looks like an answer.

Swapping in `fetch()` touches this one file.

**Everything writes through it.** `createOrder`, `updateOrder`, `deleteOrder`,
`addAttachment`, `removeAttachment`, `createVendor`, `updateVendor`, `deleteVendor`,
`createCategory`, `updateCategory`, `deleteCategory`, `saveSettings`, `saveDashboardCards`,
`resetStoredData` — 34 endpoints in all, and every one of them is called from a page. Deletes that would orphan a record are refused with
a reason: a vendor with orders on it and a category on an order both come back 409, and the
message names how many are in the way.

What gets stored is the *difference* from the seed — what this browser added, removed or
changed — rather than a copy of every record. A stored copy freezes the demo data at the
version it was first read at, and a fix to the seed would never reach anyone who had opened
the app once. That also fixed a real bug: storing only *added* orders meant an edit to a
seeded one was written, rendered, and gone on the next reload.

`useApi` is the only read path. It caches by endpoint and arguments, so walking back to a
page paints from what is known instead of flashing a skeleton at a value that has not
changed; it keeps the last good data across a refetch, so the layout does not collapse under
the user; and it reports the error rather than rendering nothing. `invalidate(endpoint)`
drops what a write has just made stale.

### What derives, and what does not

An order's subtotal is its lines added up, and its total is that plus shipping. What it saved
is the difference between the lines' retail and what was paid. None of the three is stored:
storing them beside the lines lets the two disagree, and both halves look right on their own.
That is not hypothetical — the first cut of `seed.js` stored 88 kr. saved on a Matas order
whose five lines add up to 102, and nothing rendered could have failed.

The exception is the three Bilka receipts, and they say why: a 23-line supermarket receipt
shows four of its lines here, so its total and its saving are the receipt's own and travel as
overrides. `itemCount` is what tells the reader that the list is partial.

The one place this port prints a different number from the prototype is Proshop's saving:
12,6% rather than 12,5%. 612 kr. off 4.249 kr. paid is 12,6% of retail, and the prototype's
12,5% does not follow from its own figures. Deriving it is what surfaced that.

The donut is the same story in pixels. The prototype's ring is a conic-gradient with the
shares baked into the stylesheet — 13%, 14%, 6%, 10%, 57% — beside a list that reads 38, 27,
13, 10, 12. Nothing rendered could fail, because a ring has no opinion about the list beside
it. Here the ring is built from the records the list is built from.

### Components

One file per family, coarse rather than granular: `Card`, `Rows`, `Form`, `Chart`, `Viz`,
`Chip`, `Button`, `Combobox`, `Icon`, `Shell`, `Stepper`, `AiCard`, `DashboardCards`, `Async`.

Two of them carry most of the argument:

**`Icon.jsx`** holds all 39 glyphs the app uses. The prototype repeats each path wherever it
appears — the chevron 30 times, the receipt 13 — which is the drift the uniformity rule is
about. Naming them makes the count a fact you can read off the object, and an unknown name
throws rather than drawing nothing.

**`Form.jsx`** owns what a rejection looks like: the message under its field, the red edge on
the shell, `aria-invalid` and `aria-describedby` on the control, and one sentence in the
form's own status line naming the fields. Two forms reject values; neither one draws a
rejection itself. A second copy of that marking is the near-miss the uniformity rule is
about — the two would agree until the day one of them was fixed.

`Chart.jsx` remaps the viewBox 1:1 onto the element's pixel box on every resize, so one user
unit is always one CSS pixel and stroke widths hold. In React that means the width is state
and the path data is computed during render, so a re-render never leaves a path drawn for a
width the element no longer has.

### The command palette

The top bar prints `CTRL K`, and a key cap is a promise. Ctrl+K (Cmd+K) opens the palette from
anywhere and puts the caret in it; Up and Down walk the results, Enter opens the highlighted
one, Escape closes it and hands focus back to whatever had it.

It searches orders, vendors, categories, item lines and notes, and it lists the commands the
app can run — so it reaches every page and every create flow from the keyboard. The results
come from the API on each keystroke, aborted when the next one lands.

The prototype ships four results for the word "bil" written into the markup, which is right
for that one word and wrong for every other. This is an index.

### Routing

Twelve routes under one shell. Each carries a `handle` naming four things: its title, which
rail item it belongs to, whether it has a back button and where that goes, and its sub-tabs.

The prototype keeps those four in four places, and the note in `../CLAUDE.md` about it is why
this file is shaped this way: a harness that only toggled the page class rendered eleven of
twelve pages carrying home's title and home's tabs, and nothing failed. Here a page cannot be
reachable and unnamed, because the router is what names it.

Back-button labels name the destination, not the origin: "Back to scan receipt" on the two
scan steps, "Back to orders" on an order.

**State the app can be linked to lives in the URL**, not in component state: which month
Statistics is showing, and every filter, sort and page on All orders. That is what makes a
link from the palette, a chart legend row, a category tile or a vendor card arrive already
filtered — and it caught a real defect. Reading the query string once with a `useState`
initialiser looked correct and was not: going from `/orders/all` to `/orders/all?vendor=bilka`
changes the URL without remounting the component, so the initialiser never runs again and the
filter silently does not apply.

**Hash routing**, for the reason the prototype is one file: a built copy has to open from
anywhere — a static host with no rewrite rule, a `file://` URL, a folder someone unzipped —
and a path router needs the server to send every URL to `index.html`. The prototype answered
`#detail`; this answers `#/orders/o-303`, which is the same promise with a real address
behind it.

### What the settings actually change

A settings page whose switches change nothing is the decorative-control rule with more surface
area, so each one is read somewhere and the page says where:

- **Default kind** and **default status** — what step 1 of New order opens with.
- **Rows per page** — how many orders All orders shows before the pager.
- **Sort orders by** — what All orders opens sorted by.
- **Show the scan card on Home** — the same switch LATER on the card itself writes, so
  dismissing it there and turning it back on here are one setting seen twice.
- **Ask before deleting an order** — whether the delete button on an order confirms first.
- **Clear stored data** — forgets everything this browser holds and puts the demo data back.

### The scan flow carries the document

The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
formats one by one. In the prototype all four once landed on a review screen reading
`kvittering-bilka.jpg`, 2,1 MB, drawn with a receipt glyph — nothing could catch it, because
one document was the only document. Here the entry names the document, the URL carries it
(`/scan/reading?doc=invoice`), and both steps after it render what was picked, including a
page count that belongs to the PDFs and to nothing else.

## What was measured

Chromium 141.0.7390.37 under Playwright 1.56.1, at 1440x900 and on an `iPhone 13` device
profile at `deviceScaleFactor: 2`. Gecko and WebKit are not installed here and were not
checked.

- **Every route renders, at both widths.** Correct page title, correct sub-tabs, correct rail
  highlight, no console errors, no page errors, no horizontal overflow, every chart measured
  non-zero.
- **No control is drawn without a handler or a destination.** A source sweep over every
  `<button>`, `Button`, `IconButton`, `ButtonLink`, `Segmented`, `Switch` and `Combobox` in
  `src/` returns zero that carry neither `onClick`, `onChange`, `onSelect`, `onRemove` nor
  `to`. Disabled ones are honest: PREVIOUS and NEXT at the ends of the pager, and the
  period arrows at the ends of the month list.
- **145 interaction assertions pass**, in two harnesses. The first (65) covers the ported
  behaviour: both forms' validation and focus, the totals, saving and reloading, the filter
  chips, the two controls driving one chart, the dashboard, the four scan entries, the
  sub-tabs, and a tap on a real coarse-pointer profile. The second (80) drives everything
  that used to be inert:

  - Ctrl+K opens the palette and focuses it; typing searches orders, vendors, item lines and
    commands; Up and Down move `aria-activedescendant`; Enter opens the highlighted result;
    Escape closes it.
  - A setting saved on `/settings` changes All orders — page size, sort — and the pager turns
    pages, disables itself at the ends, and states the range.
  - Sorting re-orders through the API and lands in the URL; a `?vendor=` link arrives filtered
    with the chip drawn and the rows really that vendor.
  - Vendors: create, star into favourites, unstar, delete — and a vendor with orders on it is
    refused with the reason.
  - Categories: create, rename, set a budget, delete — and a category on orders is refused
    with the count.
  - Statistics pages back through June and May, the figures move with it, the month is in the
    URL, and browser Back walks the pager.
  - An order's status writes through and survives a reload; ADD FILE attaches the file it was
    given and the header counts it; OPEN shows it, delete removes it; Edit loads the order
    into the form, a line edit replaces rather than appends, and the edit sticks; Delete asks
    first, CANCEL leaves it, DELETE removes it and the order is really gone.
  - The scan review corrects a line, recomputes its own verdict rather than asserting one, and
    saves a real order carrying the correction.
  - LATER on Home writes the same setting the Settings switch does, and it survives a reload.

- **axe, every rule enabled, 70 states.** 35 states at two widths, including the open palette
  with results, both rejected forms, the editing dashboard, the delete confirmation, the
  category editor, the open line editor and both alternate views. 0 violations of everything
  except `color-contrast-enhanced`. AA contrast is clean: **0 violations against 2,138 passing
  elements** across 32 states. The AAA findings are the prototype's palette, which
  `../README.md` documents as an AA-level system — `--green` is 2.93:1 on white by design.
- **Pixels.** This container reproduces all three committed shots in `../docs/` from the
  prototype at 0 differing pixels, so it is a valid baseline. Against it, this app's phone
  render is **0 of 1,035,840** — identical.

Six defects were found by these runs and fixed rather than reported:

1. `aria-describedby` pointing at a message element with no id.
2. A field re-checking against the value from before the keystroke, so a message cleared one
   character late.
3. `aria-expanded` on a `role="search"` input, where it is not an allowed attribute.
4. Escape not closing the command palette: it is `input[type=search]`, and Chromium's own
   Escape clears the field, which fires `change`, which reopened the panel a beat after the
   handler closed it. The handler read correctly throughout.
5. Filters read from the query string with a `useState` initialiser — correct on first load
   and silently dead for every in-app link, because changing the query string does not
   remount the component.
6. Edits to *seeded* orders never persisting, because only added orders were being stored.
   Marking an order delivered worked, rendered, and was gone on the next reload.

## What this port does not do

- No tests are committed. The harnesses above were written and run against this build; they
  live outside the repository.
- Gecko and WebKit were not checked. Anything touching a native form control is
  engine-shaped by default, and this app has date fields, search inputs and a file picker.
  Defect 4 above is exactly that shape, and Blink found it — the other two engines may hold
  another.
- Attachments keep a name, a size and a kind. The bytes are the one thing a phantom source
  has no business pretending to hold, so OPEN shows the document placeholder rather than a
  render of a file that does not exist.
- Item photos are the same: the field records the filename you chose and shows it on the item
  row. It does not display the image.
- Drag-to-reorder is not implemented; reordering is done with the arrow buttons on each row,
  which is the accessible half of it and the half a keyboard can reach. The copy says
  "use the arrows to reorder" rather than promising a drag that is not there.

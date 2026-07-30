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
  api/tabler/   the generated icon catalogue: names, and twelve shards of paths
  components/   the design system as components -- one file per family
  pages/        ten page modules over fifteen routes, each its own chunk
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
| `/vendors` | Vendors: favourite, search, sort |
| `/vendors/new`, `/vendors/:id/edit` | A vendor, on the same form page an order uses |
| `/categories` | Categories, and a Manage tab whose rows open the record |
| `/categories/new`, `/categories/:id/edit` | A category: name, budget, colour, glyph, delete |
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

**`FormPage.jsx`** owns the page every form is drawn on, and the one way a record is deleted.
Five screens create or edit something -- order details, order items, scan review, category,
vendor -- and they were five arrangements of the same parts, already drifting: two nested the
form in a bordered section inside a card body inside a card, which at 390px leaves the fields
about as wide as their own labels; one paired a 32px CANCEL with a 48px save; two invented
their own rail. Now each passes its fields in and gets the same card headline, lead sentence,
verdict line, summary rail and split footer. Measured: one `.card-body-page` per form, one
`.form`, one `.form-status`, a two-button footer at a matching 38px, on all seven routes.

Deleting is the same story one level down. An order asked before it deleted, a category and a
vendor went the moment the trash was clicked, and only the order read the setting that says
whether to ask -- a destructive action that asks on one screen and not another is not a
setting, it is a coin toss. `useDelete` is that question written once; it is a hook rather than
a component because the button and the note do not always sit together (on an order the trash
is up in the header band, per README: Order Detail). `useRowDelete` is the same question for a
row -- a line item on the order form, an attachment on the order page. Those two trashes acted
straight away while every record delete asked, which is the coin toss again one level down; one
hook call serves the whole list (hooks cannot sit in a loop), the state is which row is asking,
and each open note gets its own id so two lists on one page cannot cross their `aria-controls`.

**`Form.jsx`** owns what a rejection looks like: the message under its field, the red edge on
the shell, `aria-invalid` and `aria-describedby` on the control, and one sentence in the
form's own status line naming the fields. Five forms reject values; none of them draws a
rejection itself. A second copy of that marking is the near-miss the uniformity rule is
about — the two would agree until the day one of them was fixed.

The *rules* are shared too, in `api/rules.js`. Create and scan are two doors to one saved
order, so a value required at one door is required at the other and refused in the same words —
and they had already parted company: the scan review checked nothing at all, so a receipt whose
vendor line came back blank saved an order with no vendor on it, through a form whose twin says
*Who did you buy from?* about that field. The review now runs the same four rules step 1 runs,
and a corrected receipt line runs the item form's three.

`Chart.jsx` remaps the viewBox 1:1 onto the element's pixel box on every resize, so one user
unit is always one CSS pixel and stroke widths hold. In React that means the width is state
and the path data is computed during render, so a re-render never leaves a path drawn for a
width the element no longer has.

### Reordering

One control does it: the grip. It drags with a pointer — mouse and touch, through Pointer
Events rather than HTML5 drag-and-drop, because `dragstart` never fires from a finger — and it
moves with the arrow keys when focused, with Home and End for the ends. Every move is
announced through the page's own status line.

**A drag has to show what is moving and where it will land.** The first cut showed neither:
the row was dimmed to 55% and left in the list, so the thing under the finger was the faintest
thing on screen and its landing slot was indistinguishable from the rows shuffling around it.
Now the row lifts — out of the flow, following the pointer, on a card with a shadow under it,
pinned to the width *and height* it had, because a grid item that leaves its track collapses to
its content and would arrive smaller than the hole it came from. In the space it left, a dashed
green box opens at exactly that size and travels through the list as the pointer crosses each
row.

The moves and the release are heard on the window, not through `setPointerCapture`. Capture is
the tidier-looking answer and it does not survive this: lifting the row re-renders it and the
browser fires `lostpointercapture` immediately — measured, right after `pointerdown`, before a
single move — so the drag ended on a `pointerup` that never reached the handle and the row
stayed stuck to the cursor. The listeners are bound in the same tick as the press rather than
from an effect, so a move arriving in that tick is not missed.

The item list and the dashboard's cards use the same hook, and it measures which way the list
runs rather than being told: rows that overlap vertically are side by side, so the comparison
is on x; otherwise it is on y.

There are no move-earlier / move-later buttons anywhere. A pair of chevrons beside a grip is
three controls for one job, two of them pointing sideways in a list that runs down the page —
and the grip already carried `cursor:grab`, which is a promise the prototype did not keep.

### Toasts, and the one thing that is not a toast

Everything the app says back after an action — saved, added, removed, moved, refused — goes to
one layer, top right, under the top bar. Before that each page printed its result wherever
there happened to be room: a file removed from the attachments card was reported beside the
vendor name a column away, and a reordered line was announced at the top of a form nobody was
looking at. Feedback nobody sees is feedback that was not given.

The layer is a single `role="status"` region, polite so it waits for a pause; a toast clears
itself after five seconds, can be dismissed, stacks newest first and is capped at four. It is
offset below the top bar by measurement rather than by a guessed constant — pinned to the
viewport's top edge it covered the search field and *took its clicks*, since the toasts
themselves accept pointer events even though the layer does not.

A form's verdict on its own fields is not a toast. "Cannot continue — Vendor and Date need
fixing." has to stay on screen while the form is still wrong, it names the fields to go and
fix, and it belongs beside them. Those stay where they are. Adding a line is a toast; failing
to add one is not.

### Choosing how things look

A category's glyph and colour, and a vendor's colour, used to be assigned — next in the
palette, or a hash of the name — which is a value you can see, cannot explain and could not
change. Both are now picked, previewed at the size they are used at, and persisted.

The icon picker offers **the whole Tabler outline set — 5,129 icons**. `src/api/tabler/` is
generated from the `@tabler/icons` package by `npm run icons:sync`, the same way the stylesheet
is generated from the prototype, and `npm run icons:check` fails if it has drifted — including
if a shard it no longer writes is still sitting there. Every icon is flattened to one stroke
path; the transparent 24×24 bounds path every Tabler file opens with is dropped, and so are the
77 filled paths a handful of outline icons carry, since everything here draws with one stroke
and no fill.

Three things keep 5,129 icons affordable, and all three are measured:

- **The catalogue is loaded on demand.** `IconPicker` imports it inside an effect, so it is
  never in the chunk that paints the app.
- **Its names and its paths are separate downloads.** The names are what a search reads and it
  has to read all of them, so they come as one 68.59 kB chunk (19.25 kB gzipped) when a picker
  first opens. The paths are what a tile draws, and this grid never draws more than 240 tiles,
  so they are cut into twelve shards along the same sorted order — 45.23 to 81.14 kB each
  (11.13 to 26.06 kB gzipped) — and a shard is fetched only when something in it is about to
  be drawn. An icon's shard is its position in the name list divided by 440, so no index has
  to be shipped to find it. Measured: searching `carrot` draws 2 tiles and pulls **1 shard of
  12**; `brand-git` draws 4 and pulls 1 more.
- **A record stores the path, not just the name.** A category saved with `carrot` keeps the
  path string beside the name, so the rows, the rings and the donut draw it from the record —
  measured at **0 shards** fetched by the categories list, before and after a reload. The app's
  own 39 store no path at all; `Icon.jsx` knows those by name.

That last one had a hole in it, and the split is what found it. `createCategory` built its
record field by field and `iconPath` was not one of the fields, so a category *created* with a
Tabler glyph was stored under its name alone; editing one wrote the path, because
`updateCategory` assigns the whole patch. Nothing on screen could fail — the picker draws its
preview from the form, not from the record — and the list the record does reach is on a tab the
route walk never opened.

Unsearched, the grid shows those 39 — a scroller holding five thousand tiles is a wall, not a
choice — and the line under it says how many the search is matching out of how many there are.

Neither picker draws anything new: the swatches and the icon grid are `.icon-button`, and the
search is the same `.field-shell` as every other search in the app.

The Vendors page has one card now, in two sizes: the spotlight pair and the all-vendors strip
said the same things in two arrangements, one reaching the vendor's orders through a full-width
VIEW ORDERS at its foot and the other through its header band. The header is the way in on both,
and the star and the pencil sit at the foot of both — a linked header may not hold a button,
since an action inside a link is two things to activate in one box.

Both pickers live on the record's own page, because there is one way to write a record here.
They were inline editors on the list pages first — a bordered section opening inside a card
body inside a card, and on Vendors inside a horizontal scroller as well. That is a second way
to do a job the app already had a way to do, and on a phone it is a form about as wide as its
own labels. ADD now opens `/<records>/new`, a row or a pencil opens `/<records>/:id/edit`, and
DELETE sits on that page. The command palette offers all three creates on the one route shape.

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
The page behind it is `lazy`, the `handle` is not — see "What the build ships".

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
- **Ask before deleting anything** — whether a delete confirms first, on a record or a row:
  order, category, vendor, line item, attachment.
- **Clear stored data** — forgets everything this browser holds and puts the demo data back.

### The scan flow carries the document

The hero says the app takes "a PDF, photo or screenshot" and four entry buttons name the
formats one by one. In the prototype all four once landed on a review screen reading
`kvittering-bilka.jpg`, 2,1 MB, drawn with a receipt glyph — nothing could catch it, because
one document was the only document. Here the entry names the document, the URL carries it
(`/scan/reading?doc=invoice`), and both steps after it render what was picked, including a
page count that belongs to the PDFs and to nothing else.

## What the build ships

Vite 8.1.5 (Rolldown), `@vitejs/plugin-react` 6.0.4, React 19.2.8, `react-router-dom` 7.18.2.
The build used to end on Rolldown's own warning — *some chunks are larger than 500 kB after
minification* — and it was right twice over: the icon catalogue was one 919.61 kB chunk, and
the app was one 455.89 kB chunk that held every page whether or not you opened it.

Nothing here raises `chunkSizeWarningLimit`. Three changes moved the bytes instead, and the
first paint is what they are judged on:

| | before | after |
| --- | --- | --- |
| first paint | 3 files, 528.67 kB (170.67 kB gzipped) | **13 files, 434.67 kB (149.02 kB gzipped)** |
| first picker open | 919.61 kB (217.99 kB gzipped) | **68.59 kB (19.25 kB gzipped)**, plus a shard per search |
| largest chunk | 919.61 kB | **278.23 kB** |

- **Every page is its own chunk.** They were `import`ed at the top of `routes.jsx`, so opening
  Home downloaded the scan flow, both forms, the statistics pager and every page's charts.
  They are `lazy` now, behind one Suspense boundary in the shell. The `handle` stays static in
  `routes.jsx`, which is the point rather than an oversight: the title, the rail item, the back
  button and the sub-tabs are known before a page's chunk is requested, so the shell is never
  drawn nameless while one is in flight.
- **React, the DOM renderer and the router are a `vendor` group.** They are the half of the
  entry chunk this repository never edits; split out, an edit to a page leaves them cached.
- **The catalogue is names plus twelve shards of paths**, above — and its path data is written
  the way an SVG parser reads it. A minus sign is its own separator, so `2 -2` and `2-2` are
  the same two numbers, and dropping that space took 32,874 bytes out of the set. That it takes
  nothing else out is checked rather than argued: both forms of all 5,129 icons stroked into a
  canvas at 4× and compared, **0 icons differing across 189,075,456 channel values**, with 0 of
  them drawing nothing (which would have made the comparison vacuous).

### Minified, then actually compressed

Vite strips the comments and collapses the whitespace: **0 `/*` left in any JS chunk and 0 in the
stylesheet**, which goes out as one 71,911-byte line from 114,109 bytes of source. It does not touch
the HTML, so the entry document shipped its two source tripwires — the doctype and charset notes,
519 of its 1,060 bytes — to every visitor. A `transformIndexHtml` in `vite.config.js` removes them
from the built copy only, leaving `<!--[if` alone so nothing eats a conditional comment: **1,060
bytes to 522**.

Minifying is not compressing, and the `gzip: 32.39 kB` in the build log is a number Vite computes
and discards — nothing in `dist/` was compressed. `scripts/precompress.mjs` runs as `postbuild` and
writes `.gz` and `.br` beside every text asset, skipping any file that does not shrink, since a
variant larger than the original is one a server will still prefer. Brotli at quality 11 is far too
slow to run per request, which is the whole reason to run it once at build:

| | identity | gzip | brotli |
| --- | --- | --- | --- |
| whole `dist/`, 43 files | 1,377.82 kB | 387.76 kB (71.9% off) | **341.03 kB (75.2% off)** |
| first paint, 5 files | 403.3 kB | — | **121.5 kB** |

Serving them is the host's half: nginx wants `gzip_static`/`brotli_static`, Caddy `precompressed
br gzip`. A host that compresses on the fly ignores the variants and loses nothing, which is why
they are written unconditionally. The originals stay — content negotiation needs the identity
encoding to exist.

Loading is already asynchronous where it can be. The entry is `<script type="module">`, which
defers by definition; the runtime and `vendor` chunks are `modulepreload`ed so they are in flight
during parse rather than discovered after it; every page and every icon shard is fetched on demand.
The stylesheet is the one blocking request in the document and stays blocking on purpose — it
carries the three Poppins faces as data URIs, **31,493 of its 71,911 bytes, 43.8%**, so making it
async would trade a flash of unstyled text for bytes that are needed before the first paint anyway.
Moving those faces to files would drop the base64 third and let them load in parallel; it would also
mean the stylesheet here is no longer the prototype's `<style>` block byte for byte, which is what
`npm run css:check` exists to guarantee. Not a build setting — a decision about the constraint, and
it has not been taken.

## What was measured

Chromium 141.0.7390.37 under Playwright 1.56.1, at 1440x900 and on an `iPhone 13` device
profile at `deviceScaleFactor: 2`. Gecko and WebKit are not installed here and were not
checked.

- **Every route renders, at both widths.** Correct page title, correct sub-tabs, correct rail
  highlight, no console errors, no page errors, no horizontal overflow, every chart measured
  non-zero. Re-run against the split build: **18 routes at 1440 and on an iPhone 13 profile, 0
  console or page errors**, no page rendering empty, and the title and sub-tabs already right
  on arrival rather than after the page's chunk landed.
- **The filter panel arrives collapsed, and opens showing what the link set.** At
  `#/orders/all?category=groceries&vendor=bilka`, FILTERS reads `aria-expanded="false"`, the panel
  is `hidden` and computes `display: none`, and the chip row still states both filters — *Vendor:
  Bilka*, *Category: Groceries* — over `Orders · 4 match`. One click and the panel is `display:
  grid` with **Vendor `Bilka` and Category `Groceries` in the fields**, which read empty before,
  while Kind, From, To and Status show the nothing the URL actually holds. No console or page
  errors on either state.
- **The question card's answered pair is 12px apart, both ways round.** `.card-question` measures
  9.3 / 12 / 12 between its four children — the ghost button's `margin-top` computes to 12px where
  it was **0** — and the same note-plus-button pair on Orders, where the button is the block
  variant with a 12px margin of its own, still measures 12 rather than 24.
- **The three committed screenshots still hold: 0 differing pixels of 11,403,840.** `home.png` and
  `phone.png` are untouched by either change, and `all-orders.png` is the state the page now
  reaches by clicking FILTERS, at **0 of 5,184,000** — so the shot documents the panel opened
  rather than a default that no longer exists, and no image needed regenerating.
- **Nothing embedded is dead weight.** `[...document.fonts]` reports all three Poppins faces
  `loaded` — 500, 600 and 700 — so the 43.8% of the stylesheet that is base64 is font the app
  really draws with. A pass over the 252 class selectors in the stylesheet finds **14 that appear
  in no source file, and all 14 are composed at runtime** (`'button-' + variant`,
  `'note-' + tone`, `'icon-button-' + variant`, the `document-preview-*` kinds, `delta-*`,
  `chip-status-warning`) — there is no unused-CSS tail to strip from `dist/`.
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

- **24 toast assertions**: position in the upper right and clear of the top bar, fixed and
  above the page, one region for the whole app, polite, the layer never swallowing a click,
  dismissable, self-clearing after five seconds, stacking newest first and capped — plus the
  line it does not cross, with a form verdict staying on the form and its own field message
  intact, and the phone case where it must fit inside the gutter without pushing the page
  sideways.
- **18 picker assertions**: no invented bars under the rows, every glyph offered and the search
  narrowing them, the choice marked, previewed, saved, reflected in the list and surviving a
  reload, for a new category and a new vendor as well as an edited one.

- **21 file and reorder assertions pass** in two more harnesses. No native file control is
  visible on any page that has one; three files attach in a single go, each keeping its own
  name, size and format glyph; a duplicate is refused by name; a real `drop` on the card
  attaches; the scan page starts from a dropped or chosen file and both steps after it name
  that file with its real size. Reordering: dragging the grip moves a row and nothing is lost
  or duplicated, a touch drag does the same, the arrow keys move it, Home and End take it to
  the ends, focus stays on the grip, the move is announced once, the order survives the save,
  and the dashboard's cards drag on the horizontal axis.

- **axe, every rule enabled, 70 states.** 35 states at two widths, including the open palette
  with results, both rejected forms, the editing dashboard, the delete confirmation, the
  category editor, the open line editor and both alternate views. 0 violations of everything
  except `color-contrast-enhanced`. AA contrast is clean: **0 violations against 2,138 passing
  elements** across 32 states. The AAA findings are the prototype's palette, which
  `../README.md` documents as an AA-level system — `--green` is 2.93:1 on white by design.
- **Pixels.** This container reproduces all three committed shots in `../docs/` from the
  prototype at 0 differing pixels, so it is a valid baseline. Against it, this app's phone
  render is **0 of 1,035,840** — identical.

Sixteen defects were found by these runs and fixed rather than reported:

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
7. The reorder list's ref spread onto a plain function component, where React takes `ref` out
   of the props before the component ever sees it. Nothing rendered wrongly; the drag measured
   an empty list, found one row and moved nothing.
8. `.field-shell > .field-file-input` is a *child* combinator, and it is the rule that hides a
   file input. Two file inputs sat one level deeper than that, so the browser drew
   "Browse… No file selected" in the middle of the page. The hiding is carried by the element
   itself now.
9. `.two-column` is a grid, so hiding the rail on the Categories Manage tab left the track it
   sat in and the list stayed at half width. A column that is not there is not rendered.
10. Two live regions on the dashboard, announcing over each other. The reorder hook now hands
    its message to whatever status line the host already has.
11. `setPointerCapture` dropped on the first re-render of the row it was set on, so a drag
    could be started and moved but never finished — the row stuck to the cursor. Window
    listeners, bound at `pointerdown`.
12. The lifted card measuring 335px in the air against the 439px hole it came out of, because
    leaving a grid track stops a card being stretched by it.
13. The toast layer pinned to the viewport's top edge, covering the search field and the two
    top-bar buttons — and taking their clicks, not merely sitting on them.
14. A stale `{message}` left behind when the dashboard's own live region became a toast. It
    built cleanly and threw on render; the route walk is what caught it, because it watches
    for page errors rather than only for missing elements.
15. `createCategory` dropping `iconPath`, so a category *created* with any of the 5,129 was
    stored under its name alone — while editing one kept the path, because `updateCategory`
    assigns the whole patch. It surfaced only once the catalogue was sharded and the check
    stopped being "does a glyph appear" and became "does the list draw the chosen path without
    fetching a shard", which is a question the record has to answer on its own.
16. The Categories field deleting a category when you went back for another one. `Field`
    renders as `<label>`, and a `<label>` with no `for` labels its *first labelable
    descendant* — which, the moment the field holds a chip, is that chip's remove button and
    not the combobox. Every tap inside the field that was not itself a control fired it: the
    chevron did not open the list, it deleted a category. Reported from a phone, reproduced on
    an `iPhone 13` profile, fixed with an explicit `htmlFor`. All 35 `label.field` elements
    across eight form routes now point at their own input, select or textarea.

## What this port does not do

- No tests are committed. The harnesses above were written and run against this build; they
  live outside the repository.
- Gecko and WebKit were not checked. Anything touching a native form control is
  engine-shaped by default, and this app has date fields, search inputs and a file picker.
  Defect 4 above is exactly that shape, and Blink found it — the other two engines may hold
  another.
- Attachments and item photos keep a name, a size and a kind. The bytes are the one thing a
  phantom source has no business pretending to hold, so OPEN shows the document placeholder
  rather than a render of a file that does not exist. Everything else about the file is real:
  its own name, its own size, and the glyph for its own format.
- A receipt dropped on the scan page is the document the two steps after it name, with its
  real size and format. What the reader finds *inside* it is still the one Bilka purchase --
  that part is demo data and the page says so.

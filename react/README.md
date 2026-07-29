# Spendly, in React

The prototype one directory up is a single HTML file with no build, no dependencies and no
network. This is the same product as a React application: every page, every control, and a
phantom API standing where a real backend goes.

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
  pages/        twelve pages, one per route
  styles/       spendly.css, the prototype's stylesheet, unmodified
  routes.jsx    the routes, and the four things the shell reads off each one
```

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

### Routing

Twelve routes under one shell. Each carries a `handle` naming four things: its title, which
rail item it belongs to, whether it has a back button and where that goes, and its sub-tabs.

The prototype keeps those four in four places, and the note in `../CLAUDE.md` about it is why
this file is shaped this way: a harness that only toggled the page class rendered eleven of
twelve pages carrying home's title and home's tabs, and nothing failed. Here a page cannot be
reachable and unnamed, because the router is what names it.

Back-button labels name the destination, not the origin: "Back to scan receipt" on the two
scan steps, "Back to orders" on an order.

**Hash routing**, for the reason the prototype is one file: a built copy has to open from
anywhere — a static host with no rewrite rule, a `file://` URL, a folder someone unzipped —
and a path router needs the server to send every URL to `index.html`. The prototype answered
`#detail`; this answers `#/orders/o-303`, which is the same promise with a real address
behind it.

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

- **Every route renders, at both widths.** 12 routes x 2 widths: correct page title, correct
  sub-tabs, correct rail highlight, no console errors, no page errors, no horizontal
  overflow, and every chart measured non-zero.
- **65 interaction assertions pass.** Both forms' validation, including the messages, the
  focus, the status line and the panel a hidden rejection lives behind; ADD ITEM and the
  totals it moves; Enter adds and Escape clears; saving through the API and surviving a
  reload; the filter chips against the count above the list; the range chips and the series
  tabs both driving one chart; the dashboard's reorder, remove, cancel and persistence; all
  four scan entries against the file each one names; the sub-tabs, one navigating and one
  switching in place; and a tap on a real coarse-pointer profile, where the
  `@media (pointer: coarse)` block is live and a narrow window would not have matched it.
- **axe, every rule enabled, 41 states.** 21 states at two widths, including the open
  combobox, both rejected forms, the editing dashboard and both alternate views.
  0 violations of everything except `color-contrast-enhanced`. AA contrast is clean:
  0 violations against 1,595 passing elements across 22 states. The 867 AAA findings are the
  prototype's palette, which `../README.md` documents as an AA-level system — `--green` is
  2.93:1 on white by design.
- **Pixels.** This container reproduces all three committed shots in `../docs/` from the
  prototype at 0 differing pixels, so it is a valid baseline. Against it, this app's phone
  render is **0 of 1,035,840** — identical. Home differs by 32,769 of 5,184,000 (0.6%),
  which is the donut drawn from the data. All orders differs by 593,685 (11.4%), which is
  the filters being real: the prototype's shot has three chips and three rows because they
  are typed into the markup, and this page opens unfiltered with everything that matches.

Three defects were found by these runs and fixed rather than reported: `aria-describedby`
pointing at a message element with no id, a field re-checking against the value from before
the keystroke (so a message cleared one character late), and `aria-expanded` on a
`role="search"` input, which is not an allowed attribute there and is simply ignored.

## What this port does not do

- No tests are committed. The harnesses above were written and run against this build; they
  live outside the repository.
- Gecko and WebKit were not checked. Anything touching a native form control is
  engine-shaped by default, and this app has four date fields and four search inputs.
- **Some controls are still drawn and inert**, and they are in tension with `../README.md`
  §13, "No decorative controls at all". ADD VENDOR, ADD (category), ADD FILE, OPEN,
  HOW IT WORKS, ASK SPENDLY, SEE THE ANSWER, ORDER SETTINGS, the SEE ALL pill on Vendors,
  and the edit and delete buttons on an order all carry a handler-free click. Every one of
  them is the prototype's, carried across unchanged: each would need either a screen this
  app does not have, or a removal, and both are product decisions rather than porting ones.
  Naming them here is the alternative to quietly inventing behaviour for them. The controls
  that *do* act — every form, filter, tab, switch, chip and card control listed under "What
  was measured" — were wired and asserted rather than assumed.
  The disabled ones are honest: PREVIOUS and NEXT under a single page of results, and the
  next-period arrow on Statistics, say so in `disabled` because there is nowhere to go.

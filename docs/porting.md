# Porting Spendly

The design system ([`README.md`](../README.md)) says what the UI must do and names no framework on
purpose: which one renders it is a decision downstream of the system, and it changes. This file is
where those decisions live — what a port has to build, and the traps that are about the target
rather than about the design.

## What a port has to build

The prototype draws thirteen pages; a port makes them real. The parts that are not visible in any
screenshot are the parts a port has to get right:

- **One data source.** The prototype types its figures into the markup — the same total appears
  eleven times as text. A port reads every figure from one source, so a total that changes changes
  everywhere it is shown. Derived values (a subtotal, a saving) are computed, not stored: stored
  beside the lines, the two halves can disagree and both look right alone.
- **State the app can be linked to lives in the URL.** Every filter, sort and page on the orders
  list; the month on statistics; the document in the scan flow. That is what makes a chart legend
  row, a category tile or a shared link arrive already filtered.
- **Async is real.** A data layer that resolves instantly produces components with no loading
  state, and the loading state is the half that breaks when the fetch is real. Reads are abortable,
  so a slow answer cannot overwrite a fast one that arrived after it.
- **Writes go through one door.** Creating, editing and deleting each happen one way, on one form,
  with one confirmation policy — a destructive action that asks on one screen and not another is
  not a setting, it is a coin toss.
- **The stylesheet is the system's, not the port's.** A port that rewrites the CSS forks the design
  system. Generate or copy it from wherever the system is currently built, and check the two have
  not drifted rather than promising they have not.

## Names at the component boundary

The class names in the stylesheet are the system's public vocabulary — `button button-primary`,
`card-body`, `field-shell`, `is-on`, `data-go`. A port's components map onto that vocabulary rather
than inventing a parallel one, so a reader can follow one name from the spec through the stylesheet
into the implementation. The attribute contracts travel too: `data-go` on anything that navigates,
`aria-expanded` on every disclosure, `aria-invalid` plus `aria-describedby` on every rejected field.

## Where the system is built

`react/` is not a test port any more — it is the application, and the design system is built there.
[`react/README.md`](../react/README.md) documents its framework, build, chunking and measurements;
nothing in it is a rule about the product. `spendly.html` is the prototype the system was drawn in
and now follows it: its `<style>` block is written from `react/src/styles/spendly.css` by
`npm run css:sync`, and `npm run css:check` fails when the two have drifted.

That inverts one thing above and nothing else. The stylesheet still travels rather than being
rewritten, and it still travels in one direction — from where the system is built to every copy of
it. What changed is which file that is.

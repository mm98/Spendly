# Porting Spendly

The design system ([`README.md`](../README.md)) says what the UI must do and names no framework on
purpose: which one renders it is a decision downstream of the system, and it changes. This file is
where those decisions live — what a port has to build, and the traps that are about the target
rather than about the design.

## What a port has to build

The design system draws every page; a port makes them real. The parts that are not visible in any
screenshot are the parts a port has to get right:

- **One data source.** A drawing types its figures into the markup, so the same total can appear
  as text in many places. A port reads every figure from one source, so a total that changes changes
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
  system. Copy `design/styles/` byte for byte, and check the copy has not drifted rather than promising
  it has not.

## Names at the component boundary

The class names in the stylesheet are the system's public vocabulary — `sp-btn`,
`sp-card`, `sp-field`. A port's components map onto that vocabulary rather
than inventing a parallel one, so a reader can follow one name from the spec through the stylesheet
into the implementation. The attribute contracts travel too:
`aria-expanded` on every disclosure, `aria-invalid` plus `aria-describedby` on every rejected field.

## Where the system is built

`react/` is the application, and the design system is built there.
[`react/README.md`](../react/README.md) documents its framework, build, chunking and measurements;
nothing in it is a rule about the product. `react/` is the one place the system is built and the one
file a reader checks.

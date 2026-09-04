---
category: Feedback
---
The plain waiting card: one centred line of quiet text saying what is loading. It is what
`Async` falls back to when no skeleton is given, and what a page shows while its own code is
still arriving.

Use it where there is nothing worth approximating — a small fixed-size card, a page boundary, a
one-off screen. Where the region that is coming is tall, build a skeleton instead (`SkeletonCard`
and friends), so the reader's page does not jump when the data lands.

```jsx
<Waiting label="Loading the document" />
```

## What it draws

A `Card` marked busy, holding a centred body with one line of help-sized text: the label with
`...` after it. The same `label` is the card's accessible name, so it is read out as well as
printed.

## Writing the label

Name the thing being waited for, not the act of waiting. "Loading the document", "Loading this
page", "Loading Spendly" — the reader already knows something is loading; the label says what.
Leave it out and the card says `Loading...`, which is worth avoiding wherever you can name
something.

## Props

- `label` — the sentence in the card and its accessible name. Defaults to `"Loading"`

There is no `className`, no variant and no size. The card takes the full width of the column it
is dropped into.

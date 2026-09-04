---
category: Rows
---
The line row: an item on an order, a line read off a receipt, or an attached file. A small
leading tile or thumbnail, a title with a quiet second line, a figure, and whatever actions
the row owns.

## The two containers

- **A tight card body** — `CardBody variant="card-body-tight"`, for the Items card on an
  order and its attachments.
- **An `InsetPanel`** — the recessed list a form edits in, and the scan step's list of read
  lines.

Both are real; pick by whether the list is being read or being edited.

```jsx
<CardBody variant="card-body-tight">
	<ItemRow className="item-row-group" icon="cube" title="Kaffe, 500 g"
		meta="2 × 64,95 kr. • retail 74,95 kr." amount="129,90 kr." />
	<ItemRow icon="dots" iconTone={{ background: 'var(--bg-tile)', color: 'var(--text-muted)' }}
		title="12 more lines" meta="On the receipt, and in the total below." />
</CardBody>
```

## The leading slot

Exactly one of these:

- `icon` — an Icon name on the tinted tile. `cube` for an item, `check` for a line read
  cleanly, `alert` for one to check, `dots` for a folded remainder.
- `iconTone` — a style object recolouring that tile where the line is a warning rather than
  a value: `{ background: 'var(--bg-warn)', color: 'var(--text-warn)' }`.
- `thumb` — an Icon name for a file's kind, `photo` or `document`, drawn in the thumbnail
  box. `thumbSrc` supplies a real preview for it to fall back from.
- `handle` — a drag grip, passed in by whatever can actually reorder the list. The row never
  draws one on its own: a grip that moves nothing is a promise the screen cannot keep.

## Where the thumbnail goes

A thumbnail can carry its own destination, separate from the row's:

- `thumbHref` makes it a link to the file, opened in a new tab — use this when the file
  lives at a URL, so middle-click and "open in new tab" work.
- `onThumbClick` makes it a button that opens the picture in place.

Give it `thumbLabel` either way. Do not make the whole row the way to a photo: the row's
title and amount are not "open this photo".

## Actions

`children` sits after the amount. The pair the app uses is an edit and a delete
`IconButton`, wrapped in `<span className="row-inline row-actions">`.

## Props

- `icon`, `iconTone` — the tinted leading tile and its colours
- `thumb`, `thumbSrc`, `thumbHref`, `onThumbClick`, `thumbLabel` — the file thumbnail
- `handle` — a drag grip, supplied by the reordering code
- `title`, `meta` — the two lines
- `amount` — the figure, formatted
- `to` — an in-app route; makes the whole row a link and draws the chevron
- `children` — the row's own actions

A remainder is a `dots` row saying how many lines are not listed, never a row pretending to
be one of them.

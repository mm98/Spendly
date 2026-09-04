---
category: Cards
---
The tinted callout that gives a verdict on something the reader is about to save: green when
it checks out, amber when it does not. Used inside a `CardBody`, above the action it leads to.

`tone` takes **`positive` or `warning`** — these are Note's own words. `KpiCard`'s
`good | bad | neutral` belong to a different component and render an unstyled box here.

## How it reads

`title` is the verdict, set bold in the tone's colour, and `children` continues the same
sentence after it. So write the title as a short complete statement ending in a full stop, and
the body as what follows from it.

```jsx
<Note tone="warning" title="Total no longer matches.">
	The lines now total 1.310 kr., against the document total of 1.284 kr.
	Saving keeps what is on screen.
</Note>
```

## Props

- `tone` — `positive` | `warning`. Defaults to `positive`.
- `title` — the verdict
- `children` — the sentence after it
- `className` — `note-lead` when the note opens a card, `note-above-row` when it sits directly
  over the row it is about
- anything else is spread onto the `<div>`

A `Button` placed straight after a Note gets its gap from the stylesheet, so do not add a
margin of your own.

---
category: Feedback
---
The formatted JSON behind a "details" button: a modal that shows a reader the whole record a
screen was built from, in the same coloured shape `JsonBlock` uses everywhere else. Reach for
it when the honest answer is the record itself, not another screen of labelled fields standing
in for it.

A native `<dialog>` opened with `showModal()` — focus trapped, Escape wired, a click on the
backdrop closes it. It is rendered only while open and removed by unmounting.

## How the caller drives it

```jsx
<button type="button" className="button button-pill"
	aria-haspopup="dialog" onClick={() => setJsonOpen(true)}>DETAILS</button>
// ...
{jsonOpen ? (
	<JsonDialog value={answer} title="What Spendly read from the file"
		onClose={() => setJsonOpen(false)} />
) : null}
```

The trigger carries `aria-haspopup="dialog"`. `onClose` is the caller's job and fires from all
three exits: the close button, Escape, and a click outside the card.

## What it decides for you

- The card is 640px wide at most, and never taller than the window. The header — the title and
  a close button — stays put while the JSON body scrolls under it.
- The colouring is `JsonBlock`'s, so a reader who has seen the import reference recognises it.
- Focus goes back to whatever opened it when the dialog unmounts.

## Props

- `value` — the record, whole. Passing a trimmed copy defeats the point: the reader opened this
  to see everything.
- `title` — the heading in the dialog's band, and its accessible name. Write it as what the
  reader is looking at: `"What Spendly read from the file"`.
- `onClose`.

---
category: Feedback
---
The banner across the top of a screen that builds one record in several steps: a row of named
steps, each with an icon, a bar and a label, saying where you are and what is already behind you.
Two screens use it — Scan (three steps) and New order (two).

It is a card, so it sits above the form card rather than inside it. `FormPage` draws it for you
when you pass `steps`; drawing it yourself is for a screen that is not a `FormPage`.

```jsx
const SCAN_STEPS = at => [
	{ label: 'Upload',  icon: 'upload',   done: at > 0, on: at === 0 },
	{ label: 'Reading', icon: 'scan',     done: at > 1, on: at === 1 },
	{ label: 'Review',  icon: 'document', on: at === 2 }
]

<Stepper steps={SCAN_STEPS(1)} />
```

## The step shape

Each entry is `{ label, icon, done, on }`:

- **`label`** — the step's name, in the reader's words. Two or three words at most; the columns
  are equal and narrow.
- **`icon`** — an `Icon` name, drawn in the tile above the bar. Only shown while the step is
  ahead of you or the one you are on.
- **`done`** — the step is behind you. The tile turns green and draws a **check instead of
  `icon`**, and the bar turns green. So the row states what happened as well as where you are.
- **`on`** — the step being worked on now. Its bar turns green and its label is inked full
  strength; every step that is neither `done` nor `on` has a grey bar and a muted label.

Write the list as a function of where you are, the way both call sites do, so `done` and `on` can
never disagree with each other.

## The column count is the step count

The grid gets one column per entry, whatever the number. Do not try to fit three steps into a
two-column layout: the third would drop to a second row and read as a fourth step that is
missing.

## Props

- `steps` — the array above. Required; there is no default.

The card takes the full width of its column, and it is spaced to sit tight against the form card
under it.

---
category: Feedback
---
The app's one hover label. Give it the rectangle of the thing being pointed at and the words to
say; it finds a side of that rectangle with room for them.

It draws into `document.body` and places itself against the viewport, because the controls worth
labelling sit inside scrolling boxes and rounded cards that would cut it off. It tries north,
south, east and west in that order and takes the first side that fits, then slides along the
free axis so it never hangs off an edge.

It is a convenience for a pointer, never the only way to know something: whatever it says, the
thing it points at already says through its own `aria-label`. It takes no pointer events and it
holds no controls.

## Props

- `anchor` — a `DOMRect` for what is being pointed at, usually from
  `element.getBoundingClientRect()`. Pass nothing and it draws nothing, which is how it is
  hidden.
- `title` — an optional heading line above the body, in the muted caption size.
- `children` — the body. Plain text reads as normal weight.

## Building the content

A tooltip is not only a one-word label. The content parts are shared with the chart hovers, so
a composed one is built from the same four classes rather than a second set:

- `tooltip-title` — the heading line (also what the `title` prop renders).
- `tooltip-row` — one line of the body, laid out swatch, name, figure.
- `tooltip-swatch` — an 8px colour chip; give it a `background`.
- `tooltip-name` / `tooltip-value` — the label and its figure; the figure is the bold half
  and sits hard right.

## Example

One pair of handlers on the container rather than a pair per control, since pointer and focus
both bubble:

```jsx
const [at, setAt] = useState(null)
const point = e => {
	const tile = e.target.closest('.icon-picker-tile')
	setAt(tile ? { rect: tile.getBoundingClientRect(), name: tile.getAttribute('aria-label') } : null)
}

<div onPointerOver={point} onPointerLeave={() => setAt(null)}
	onFocus={point} onBlur={() => setAt(null)}>
	{/* ...controls... */}
</div>
<Tooltip anchor={at?.rect}>{at?.name}</Tooltip>
```

The surface is shared: the chart hovers, the sidebar's build-quality callout and this all wear
the `tooltip` class, so there is one white card to change rather than five.

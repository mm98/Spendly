---
category: Charts
---
A 6px track with a green fill, in two modes. Indeterminate is the default and it is the default
on purpose: a step that cannot say how far through it is should not claim a percentage.

## Choosing the mode

- **Indeterminate** (`<ProgressBar label="Reading progress" />`) — a short segment slides across
  the track for as long as the step runs. Use it while nothing measurable is known: reading a
  scanned document, or an upload before the byte count arrives.
- **Determinate** (`indeterminate={false} value={64}`) — the fill is `value` percent of the
  track. Switch to it only once there is a real measurement, and print the same figure in words
  beside the bar. The track carries no scale of its own.

One flow can move through both. The import bar is indeterminate while the file is being read and
determinate once slices are on the wire.

## Composing it

```jsx
{/* the scan wait - full width under the card's text */}
<CardBody variant="card-body-centered">
	<DocumentPreview kind="pdf" className="scan-reading-preview" />
	<div>
		<div className="card-headline">Reading Bilka-kvittering-2024-05-14.pdf</div>
		<span className="field-help">
			This usually takes a few seconds. Nothing is stored until you approve the review.</span>
	</div>
	<ProgressBar className="scan-reading-progress" label="Reading progress" />
</CardBody>

{/* the import - bar and percentage on one line */}
<div className="import-progress">
	<ProgressBar label="Import progress" indeterminate={false} value={64} />
	<span className="field-help tabular-figures">64%</span>
</div>
```

`import-progress` gives the bar the leftover width and keeps the figure beside it; the bar has
no width of its own, so it needs either that row or `scan-reading-progress`.

Give the card `aria-busy="true"` while the bar is running.

## Props

- `indeterminate` — true by default; `false` needs `value`
- `value` — percent complete, 0-100, read only in the determinate mode
- `label` — the bar's accessible name (it is the `role="progressbar"`)
- `className` — `scan-reading-progress` for the full-width form
- `style`

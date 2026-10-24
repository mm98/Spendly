---
category: Files
---
One file at full size, over the page: the picture zooms, arrows step through the files, and a bar holds download and close.

## Props

- `items`: the files, as `{ name, src?, zoomSrc?, download?, kind?, pageSrc?, pages?, countPages? }[]`. A file without `src` shows its kind (`kind: 'pdf'` shows PDF)
- `at`: the index of the file shown (default 0)
- `beside`: a second file shown next to the first, to compare them
- `onMove`: receives the next index (it wraps around)
- `onClose`: close, Escape, or a click outside

## Rules

- Takes no `className` or `style`.
- It is modal: arrow keys step and Escape closes wherever focus is, and focus stays inside it.
- A click or tap zooms in at that point; a pinch or Ctrl and the wheel zooms too. On a phone it fills the screen and a sideways swipe moves to the next file.
- A file with several pages shows a page rail when it has `pageSrc` and `pages` or `countPages`.

## Example

```jsx
{viewing != null
	? <Viewer items={files} at={viewing} onMove={setViewing} onClose={() => setViewing(null)} />
	: null}
```

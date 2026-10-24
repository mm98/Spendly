---
category: Files
---
The attachment strip: file tiles in one row that scrolls sideways, with a chevron at each end when there is more.

## Props

- `children`: `Attachment` tiles, then an `AttachmentAdd` last when files can be added

## Parts

- `AttachmentAdd`: the dashed tile that adds files. `onFiles` receives `(files, problems)`; `accept` (default: PDF and pictures); `multiple` (default `true`).

## Rules

- Takes no `className` or `style`.
- A chevron is disabled, and hidden, when there is nothing more that way.
- On a phone the tiles stand alone, without their names.

## Example

```jsx
<Strip>
	<Attachment name="Receipt Bilka.jpg">
		<Mark size="xlarge" fill="photo" aria-label="Open Receipt Bilka.jpg" onClick={open}><img src={thumb} alt="" /></Mark>
	</Attachment>
	<AttachmentAdd onFiles={add} />
</Strip>
```

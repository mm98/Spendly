---
category: Files
---
One tile in the attachment strip: its mark, with the file's name under it.

## Props

- `name`: the file's name, shown under the tile and cut short when long
- `children`: the tile's `Mark`, size `xlarge`. A picture uses `fill="photo"` with an `img`; a file without a picture uses `fill="none"` with its kind (`PDF`, `XLSX`)

## Rules

- Takes no `className` or `style`.
- The mark says the state: `text="PDF"` or `"Added twice"` on the picture, `danger="Too large"` or `"Retry"` for a problem, a `Spinner` while it is sent.
- Removing is the mark's `remove`, a `MarkRemove`.
- Sit it inside a `Strip`.

## Example

```jsx
<Attachment name="Invoice IKEA.pdf">
	<Mark size="xlarge" fill="photo" text="PDF" aria-label="Open Invoice IKEA.pdf" onClick={open}>
		<img src={thumb} alt="" />
	</Mark>
</Attachment>
```

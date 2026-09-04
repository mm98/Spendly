---
category: Layout
---
Draws a real picture when there is one and the named glyph when there is not — in the same
frame, at the same size, with one component instead of every caller writing its own
`<img onError>`.

Give it both: `src` for the thumbnail the server generated, `icon` for the glyph to fall back
to. With no `src` it never makes a request at all. If the image does fail — a thumbnail that
has not been generated yet, a network hiccup — it swaps to the glyph and the layout keeps its
shape. There is no broken-image box and no empty hole.

The fallback glyph should say what the file *is*, not what the frame usually holds: a PDF
invoice falls back to `document`, a photo to `photo`. A PDF drawn with a photo glyph is the
screen telling the reader it read something else.

## Two classes, because the frame sizes them differently

- `className` — goes on the fallback `Icon`
- `imgClassName` — goes on the `<img>`

The app's frames pair them: `document-thumb` + `document-thumb-img` for a 40px row tile,
`document-preview-glyph-*` + `document-preview-photo` for the 180px preview.

## Props

- `src` — the preview image; empty or failing falls back
- `icon` — the `Icon` name to fall back to
- `alt` — alt text for the image branch, default `""` (decorative)
- `className` — class on the fallback icon
- `imgClassName` — class on the image

## Example

```jsx
<span className="document-thumb">
	<ImageOrIcon src={line.thumbnailUrl} icon="photo" imgClassName="document-thumb-img" />
</span>
```

`ItemRow` (`thumb` + `thumbSrc`) and `DocumentPreview` (`kind` + `src`) already wrap this —
reach for them before placing it yourself.

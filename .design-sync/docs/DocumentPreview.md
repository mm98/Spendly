---
category: Feedback
---
The picture of an uploaded document: a 180px tall inset panel holding the file's own thumbnail,
or the glyph for its kind when there is no thumbnail to show. Reach for it anywhere a file the
reader supplied has to be identified on screen — the scan flow's source card, a document being
read.

## The two kinds, and nothing else

`kind` is the kind the server files the upload under, read from the file's own first bytes:

- `"image"` — jpeg, png, webp, heic, heif, gif, tiff, bmp, avif. Draws the photo glyph.
- `"pdf"` — draws the document glyph.

Those are the only two words the stylesheet draws a glyph for. Any other value renders an empty
grey box with no error, so pass the server's `kind` straight through rather than deriving one
from a file extension or a MIME type.

## `src`, and the fall back

`src` is a real thumbnail or display image. Leave it out — or let it fail to load — and the box
falls back to the glyph for `kind`. That fallback is the point: a PDF invoice drawn with a photo
glyph would be the screen claiming it read something it did not. PDFs never have a thumbnail, so
they always fall back.

```jsx
<Card aria-label="Source document">
	<CardHeader title="Source document" />
	<CardDivider />
	<CardBody>
		<DocumentPreview kind={file.kind}
			src={file.hasThumbnail ? scanThumbnailUrl(key) : undefined} />
		<div className="space-between document-name-row">
			<span className="document-name">{file.name}</span>
			<span className="field-help">{file.meta}</span>
		</div>
	</CardBody>
</Card>
```

The name row under it is the app's own pairing: the file name on the left, its kind and size on
the right. Keep them together — the preview alone does not say which file it is.

## Sizes

The default box is 180px tall and as wide as its container, and a thumbnail fills it edge to
edge (cropped, not letterboxed). Two classes change that, and they are the only two:

- `scan-source-open` — 520px tall, for "the reader asked to actually look at it".
- `scan-reading-preview` — a fixed 120x150 thumbnail, for the small picture beside a progress
  message.

## Props

- `kind` — `"image"` or `"pdf"`. Defaults to `"image"`.
- `src` — thumbnail or display image URL. Optional.
- `className`, `style`, and anything else is spread onto the outer `<div>` (the app passes `id`
  so a disclosure button can point `aria-controls` at it).

The box is `aria-hidden`, so it is never the only thing naming the file. The name row is.

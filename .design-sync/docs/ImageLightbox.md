---
category: Feedback
---
The full-size view behind a photo thumbnail's click: the picture on a dimmed backdrop, with a
close button on its corner. Reach for it wherever a small image stands for a larger one — an
item's photo on an order, a receipt on an attachment row.

A native `<dialog>` opened with `showModal()` — focus trapped, Escape wired, a click on the
backdrop closes it. Rendered only while open and removed by unmounting.

## How the caller drives it

```jsx
{openPhoto ? (
	<ImageLightbox
		src={itemAttachmentFileUrl(order.id, openPhoto.item.id, openPhoto.photo.id)}
		alt={`${openPhoto.item.title} photo`}
		onClose={() => setOpenPhoto(null)} />
) : null}
```

Hold "which photo is open" in the page's own state and render the lightbox only when there is
one. `onClose` fires from all three exits: the close button, Escape, and a click on the
backdrop.

## What it decides for you

- **The dialog sizes to the picture**, not the other way round: it has no box of its own. The
  image's own ceiling is the window less 24px on every side, so a large photo grows up to that
  and stops, and a small one stays small rather than being stretched.
- The close button sits on the picture's top-right corner, half outside it, on a white disc.
- Focus goes back to the thumbnail that opened it when the dialog unmounts.

## Props

- `src` — the full-size image's URL. Give it the display image, not the thumbnail.
- `alt` — what the picture is of, e.g. `"Rugbrød photo"`. It is also the dialog's accessible
  name; left empty, the dialog is named "Photo".
- `onClose`.

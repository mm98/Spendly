---
category: Files
---
A place for one picture: empty with a camera and Add, filled with the picture and Remove, red with the reason when a file is refused.

## Props

- `src`: the picture's address; empty shows the camera
- `size`: `'small'` | `'medium'` | `'large'` (default) | `'xlarge'`
- `kind`: the word on a filled picture (default `'Photo'`); `null` for none
- `word`: the word under an empty slot (default `'Add'`)
- `name`: what the picture is, for screen readers (default `'the image'`): "Add the image", "Remove the image"
- `start`: lines the slot up at the start of its row
- `accept`: the file types (default: JPEG, PNG, WebP, GIF)
- `inspect`: `(file) => reason | null`, replaces the type and size check
- `problem`: the page's reason the picture failed, shown in red
- `busy`: a spinner over the picture while it is sent
- `onFile`: receives the chosen `File`
- `onRemove`: Remove was pressed
- `onRetry`: with `problem`, shows Retry in place of Remove
- `id`: the file input's id

## Rules

- Takes no `className` or `style`.
- A refused file shows its reason with Remove; it is never sent.
- On a phone a filled slot shows Replace and Remove buttons beside the picture.

## Example

```jsx
<Slot size="medium" word="Add photo" name="the line's photo" src={photo}
	busy={sending} onFile={take} onRemove={remove} />
```

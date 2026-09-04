---
category: Forms
---
The one picture control in the app: a 128px frame that opens the picker when tapped, takes a
drop, takes a paste, and once it holds a picture offers Replace and Remove under it. The order
line card and the wish form both draw this one — there is not a second picture control to
choose from.

## How to compose it

The frame takes its width from `--line-photo`, which the block around it sets. Put it inside
one that does: `.wish-photo-field` for a standalone field, or the line card, which sets it too.
A frame with neither around it has no width to take.

```jsx
<Field label="Picture" optional group>
  <div className={drop.over ? 'wish-photo-field is-dragover' : 'wish-photo-field'}
    {...drop.dropProps}>
    <LinePhoto photo={photo} label="Picture of this wish" hint={false}
      onPick={pick} onClear={clear} />
  </div>
</Field>
```

The field takes `group`: what labels the control is the group's own label, not an input.

## photo is the host's answer, not a file

`photo` is `{ present, src }`, because only the host knows whether its record has been saved
yet:

- `{}` — an empty frame
- `{ present: true, src }` — the picture, with Replace and Remove under it
- `{ present: true }` with no `src` — there is a picture but no thumbnail to draw

`src` is an object URL for a file just picked, or the stored thumbnail's URL. Revoke an object
URL you created when the card holding it closes.

An image that will not load falls back to the same mark an empty frame draws, rather than the
browser's broken-picture glyph.

## Dropping and pasting

The frame itself takes a drop. A paste goes to whatever holds focus, so it cannot be a handler
on the frame — `useDroppedPhoto(onPick)` binds the window listener and hands back
`dropProps` for a wider drop target around the frame, plus `over` for its lit state.

```jsx
const drop = useDroppedPhoto(file => setPicked({ file, url: URL.createObjectURL(file) }))
```

Only the first image in a drop or a paste is taken: the frame holds one.

## hint, heading and name

- `hint` (default `true`) is the "Drop a photo here, or paste one you copied" line under an
  empty frame. Turn it off where 128px is too narrow for it to read — the box already says what
  it takes. It is never drawn on a phone, which has neither gesture.
- `heading` and `name` are drawn on a phone only, where the host's card band is hidden and the
  words go beside the frame instead. A host with a headline of its own passes neither.

## Props

- `photo` — `{ present, src }`
- `onPick(file)`, `onClear()`
- `label` — the accessible name of the input behind the frame
- `hint` — the sentence under an empty frame, default `true`
- `heading`, `name` — phone-only text beside the frame

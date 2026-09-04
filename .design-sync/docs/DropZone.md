---
category: Forms
---
The dashed block that takes a dropped file and offers a text action to anyone not dragging.
Reach for it where a card has nothing on it yet and a file is what would fill it — it is the
system's own empty state, so an empty attachments card is one control rather than a box with a
button under it.

## How to compose it

It fills the body of the card it belongs to, and it is drawn instead of the list, not beside
it: once there is one attachment the list replaces it.

```jsx
{order.attachments.length
  ? order.attachments.map(file => <ItemRow key={file.id} … />)
  : <DropZone icon="photo" kind={RECEIPT_FILES} label="Add attachments"
      hint="Drop receipts here — as many as you like — or choose them."
      action="CHOOSE FILES" onFiles={attach} />}
```

The card that holds it should take a drop too, so a file landing anywhere on the card is
caught: `onDragOver={e => e.preventDefault()}` and an `onDrop` on the `CardBody`. A zone that
says "drop" and only answers a click is a button with no handler, one sense down.

## The file kinds

`kind` comes from `fileKinds.js`, never spelled out at the call site: `RECEIPT_FILES` (images
and PDF), `PHOTO_FILES` (images only), `EXPORT_FILES` (JSON). It shapes both the `accept`
attribute and the dialog's own filter, so the picker cannot offer something the server will
refuse.

## Writing the words

- `hint` is a sentence about what the box takes and how many of it. Say the plain thing:
  "Drop receipts here — as many as you like — or choose them."
- `action` is the text action, in capitals, naming what pressing it does: CHOOSE FILES, CHOOSE
  A FILE.
- `icon` is the glyph on the tile above the sentence: `upload` by default, `photo` where the
  files are pictures.

## What it decides for you

The drag state and the picker. The box lights up while a file is over it and settles back when
it leaves; the text action opens the best dialog the browser offers. `onFiles` is called with a
real array, and never with an empty one.

## Props

- `onFiles(files)` — the dropped or chosen files
- `multiple` — default `true`
- `kind` — `{ description, accept }` from `fileKinds.js`
- `accept` — a raw accept attribute, only without `kind`
- `label` — the accessible name of the input behind the zone
- `hint` — the sentence in the box
- `action` — the text action, default `CHOOSE FILES`
- `icon` — the tile's glyph, default `upload`

---
category: Forms
---
The file input every picker in the app opens. It draws nothing at all: it is clipped to one
pixel wherever it is put, and some other control — a button, a pill, a photo frame — opens it.
Use it whenever a page needs to ask for a file without a browser-drawn "Choose file" control
on screen.

## How to compose it

Put the input beside the control that opens it, hold a ref, and call `click()` on the ref.

```jsx
const picker = useRef(null)

<Button variant="block" icon="upload" onClick={() => picker.current?.click()}>
  CHOOSE A JSON FILE</Button>
<HiddenFileInput ref={picker} kind={EXPORT_FILES}
  label="Choose a JSON file of orders" onFiles={([file]) => setImportFile(file)} />
```

The ref is **not** the input element. It is a handle with one method, `click()`, which opens the
best dialog the browser offers — the filtered one where `showOpenFilePicker` exists, the plain
input everywhere else. Call it straight from the click handler and never after an `await`: the
dialog needs the gesture that opened it, and a gesture does not survive a turn of the event
loop.

## Where it is already done for you

`DropZone` and `LinePhoto` both hold one of these. Reach for this component only when you are
drawing the opener yourself.

## The file kinds

`kind` comes from `fileKinds.js` — `RECEIPT_FILES`, `PHOTO_FILES`, `EXPORT_FILES` — and shapes
both the `accept` attribute and the dialog's filter. Naming a kind is what keeps the picker
from offering something the server will refuse.

## What it decides for you

- The id, which is generated per instance, so a page holding several (one per line photo) has
  no duplicate ids.
- Clearing its own value after a change, so choosing the same file twice still fires.
- `onFiles` gets a real array, and is never called for a cancelled dialog.

## Props

- `ref` — the handle; `ref.current.click()` opens the dialog
- `onFiles(files)`
- `multiple` — default `false`
- `kind` — `{ description, accept }` from `fileKinds.js`
- `accept` — a raw accept attribute, only without `kind`
- `label` — the input's accessible name

## Note

This component contributes no pixels, so there is nothing to place, size or align. Give the
opener the words and the affordance; the input only has to exist.

---
category: Files
---
The place a file is dropped or chosen: a label around a real file input, so click, keyboard and the phone's camera all work.

## Props

- `children`: the words inside, often a `Mark`, a title and a meta line
- `icon`: an icon name shown above the words (`'upload'`, `'camera'`)
- `action`: words drawn as a small button inside the zone ("Select a receipt")
- `accept`: the file types, as the input's `accept` list (default: PDF and pictures)
- `multiple`: takes several files (default `false`)
- `maxMb`: the largest file, in MB (default 25)
- `onFiles`: receives `(files, problems)`; each problem is `'Not a supported type'`, `'Too large'` or `null`
- `row`: the zone on its side, the mark left and its lines beside it
- `fullWidth`: takes all the room it is given: the width of its column, or what is left in its row
- `disabled`: muted, with no file input; the children say why
- `id`: goes on the file input (a `Field` passes it)

## Rules

- Takes no `className` or `style`.
- A picture pasted anywhere on the page goes to the newest drop place on screen.
- A disabled zone says why, and when it will work: "Available once your email is confirmed".

## Example

```jsx
<FileDrop accept={FILE_TYPES} onFiles={send} action="Select a receipt">
	<Mark size="large" aria-hidden="true"><Icon name="upload" size={24} /></Mark>
	<span className="sp-title">Drop receipt here</span>
	<span className="sp-meta">PDF, JPG, PNG, WebP or GIF · up to 25 MB per file</span>
</FileDrop>
```

---
category: Overlays
---
A short notice of what already happened, which takes itself away; `asks` is the one that stays until it is answered.

## Props

- `children`: the message, then at most one `ToastUndo` as the last child
- `icon`: an icon name (`'check'`, `'alert-circle'`, `'trash'`); `mark` replaces it with a numbered step mark
- `color`: `'default'` | `'danger'`
- `compact`: the small count toast ("4 picked")
- `asks`: a notice that needs an answer; give it `actions`
- `title`: a heading, with the message under it
- `list` with `listLabel`: a short list under the words of a toast that asks
- `seconds`: the countdown shown beside `ToastUndo`

## Parts

- `ToastUndo`: the way back out (`Undo`, `Keep it`) or the one way on (`Retry now`); `onClick`.
- `Toaster`: the stack toasts sit in at the bottom of the window; `notice` holds an `asks` toast above the rest.

## Rules

- Takes no `className` or `style`.
- Only a toast that `asks` takes `actions`. Any other toast has at most its `ToastUndo`.
- Say what happened, in the past tense: "Line removed from SPENDLY-447".

## Example

```jsx
<Toaster>
	<Toast icon="check">
		Line removed from SPENDLY-447
		<ToastUndo onClick={undo}>Undo</ToastUndo>
	</Toast>
</Toaster>
```

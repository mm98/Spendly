---
category: Feedback
---
The modal question the app asks before doing something it cannot take back. Every destructive
action in Spendly asks this way — never an inline note unfolding under the button, never a
toast with an undo.

It is a native `<dialog>` opened with `showModal()`: focus is trapped inside it, Escape fires
cancel, and the backdrop is the element's own. It is rendered only while the question is open
and removed by unmounting, not by closing itself.

## How the caller drives it

```jsx
const [confirming, setConfirming] = useState(false)
// ...
{confirming ? (
	<ConfirmDialog
		title="Delete this order?"
		detail="Bilka, 18 April 2024, 1.284,00 kr. This cannot be undone."
		confirmLabel="DELETE"
		onConfirm={() => { setConfirming(false); remove() }}
		onCancel={() => setConfirming(false)} />
) : null}
```

Both handlers are the caller's job. The dialog never closes itself, and it never runs the
action — it only reports which button was pressed. `onCancel` also fires on Escape and on a
click outside the card.

## What it decides for you

- **Focus lands on the cancel button**, not the first focusable one. An Enter key still in
  flight from whatever opened the dialog must never be the thing that confirms.
- **Focus returns to the opener** when the dialog unmounts. If the opener has just been
  deleted, focus simply stays where the page put it.
- The two buttons are one pair at one height: the confirm button is `Button variant="caps
  compact"`, the cancel is `variant="ghost compact"`.

## Props

- `title` — the question, ending in a question mark: `"Delete this order?"`. Also the dialog's
  accessible name.
- `detail` — one sentence naming exactly what is at stake, so the reader can tell they picked
  the right record: `"Groceries, 4.120 kr. this month. This cannot be undone."`
- `confirmLabel` — the verb, in capitals: `"DELETE"`, `"RELOAD"`.
- `cancelLabel` — defaults to `"CANCEL"`. Write the refusal in the caller's own words when
  "cancel" is wrong: the update prompt uses `"NOT NOW"`.
- `onConfirm`, `onCancel`.

## Writing the two sentences

The title names the kind of thing (`Delete this order?`), the detail names the one record and
what disappears with it. Deleting a record ends the detail with "This cannot be undone." —
`useDelete` appends that sentence itself, so a caller using the hook writes only the facts.

---
category: Feedback
---
The whole-page wait an edit form shows before its record has arrived, and the failure card it
shows when the record will not arrive. Reach for it at the top of any page whose form can only
mount once the record is in hand.

## Why it is a page and not a card

A form's fields are hooks — validation state, the draft, the pickers — so the fields component
may only mount after the record is here. `RecordWait` draws its own `Page`, so it is the whole
return value of the page component, never nested inside `FormPage` or another `Page`: two
`.page.is-on` elements put a grid inside a grid and nothing hides.

```jsx
export function VendorForm() {
	const existing = useApi(getVendor, [id])
	if (!existing.data) return <RecordWait state={existing} label="Loading the vendor" />
	return <VendorFields vendor={existing.data} />
}
```

## What it draws, from `state`

`state` is the object `useApi` returns: `{ data, error, loading }`.

- `data === undefined` and no error — a skeleton card of six shimmering lines, shaped like the
  form about to replace it, so the swap does not move the page.
- `error.status === 404` — a card reading "Nothing here." followed by the server's own message.
- any other `error` — the same card reading "That did not load." followed by the message.
- `data` present — nothing. The page has moved on; render the form instead.

## Props

- `state` — `{ data, error, loading }` from `useApi`. Required.
- `label` — what is being loaded, as a fragment: `"Loading the vendor"`, `"Loading the draft"`.
  It names the busy region for a screen reader and is not drawn on screen.
- `steps` — the `Stepper` band to keep above the card while waiting, when the form is one step
  of a numbered flow. Each step is `{ label, icon, done, on }`. Pass the same array the flow's
  own screens pass, so the reader does not lose their place during the wait.

## Choosing the label

One line, naming the record and not the request: "Loading the vendor", "Loading the category",
"Loading the draft". Never "Fetching data" or an endpoint name.

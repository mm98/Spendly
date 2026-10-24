---
category: Surfaces
---
A read that did not load, and the one action that fixes it. It draws its own card: a problem icon, "<what> did not load", the reason and Try again.

## Props

- `what` (required): what did not load, e.g. `'Your orders'`; the title is always "`what` did not load"
- `variant`: `'page'` (default; centred in a card, for a whole page) | `'card'` (a card in a grid: its head, a red alert and Try again in the footer)
- `label`: the card's head name, for `variant="card"`
- `error`: the failure. A refusal written for the reader is shown as it is; otherwise the reason is "Spendly had a problem. Try again." when the server answered, or "Check your connection, then try again." when it was not reached.
- `onRetry`: what Try again does
- `back`: `{ to, label }`. When the record is gone (404), this link replaces Try again.

## Rules

- Takes no `className` or `style`.
- Renders nothing when the error is that the reader is signed out.
- One action only: Try again, or the way back.

## Example

```jsx
<Failed what="Your orders" error={orders.error} onRetry={orders.refresh} />
<Failed variant="card" label="This month" what="This month" error={month.error} onRetry={month.refresh} />
```

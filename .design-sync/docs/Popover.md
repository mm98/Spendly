---
category: Overlays
---
A small panel that holds a choice until it is applied: a head, a list to choose from, a summary of what will happen, and the actions.

## Props

- `position`: `'default'` (under its trigger) | `'start'` (aligned left) | `'end'` (aligned right) | `'static'` (in flow, no shadow, as drawn on a page)
- `head`: the title and one line under it (`sp-title`, `sp-subtitle`)
- `search`: a `SearchInput` above the list
- `children`: the list: `Choice` rows, or a `Menu position="plain"`
- `summary`: what applying will do, e.g. "4 orders move to Havemøbler"
- `note`: an extra row above the actions (e.g. a `Switch` and its words)
- `actions`: Cancel and Apply, as `Button`s
- `role`, `aria-label`: give it `role="dialog"` and a name

## Rules

- Takes no `className` or `style`.
- It hangs from an `Anchor` or another element with `sp-anchor`, or it places itself against the page.
- A popover waits for Apply. A list that acts at once is a `Menu`.

## Example

```jsx
<Popover
	position="start"
	role="dialog"
	aria-label="Set status"
	head={<><span className="sp-title">Set status</span><span className="sp-subtitle">Replaces the status on 3 orders.</span></>}
	actions={<><Button variant="outline" fullWidth onClick={cancel}>Cancel</Button><Button fullWidth onClick={apply}>Apply</Button></>}
>
	<Choice variant="row" control={<Radio name="status" checked={status === 'done'} onChange={() => setStatus('done')} />}>Delivered</Choice>
</Popover>
```

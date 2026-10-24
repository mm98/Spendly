---
category: Data
---
The list a donut is read from: one `ShareRow` per share, with its series key, its name, and its value.

## Props

- `children`: `ShareRow`s

## Parts

- `ShareRow`: one share.
  - `series`: `1` (default) | `2` | `3` | `4`
  - `value`: the share, e.g. `'46%'`
  - `amount`: the amount, shown before the value
  - `onClick`: the row is a button (a share used as a filter)
  - `href`: the row is a link (a share in an answer that opens its orders)
  - `children`: the name, cut with an ellipsis when long
  - with neither `onClick` nor `href` the row is plain and invites no click

## Rules

- Takes no `className` or `style`.
- Use the same series numbers as the `Donut` beside it.

## Example

```jsx
<Shares>
	<ShareRow series={1} amount="24.310 kr." value="46%">Indbo Møbler</ShareRow>
	<ShareRow series={2} amount="14.120 kr." value="27%">IKEA</ShareRow>
</Shares>
```

---
category: Cards
---
The band across the top of a card: its uppercase label on the left, an optional control or
chevron on the right. Always the first child of a `Card`, always followed by `CardDivider`.

The band has one height whatever it carries, so a control on the right must be shorter than
the band — a `pill` button (32px) is the tallest thing that fits. Never render a header
outside a card; it has no look of its own.

## Three kinds of header

| | markup | what it draws |
|---|---|---|
| Plain | `<CardHeader title="Latest orders" />` | the label alone |
| Navigating | `<CardHeader title="Orders" to="/orders" label="Orders, open Orders" />` | the whole band is a link, with a right chevron |
| Disclosure | `<CardHeader title="Filters" onToggle={fn} open={open} controls="filter-panel" />` | the whole band is a button, with a chevron that turns down/up |

`to` and `onToggle` are mutually exclusive: one band, one verb. Never put a boxed icon button
on a passive header to open something — make the band itself the control.

## Naming it out loud

With `to`, the accessible name defaults to `"<title>, open <to>"`, which reads out a URL.
Pass `label` with a spoken destination instead: `label="Orders, open Orders"`. Every card
header in the app announces "<its own words>, open <destination>".

## Props

- `title` — the words in the band
- `to` — an in-app route; makes the band a link
- `label` — overrides the accessible name
- `onToggle` — makes the band a disclosure button
- `open` — whether the panel is open; turns the chevron and sets `aria-expanded`
- `controls` — the `id` of the panel `onToggle` opens (a string, for `aria-controls`)
- `children` — one control for the right-hand slot
- `className`

## Example

```jsx
<Card aria-label="Vendors">
	<CardHeader title="Vendors • 12">
		<Button variant="pill" icon="plus" to="/vendors/new">ADD</Button>
	</CardHeader>
	<CardDivider />
	<CardBody variant="entry-list card-body-tight">{rows}</CardBody>
</Card>
```

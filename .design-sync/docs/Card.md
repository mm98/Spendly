---
category: Surfaces
---
The surface a section of a page sits on: a ground, an edge and padding, with an optional head (`CardHeader`) and a footer of at most two actions.

## Props

- `variant`: `'default'` | `'flush'` (no padding: the content owns it, as a table or image needs; put padded parts in `CardBody`) | `'row'` (lays its children in a line) | `'shell'` (the dark summary card) | `'path'` | `'float'` | `'float-wide'` (the sign-in and first-run cards that float on the page)
- `color`: `'default'` | `'warning'` | `'danger'`
- `footer`: one or two `Button`s. One fills the footer; two share it.
- `footerLayout`: `'fill'` (default) | `'split'` (two equal halves) | `'stack'`
- `footerCommits`: the footer holds the commit, at the committing size
- `after`: content under the footer, apart from the commits
- `onLongPress`: on touch, a row held still opens its record menu: this opens it
- `to`: makes the whole card a link; pair with `chevron={<Icon name="chevron-right" />}`
- `spread`: stretched beside a taller card, it shares the free height between its groups

## Parts

- `CardHeader` (only as a direct child of `Card`, no children; every view is a named slot):
  `name` (required, the section label), `meta`, `aside` with `asideTone` `'default' | 'note' | 'danger'`,
  `control` (e.g. a `Segmented`), `status` (e.g. a `Pill`), `actions` (at most two `{ label, to, href, onClick, held }`),
  `onDismiss` with `dismissLabel`.
- `CardBody`: the padding back inside a `flush` card. Under a `toggle` `Toolbar`, `open` says whether the body is unfolded; it folds and unfolds smoothly.
- `CardFooter`: a footer row of figures inside the body, under its rule (actions go in `footer`).
- `Toolbar`: a card's header row; `variant` `'default' | 'loose' | 'link' | 'toggle'`, `expanded`, `chevron`.
- `ListFooter`: the foot of a card's own set of things; `loose` takes the grid's width.
- `Cards`: the grid cards sit in; `fluid` fills the width instead of holding a column count.

## Rules

- Takes no `className` or `style`.
- Three actions is a menu, not a footer or a head.
- Text inside a card uses the type classes: `sp-title`, `sp-subtitle`, `sp-data`, `sp-meta`, `sp-section-label`, `sp-stat__figure`.

## Example

```jsx
<Cards>
	<Card>
		<CardHeader name="Top vendors" aside="August · top 8 of 10" />
		<span className="sp-data">Indbo Møbler · 24.310 kr.</span>
	</Card>
	<Card footerLayout="split" footerCommits footer={[<Button key="c" variant="text">Cancel</Button>, <Button key="s">Save</Button>]}>
		<span className="sp-title">Edit vendor</span>
		<span className="sp-subtitle">Two actions share the footer.</span>
	</Card>
</Cards>
```

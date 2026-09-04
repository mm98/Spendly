---
category: Layout
---
The root element of every page. It draws the grid a page's cards sit in and nothing else —
the rail, the top bar, the sub-tab band and the sheet around it all belong to the shell.

Every page component returns a `<Page>` as its outermost element, with cards, grids and
`Async` blocks directly inside it. Do not wrap a page in a div of your own first.

## Variants

| `variant` | Columns | Used by |
|---|---|---|
| *(omitted)* | One | Orders, Order detail, Edit order, Settings, All vendors, All categories, Scan |
| `page-grid` | One | All orders, Categories, Statistics, Vendors, Wishlist |
| `content-grid` | Wide column + rail | Home |

The first two declare the same single-column grid at the same `--gap-cards` rhythm, so they
look identical. `page-grid` is the explicit spelling; either is correct, and neither needs a
reason.

`content-grid` is the only one that changes the shape. It expects exactly two children:

```jsx
<Page variant="content-grid">
	<div className="content-column-main"> ... </div>
	<div className="content-column-side"> ... </div>
</Page>
```

It is 1.78fr / 1fr with a 300px floor on the rail, and it collapses to a single column below
1181px, so nothing may depend on the two columns standing. Each column is itself a
single-column grid, so cards inside them stack at the same rhythm.

## What it decides for you

The grid, the gap between cards, and `data-view`, which it reads from the shell's view
context. That attribute is what lets the Vendors and Categories sub-tabs switch what is on
the page without navigating; a page renders correctly with no provider above it, and the
attribute simply reads `overview`.

## Props

- `variant` — `"page-grid"`, `"content-grid"`, or omitted
- `children` — the page
- anything else is spread onto the element

## Example

```jsx
export default function Vendors() {
	return (
		<Page variant="page-grid">
			<div className="hero hero-panel"> ... </div>
			<Async state={state} label="Loading your vendors"> ... </Async>
		</Page>
	)
}
```

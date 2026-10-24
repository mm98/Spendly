# Spendly: how to build with these components

Spendly is a household spending app: orders, vendors, categories, budgets, and Ask (questions about your own orders). The components are the app's real ones. Every look comes from one stylesheet; the components only choose class names.

## Setup: wrap everything in `SpendlyRoot`

```jsx
const { SpendlyRoot, Card, CardHeader, Button } = window.Spendly;
<SpendlyRoot>{/* your screen */}</SpendlyRoot>
```

`SpendlyRoot` puts the `sp` class on `<body>` and gives the tree a router. Without the `sp` class the font, ink colour and page ground are missing and text falls back to a serif. Without the router, any component with `to=` (Button, Card, NavItem, Record) crashes. Use `to="/orders"` for in-app links; `href` for outside addresses. It also turns on the app's motion (sliding markers, fades, rows that make room), and follows the device's "reduce motion" setting, so a screen needs no motion setup of its own.

Dark mode: set `data-theme="dark"` on `<html>`. Without it, the light look is used.

## The styling idiom: props first, then a few named classes

- **Components take no `className` and no `style`.** They drop both and log an error. Every look is a prop: `variant`, `color`, `size`, `tone`. If no prop gives the look, use another component, not a style.
- **Text** in your own layout uses the type classes: `sp-title` (a name), `sp-subtitle` (the line under it), `sp-data` (a value), `sp-meta` (quiet detail), `sp-note`, `sp-section-label` (small caps heading), `sp-stat__figure` (a large figure), `sp-number` (aligned digits), `sp-truncate`, `sp-nowrap`.
- **Ink**: `sp-ink-2`, `sp-ink-5`, `sp-ink-accent`, `sp-ink-success`, `sp-ink-warning`, `sp-ink-danger`, `sp-ink-inverse`.
- **Layout glue**: `sp-row-flex` (a row), `sp-stack` (a column), `sp-stacked` (a title with its second line), `sp-gap-6` / `-8` / `-10` / `-12` / `-14` / `-16`, `sp-grow` (pushes the rest to the end), `sp-column--form` (a form's column width).
- **Tokens**, when you must write CSS for your own page frame: `var(--bg)` page ground, `var(--surface)` card ground, `var(--ink)` to `var(--ink-6)`, `var(--line)`, `var(--green)` brand, `var(--amber)` warning, `var(--red)` danger, spacing `var(--sp-2)` to `var(--sp-16)`, radii `var(--r-card)` / `var(--r-field)` / `var(--r-pill)`, type sizes `var(--t-11)` to `var(--t-24)`, `var(--font)`.

## Composition rules the components hold to

- A form control always sits in a `Field` (label, message, required mark). `onChange` hands back the value, not the event.
- A `Card` takes at most one `CardHeader` (a direct child, no children of its own) and at most two footer actions. Three actions is a `Menu`.
- One solid `Button` per surface. Cancel is `variant="text"`.
- Icons are named, from the Tabler outline set: `<Icon name="plus" />`, `iconStart="trash"`. See `Icon` for the names the app uses.
- Amounts are Danish style: `24.310,00 kr.`; dates `24.08.2026`.

## Where the truth lives

- `styles.css` and its import, `_ds_bundle.css`: every rule and token. Read it before styling anything yourself.
- Each component's `<Name>.prompt.md`: its props, its parts (sub-components such as `CardHeader`, `MenuItem`, `DialogTitle`, all on `window.Spendly`), its rules and an example.

## Example

```jsx
<SpendlyRoot>
	<div className="sp-stack sp-gap-16" style={{ padding: 24, maxWidth: 720 }}>
		<Card>
			<CardHeader name="Top vendors" aside="August · top 3 of 10" />
			<div className="sp-stacked">
				<span className="sp-title">Indbo Møbler</span>
				<span className="sp-subtitle">24.310 kr. across 3 orders</span>
			</div>
		</Card>
		<Card footerLayout="split" footerCommits footer={[<Button key="c" variant="text">Cancel</Button>, <Button key="s">Save</Button>]}>
			<Field label="Vendor" required>
				<TextField value="Bilka" onChange={setVendor} />
			</Field>
		</Card>
	</div>
</SpendlyRoot>
```

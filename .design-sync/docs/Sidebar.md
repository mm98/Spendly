---
category: Navigation
---
The dark column of destinations on the left of a desktop page: the brand, rows in groups, and the account at the foot.

## Props

- `variant`: `'default'` (expanded, 248px) | `'rail'` (icons only, 68px) | `'peek'` (a rail that floats open at full width over the page) | `'slide-in'` | `'slide-out'`
- `motion`: `'in'` | `'out'`: the labels run in as the column opens, or out before it closes
- `children`: `SidebarBrand`, then `NavItem` rows with `SidebarGroup` titles and `SidebarDivider` rules, then `<span className="sp-grow" />`, the bottom zone (`SidebarAccount`), and `SidebarGrip` last

## Parts

- `SidebarBrand`: the product mark and name at the top: `<Mark size="small" fill="solid">S</Mark>` and `<span className="sp-strong">Spendly</span>`.
- `SidebarGroup`: a small title over a group of rows ("Orders", "Needs attention"). Hidden on the rail.
- `SidebarDivider`: the rule between the destinations and the zone at the bottom.
- `SidebarGrip`: the one control that collapses and expands the column, on its right edge. `expanded` (default `true`), `onClick`.

## Rules

- Takes no `className` or `style`.
- The rows are the sidebar's own children: its column spaces them. Do not wrap them.
- On the rail, give each `NavItem` a `tip`, since its label is hidden.
- The column scrolls on its own when it is taller than the window.

## Example

```jsx
<Sidebar>
	<SidebarBrand><Mark size="small" fill="solid">S</Mark><span className="sp-strong">Spendly</span></SidebarBrand>
	<NavItem icon="home" current>Home</NavItem>
	<SidebarGroup>Orders</SidebarGroup>
	<NavItem icon="receipt" count={18}>All orders</NavItem>
	<NavItem icon="building-store" count={24}>Vendors</NavItem>
	<span className="sp-grow" />
	<SidebarDivider />
	<SidebarAccount name="Camilla Lomholt" email="camilla@indbo.dk" onClick={openMenu} />
	<SidebarGrip expanded onClick={toggle} />
</Sidebar>
```

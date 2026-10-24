---
category: Navigation
---
The whole window: the dark sidebar on the left, and the page beside it with its top bar and content.

## Props

- `children`: only `Sidebar`, `TopBar`, `ShellContent`, `TabBar` and `Fab`, as direct children. Shell sorts them by type, so do not wrap them in a fragment or another component.
- `collapsed`: the sidebar column takes the rail width. Pair it with `<Sidebar variant="rail">`.
- `viewport`: the shell fills the window (the app on a desktop).
- `touch`: the phone shell below 640px wide: top bar, content, tab bar and one `Fab`, with no sidebar. The tab bar and `Fab` are fixed to the window.
- `cover`: on touch only, content that owns the whole screen (the phone search), with the page kept under it.

## Parts

- `ShellContent`: the page's content area. `layout`: `'default'` | `'split'` (a main column and a side panel) | `'rail'` | `'fill'` (one part fills the height, as Ask does).
- `ShellTouch`: a context that is `true` inside a touch shell. A part that changes form on touch reads it.
- `ShellHead`: a context that holds the phone top bar's slot, which a selection bar takes.

## Rules

- Takes no `className` or `style`.
- Any child that is not one of the five parts logs an error and is dropped.
- Collapsing is a change of column width, not an animation.
- In `touch`, the sidebar is not drawn; the tab bar is the way between sections.

## Example

```jsx
<Shell collapsed={false}>
	<Sidebar>
		<SidebarBrand><Mark size="small" fill="solid">S</Mark><span className="sp-strong">Spendly</span></SidebarBrand>
		<NavItem icon="home" current>Home</NavItem>
		<NavItem icon="receipt" count={18}>All orders</NavItem>
		<SidebarGrip expanded onClick={toggle} />
	</Sidebar>
	<TopBar>
		<SearchInput value={text} onChange={setText} placeholder="Search orders, vendors, items…" aria-label="Search orders" kbd={<Kbd>⌘K</Kbd>} />
	</TopBar>
	<ShellContent>
		<Card><span className="sp-section-label">August</span><span className="sp-stat__figure">61.480,00 kr.</span></Card>
	</ShellContent>
</Shell>
```

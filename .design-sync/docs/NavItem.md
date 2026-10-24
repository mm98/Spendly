---
category: Navigation
---
One row in a list of destinations: an icon, a label and a count. Dark in the sidebar, light in a page's own list of views.

## Props

- `variant`: `'default'` (the dark sidebar row) | `'action'` (the green New order row) | `'light'` (a row on a light ground) | `'edited'` (a light row whose saved view has changed) | `'carried'` | `'picked'` (a light row being moved)
- `children`: the label. A long label ends in an ellipsis on one line.
- `icon`: an icon name; `mark` replaces it with any mark
- `count` with `countColor` (`'warning'`): the number at the row's end
- `trail`: content in the count's place (e.g. `<span className="sp-meta">locked</span>`)
- `sub`: a small line in place of a label ("3 more in Orders")
- `current`: the page the reader is on. The marker slides from the last current row to the new one.
- `to`: the row is a link; `onClick` without `to` makes it a button; with neither it is plain text
- `tip`: the label shown on hover while the row's own is hidden (on the rail)
- `control`: a `Switch` at the row's end; the row becomes its label
- `handle` with `handleLabel` (default `'Reorder'`): a grip in the icon's place that moves the row. A row with a handle is drawn inside a `ReorderList`, which moves it.

## Rules

- Takes no `className` or `style`.
- A row in edit mode keeps its height: `handle` takes the icon's slot and `trail` the count's.
- Give a rail row a `tip` and an `aria-label` that includes its count.

## Example

```jsx
<NavItem icon="receipt" count={18} to="/orders">All orders</NavItem>
<NavItem icon="bookmark" count={4} countColor="warning" to="/orders/no-receipt">No receipt</NavItem>
<NavItem variant="light" icon="receipt" current count={142}>All orders</NavItem>
```

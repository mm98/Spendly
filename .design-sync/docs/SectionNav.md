---
category: Navigation
---
The nav beside a page's pane, as on Settings: a heading over light `NavItem` rows, one per section, in a 224px column. The column stays in place while the pane scrolls, and its right edge is the rule between nav and pane.

## Props

- `label`: the heading, such as "Settings". It is drawn in capitals and also names the nav for a screen reader.
- `children`: `NavItem` rows with `variant="light"`, one per section, and `<MenuSeparator variant="divider" />` between groups of rows.

## Rules

- Takes no `className` or `style`.
- Mark the section shown with `current` on its row; the ground slides from the row left to the row reached.
- Put it first in a row, beside the pane it navigates; it stretches to the row's height.
- Below 900px wide the app shows the sections as a select above the cards instead.

## Example

```jsx
<SectionNav label="Settings">
	<NavItem variant="light" to="/settings/account" current>Account and profile</NavItem>
	<NavItem variant="light" to="/settings/appearance">Appearance</NavItem>
	<NavItem variant="light" to="/settings/money">Money, dates and times</NavItem>
	<MenuSeparator variant="divider" />
	<NavItem variant="light" to="/settings/import">Import</NavItem>
	<NavItem variant="light" to="/settings/demo">Demo data</NavItem>
</SectionNav>
```

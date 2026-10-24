---
category: Dates
---
The panel a calendar sits in: a dropdown below a date field, or the frameless scrolling form inside a sheet.

## Props

- `sheet`: the form inside a touch sheet - static, no frame, scrolls (default `false`)
- `open`: written as `data-open` on the panel (default `true`)
- `children`: what the panel holds

## Rules

- Takes no `className` or `style`.
- The dropdown is hidden until its parent carries `data-open="true"`, the way `DateField`'s wrapper does. It hangs 6px under that parent.
- `DateField` and `RangePicker` draw their own calendars; reach for `Calendar` only to hold something of your own in the same panel.

## Example

```jsx
<span data-open="true" style={{ position: 'relative' }}>
	<Calendar>
		<Chip onClick={pickToday}>Today</Chip>
	</Calendar>
</span>
```

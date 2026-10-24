---
category: Utilities
---
A grey placeholder in the shape of content that is still loading: a line of text, a title, a pill, a mark.

## Props

- `shape`: `'line'` (full width) | `'short'` | `'title'` | `'end'` (pushed to the row's end) | `'pill'` | `'mark'` | `'mark-large'` | `'check'` | `'icon'` | `'bar'` (a chart's loading bar, inside `Bars` only) | `'fill'` (fills its box, as inside `Hold`)
- `data-w`, `data-h`: a fixed width and height from the stylesheet's set, e.g. `data-w="74" data-h="18"` for an amount. An `end` skeleton needs a width.

## Parts

- `Hold`: another state of a part laid over its resting form, which stays unseen beneath so the height holds. `shape` is the resting form (e.g. the button or card that will appear); `children` is the state shown over it, usually `<Skeleton shape="fill" />`.

## Rules

- Takes no `className` or `style`.
- It is hidden from screen readers.

## Example

```jsx
<div className="sp-row-flex sp-gap-12">
	<Skeleton shape="mark" />
	<div className="sp-stack sp-gap-6 sp-grow">
		<Skeleton shape="title" />
		<Skeleton shape="line" />
	</div>
	<Skeleton shape="pill" />
</div>
<Hold shape={<Button variant="outline" size="small">Show all 18</Button>}>
	<Skeleton shape="fill" />
</Hold>
```

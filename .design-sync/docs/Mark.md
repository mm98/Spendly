---
category: Utilities
---
The square (or round) box that stands for a record: a vendor's initials, a category's icon, a person, an item's photo, an attached file.

## Props

- `size`: `'small'` | `'medium'` | `'large'` | `'xlarge'`
- `fill`: `'default'` | `'solid'` (painted) | `'plain'` (no ground) | `'photo'` | `'empty'` (no photo yet) | `'none'` (a document, or nothing chosen yet) | `'add'` (the box that adds one)
- `swatch`: paints a solid mark: `'green'` | `'green-2'` | `'green-3'` | `'green-4'` | `'green-5'` | `'amber-ink'` | `'amber-2'` | `'red-ink'` | `'ink-6'`, or a colour value the user picked. The ink on it is chosen to read.
- `round`: a circle, for a person
- `logo`: the shop's place on an offer, two medium marks wide. A logo image as the child sits whole on white; a name as the child fills the box as a vendor mark does
- `goods`: a photo of goods (an item, an order, a bookmark) rather than paper
- `faded`: a vendor's image standing in for a missing item photo
- `count`: a number in the corner, e.g. how many photos
- `text`: a word under the box, e.g. "Receipt", "PDF"
- `danger`: why it failed, in red, e.g. "Too large"
- `remove`: a `MarkRemove` in the corner. A named mark that holds one is read as a group, since an image may hold no control
- `onClick`: makes the mark a button; `as="label"` wraps a file input
- `aria-label`
- `children`: a string is a name: its initials are drawn and, on a solid mark, its colour is derived from it. An element (an `Icon`, an `img`, a `Spinner`) is drawn as it is.

## Parts

- `MarkRemove`: the button in the mark's corner that takes an attachment away. `aria-label`, `onClick`, an `<Icon name="x" />` as its child.

## Rules

- Takes no `className` or `style`.
- A name derives its own colour: do not pass a `swatch` with a string child, or one record shows in two colours in two lists.
- A `swatch` paints only a `solid` mark.
- A mark states what it is (`text`) or why it failed (`danger`), not both.
- Needs a name: a string child, or `aria-label`.

## Example

```jsx
<div className="sp-row-flex sp-gap-12">
	<Mark size="medium" fill="solid">Indbo Møbler</Mark>
	<Mark size="medium" fill="solid" swatch="amber-ink" aria-label="Lighting"><Icon name="lamp" /></Mark>
	<Mark size="xlarge" fill="photo" aria-label="Open the receipt" onClick={open}
		remove={<MarkRemove aria-label="Remove the receipt" onClick={remove}><Icon name="x" /></MarkRemove>} />
</div>
```

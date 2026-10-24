---
category: Navigation
---
The bar a phone form saves from: the state on the left, Discard and Save on the right. It never scrolls away.

## Props

- `children`: a `<span className="sp-subtitle sp-grow">` with the state ("Unsaved changes"), then the leave button and the commit button

## Rules

- Takes no `className` or `style`.
- In a touch `Shell` it is fixed to the bottom of the window and takes the tab bar's place.
- Its buttons keep their own width, so two buttons and the state fit on a phone.
- On a desktop the same commits sit in a sticky `ListItem` instead.

## Example

```jsx
<SaveBar>
	<span className="sp-subtitle sp-grow">Unsaved changes</span>
	<Button variant="outline">Discard</Button>
	<Button>Save</Button>
</SaveBar>
```

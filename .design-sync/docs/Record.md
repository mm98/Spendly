---
category: Lists
---
A record as a card: a strip of photos on top, then the title, chips, a meta line and the amount.

## Props

- `photos`: photo elements (such as `<img>`) for the strip. None draws the empty band.
- `empty`: the text in the empty band
- `faded`: draws the photos faded, as a stand-in for the record's own
- `more`: a count over the strip, such as `'+2'`
- `href` with `hrefLabel`: makes the strip a link out, in a new tab
- `pick`: a control in the strip, such as a `Check` to select the card
- `menu`: `{ open, label, onToggle, onClose, children }`, a menu button on the strip; `children` is the `Menu`
- `title`, `subtitle`: the head's two lines
- `status`: beside the title, such as a `Pill`
- `chips`: `Chip`s in a row of their own
- `headChips`: puts the chips in the head, right of the title, instead
- `meta`: one line, or an array of two
- `amount`: the figure at the foot
- `onClick`: opens the record
- `void`: draws the card faded (a record that does not count)
- `onLongPress`: on touch, a record held still opens its menu: this opens it

## Rules

- Takes no `className` or `style`.
- Clicks on the strip link, the chips and the menu do not open the record.
- Escape closes the menu and gives focus back to its button.

## Example

```jsx
<Record
	photos={[<img key="p" src={photo} alt="" />]}
	title="Indbo Møbler"
	subtitle="SPENDLY-447"
	status={<Pill color="success">Approved</Pill>}
	meta={<span className="sp-subtitle">08/08/2026 · 4 items</span>}
	amount="24.310,00"
	onClick={open}
/>
```

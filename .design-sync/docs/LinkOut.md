---
category: Utilities
---
A name that opens another site in a new tab: the name in its own text role, then the external-link mark. Used for an offer's product name that links to the shop's offer paper or a search on the offer site.

## Props

- `href`: the other site's address
- `label`: where it goes, such as "Netto's offer paper" or "Search on Tilbudsugen". It is the tip on hover and part of the name a screen reader reads
- `nameClass`: the name's own text role, such as `'sp-title'`, or `'sp-chat__file-name sp-truncate'` in a narrow row
- `children`: the name, as text

## Rules

- Takes no `className` or `style`; the name's look comes from `nameClass`.
- Only for links that leave Spendly. A link inside the app is a router link, not this.
- Without an address, write the name as a plain span with the same class.

## Example

```jsx
<LinkOut href="https://netto.dk/tilbudsavis" label="Netto's offer paper" nameClass="sp-title">Arla skyr, 1 kg</LinkOut>
```

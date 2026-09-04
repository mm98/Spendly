---
category: Forms
---
The small pill at the end of a field that says what the number in it is counted in: `kr.` for
money, `pcs` for a quantity. It sits inside the field's border, pushed to the right edge.

## How to compose it

Inside a `FieldShell`, after the input. It never stands on its own.

```jsx
<FieldShell>
  <TextInput id="item-quantity" inputMode="numeric" value={qty} onChange={setQty}
    aria-label="Quantity" />
  <FieldUnit>pcs</FieldUnit>
</FieldShell>
```

`DateInput` builds one for you from its `trail` prop, which is how a date field shows `today`.

## What goes in it

Always the short form — `kr.`, `pcs` — never the word spelled out. It is a unit, not a label:
it says what the number is, and the field's own label says what the number is for.

For money, pass the account's currency symbol rather than a hard-coded `kr.`; the symbol follows
whichever currency the account keeps its ledger in.

The unit never replaces the label. A field showing `kr.` still has a label saying which amount
it holds.

## Props

- `children` — the unit text

## Example

```jsx
<Field label="Price paid" htmlFor="item-price" help="What one piece cost.">
  <FieldShell>
    <TextInput id="item-price" inputMode="decimal" value={price} onChange={setPrice}
      aria-label="Price paid" />
    <FieldUnit>{currencySymbol()}</FieldUnit>
  </FieldShell>
</Field>
```

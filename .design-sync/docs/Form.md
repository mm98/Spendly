---
category: Forms
---
The column a form's fields stand in: one field per row, an even gap between them, and every
child kept from growing wider than the column. Wrap the fields of any form in it.

## How to compose it

Direct children are `Field`s, `FieldPair`s for two fields sharing a row, `FilterSection`s for a
headed group, and a closing `FormActions` holding the buttons.

```jsx
<Form>
  <Field label="Vendor" htmlFor="order-vendor">
    <Combobox id="order-vendor" label="Vendor" value={vendor} groups={vendorGroups}
      onChange={setVendor} onSelect={pickVendor} required />
  </Field>
  <FieldPair>
    <Field label="Date" htmlFor="order-date">
      <DateInput id="order-date" label="Order date" value={date} onChange={setDate} />
    </Field>
    <Field label="Status" group>
      <Segmented options={orderStatuses} value={status} onChange={setStatus} label="Status" />
    </Field>
  </FieldPair>
  <FormActions>
    <Button variant="caps compact" onClick={save}>SAVE ORDER</Button>
    <Button variant="ghost compact" onClick={cancel}>CANCEL</Button>
  </FormActions>
</Form>
```

## wide

`wide` is `true` by default and lets the form fill whatever column it is in — the shape a form
inside a card uses. Pass `wide={false}` to cap it at 640px, for a narrow form standing alone on
a page, such as sign-in or register.

## What it does not do

It is a layout column, not a `<form>` element and not a validator. It submits nothing; the
buttons in `FormActions` carry the actions. Validation is `useFieldErrors`, and every rejection
is drawn by the `Field` it belongs to — never as a summary at the top of the form and never as a
toast.

## Ordering the fields

Required fields first, in the order a person would answer them, then the optional ones as plain
rows at the foot. A field carrying the longest string on the form — a name, a vendor, a link —
takes a row of its own rather than half of a `FieldPair`.

## Props

- `wide` — default `true`
- `children` — the rows of the form; anything else is spread onto the element

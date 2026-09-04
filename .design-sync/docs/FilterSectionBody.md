---
category: Forms
---
The half of a `FilterSection` that a control above it shows and hides. Use it for fields that
only make sense once something has been turned on, and for nothing else — a section whose
fields are always there needs no body around them.

## Why it exists

`FilterSection` is a grid, and its 14px gap is what stacks its fields. Wrapping the optional
ones in a plain `div` takes them out of that grid, and they come back with nothing between
them. `FilterSectionBody` is that same grid, so the fields inside it stack exactly as the ones
above them do.

## How to compose it

The control that owns the fields comes first, then the body it owns.

```jsx
<FilterSection>
  <span className="panel-heading">Delivery</span>
  <CheckRow id="order-was-delivered" checked={arrived} onChange={setArrived}
    label="It has arrived"
    help="Turn this on to record when the order was delivered and what the delivery cost." />
  <FilterSectionBody id="order-delivery-fields" hidden={!arrived}>
    <FieldPair variant="field-pair-keep">
      <Field label="Delivered date" htmlFor="order-delivered-date">…</Field>
      <Field label="Delivery cost" optional htmlFor="order-delivery-cost">…</Field>
    </FieldPair>
  </FilterSectionBody>
</FilterSection>
```

## Closing it

`hidden` is the whole mechanism. The fields keep their values and take no height, so turning
the control back on puts them back exactly as they were and moves nothing above them.

Give the body an `id` and name it in the controlling element's `aria-controls`, so what the
control opens is stated rather than implied.

## Props

- `children` — the optional fields
- `id` — for the controlling element's `aria-controls`
- `hidden` — closed

## Note

No screen in the app draws one today; it is kept because the shape is the design system's
answer to optional fields, and a second copy of that grid invented in a page is the drift this
component prevents.

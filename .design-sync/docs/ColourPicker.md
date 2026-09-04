---
category: Forms
---
The row of eight filled swatches a category's or a vendor's colour is chosen from, with the
platform's own colour dialog at the end of it for anything else. It is the only colour control
in the app.

## How to compose it

A row of buttons, so its `Field` takes `group` — a `<label>` around several buttons labels only
the first of them.

```jsx
<Field label="Colour" group
  help="Pick one of the eight colours shown, or choose any colour in the last box.">
  <ColourPicker value={values.colour} onChange={colour => setValues(v => ({ ...v, colour }))}
    label="Category colour" />
</Field>
```

## Which palette

Two are exported beside the component, and they are not interchangeable:

- `CATEGORY_COLOURS` — the default. The system's own eight: Red, Yellow, Purple, Blue, Orange,
  Green, Teal, Slate. A category coloured red is the same red as the donut's.
- `VENDOR_COLOURS` — the darker end: Pine, Clay, Ocean, Amber, Violet, Indigo, Forest, Rust. A
  vendor's tile is two white letters on a solid fill, which needs the deeper values.

Pass `colours={VENDOR_COLOURS}` on a vendor form. Eight is what the row is drawn for.

## The value

A hex string, `#14AC72`. That is what the record stores and what `onChange` hands back, from a
swatch or from the platform dialog alike. A `var(--token)` reference is read off the stylesheet
if one reaches it, but nothing should store one: a token means nothing outside a browser with
this app's stylesheet loaded.

A value that is not one of the eight rings no swatch. The last box is filled with it instead
and carries a pencil, and the line beside the row reads the hex back with what the glyph on top
of it will measure — `#6C3A8E • icon contrast 8.0:1`.

## What it decides for you

The ink on top of the colour. Whatever is chosen, the glyph or the initials are inked black or
white by whichever reads better on it, so an open picker cannot produce a tile whose contents
have vanished. You never pass an ink colour.

## Props

- `value` — the chosen hex
- `onChange(hex)` — gets the hex string
- `colours` — `[{ id, label }]`, default `CATEGORY_COLOURS`
- `label` — the accessible name of the row, e.g. "Vendor colour"

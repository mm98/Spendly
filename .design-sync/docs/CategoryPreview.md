---
category: Forms
---
The live row beside the category form, drawn exactly as the category list will draw it. Use it
wherever a form asks for a colour and a glyph, so the answer can be seen at the size it is used
at rather than guessed from two controls.

## How to compose it

It belongs in the rail card that mirrors the form, inside the list container the real row sits
in:

```jsx
<Card aria-label="Category summary">
  <CardBody>
    <div className="card-subheading">Category summary</div>
    <span className="section-label">How it will look</span>
    <div className="category-rows summary-preview">
      <CategoryPreview icon={values.icon} iconPath={values.iconPath}
        colour={values.colour} name={values.name} />
    </div>
  </CardBody>
</Card>
```

Feed it the form's own draft values, not the saved record — the point of it is to move as the
form is filled in.

## What it draws

The coloured tile with the glyph on it, the name, and one fixed muted line: "how it will look
in the list". The row is inert — nothing in it can be clicked, and it takes no `to`.

An empty name draws "Your category", so the row keeps its shape while the name is still being
typed rather than collapsing to an empty line.

## icon and iconPath

- `icon` alone works for one of the app's own named glyphs (`cart`, `home`, `tag`).
- `iconPath` is the SVG path the record stored when a Tabler icon was chosen, and it wins over
  the name. Pass both, exactly as `IconPicker` handed them back.

The ink on the glyph is picked from `colour`, so a pale fill still shows what is on it. You
never pass an ink colour.

## Props

- `icon` — the glyph's name
- `iconPath` — the stored path, for a glyph from the catalogue
- `colour` — the tile's fill, a hex string
- `name` — the category's name; empty draws "Your category"

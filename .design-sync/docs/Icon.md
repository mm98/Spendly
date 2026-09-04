---
category: Layout
---
Every glyph in the app, drawn from one registry. `<Icon name="receipt" />` is the only way to
put a glyph on screen — no inline `<svg>`, no copied path.

The names are the keys of `ICONS`, exported from the same module. A name that is not one of
them **throws**, so a typo fails loudly rather than drawing an empty box. The full set:

`receipt` `home` `store` `tag` `chart` `chevronLeft` `search` `scan` `plus` `chevronRight`
`pencil` `check` `cart` `plug` `display` `trendUp` `bolt` `sparkles` `settings` `document`
`chevronDown` `starFilled` `calendar` `close` `photo` `grip` `cube` `trash` `reorder` `undo`
`alert` `dots` `filters` `star` `discount` `upload` `camera` `eye` `trendDown` `download`
`textScanAi` `archive` `externalLink`

## Size is not yours to set

Stroke, cap, join and size all live in the stylesheet, keyed to where the icon sits: 15px in
a button, 14px in an `icon-button` or a chevron, 17px in a row's tile, 13px in a chip. Put
the icon in the right place and it comes out the right size. Do not pass a width, a height or
a `style` to correct one.

Most components take an icon by name rather than taking an `Icon` — `Button`'s `icon` and
`iconAfter`, `IconButton`'s `icon`, `EmptyState`'s `icon`, `ItemRow`'s `thumb`. Prefer those
over placing an `Icon` yourself.

## `path`, for a glyph the registry does not have

A category may be given any of Tabler's 5,129 outline icons, and the record stores the path
string it chose. `path` draws that directly and wins over `name`, so a list of categories
costs no catalogue download.

```jsx
<Icon name={category.icon} path={category.iconPath} />
```

## Labelling

Without `title` the svg is `aria-hidden`, which is right for a glyph beside its own words.
Pass `title` only when the glyph stands alone and carries meaning nothing near it repeats.

## Props

- `name` — a key of `ICONS`
- `path` — an SVG path `d`, drawn instead of `name`
- `className` — defaults to `"icon"`, the class that sizes and strokes it; `""` opts out
- `title` — makes it a labelled image
- anything else is spread onto the `<svg>`

## Related

`ImageOrIcon` when a real picture may exist and the glyph is the fallback.

---
category: Forms
---
The grid a category's glyph is chosen from: a search field over a scrolling grid of tiles,
backed by the whole Tabler outline set (5,129 icons). Use it wherever a record carries a glyph
of its own.

## How to compose it

A grid of buttons, so its `Field` takes `group`.

```jsx
<Field label="Icon" group>
  <IconPicker value={values.icon} usedIcons={usedIcons}
    onChange={(icon, iconPath) => setValues(v => ({
      ...v, icon, iconPath: ICONS[icon] ? undefined : iconPath
    }))}
    label="Category icon" />
</Field>
```

## What the grid shows

Before anything is typed: the icons this account's categories already carry — real choices
another category made, not the app's own chrome. That is `usedIcons`, one `{name, path}` per
icon, deduplicated, built by the caller from its own records. Each one carries the path the
record stored, so the opening view draws without fetching anything.

Once something is typed: the names that contain it, capped at 240 tiles, with the line under
the grid saying how many of the 5,129 matched. With no `usedIcons` and nothing typed the grid
draws one sentence instead: "No category has an icon yet — search to pick one."

## Why onChange hands back two things

`onChange(name, path)` — the record stores both. The name is what the summary reads back and
what a later search matches; the path is what every row, ring and list that draws the category
needs, so none of them has to load the catalogue. Store `iconPath` only for an icon that is not
already one of the app's own named glyphs.

## What it decides for you

The catalogue's loading. Names arrive on first render, and a search fetches only the shards
holding the icons about to be drawn. A tile whose path has not arrived yet holds its size and
refuses the click — an icon that cannot be seen is not a choice that can be made. Nothing about
that is the caller's to arrange.

## Props

- `value` — the chosen icon's name
- `onChange(name, path)`
- `usedIcons` — `[{ name, path }]`, the icons already in use; the grid's opening view
- `label` — the accessible name of the grid, default "Icon"

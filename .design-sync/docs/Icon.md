---
category: Utilities
---
One glyph from Spendly's icon register, by name. Its colour is the ink of what it sits in.

## Props

- `name` (required): a name in the register
- `size`: pixels, default `16`. State it only where the design asks for another size (e.g. `13`, `14`, `20`).

## Where the names come from

- `react/src/components/icons.js` is the register: Tabler outline icons, unmodified. `Icon`, and every `icon`, `iconStart` and `iconEnd` prop, reads only from it. An icon not there is not in the app; add one from Tabler by name, never by drawing a path.
- The register holds: alert-circle, alert-triangle, archive, armchair, arrows-join, bookmark, browser, building-store, bulb, calendar, camera, category, chart-bar, check, chevron-down, chevron-left, chevron-right, chevron-up, clock, copy, device-desktop, diamond, dots-vertical, download, external-link, eye, file, file-text, filter, flower, grip-vertical, heart, help-circle, home, info-circle, key, keyboard, lamp, layout-grid, link, lock, mail, message-circle, minus, moon, note, paperclip, pencil, photo, plus, power, receipt, refresh, search, settings, shopping-bag, star, sun, tag, trash, upload, user, wallet, wifi, x.
- Common in the app: `plus` (add), `x` (clear, close, remove), `trash` (delete), `pencil` (edit), `dots-vertical` (a row's menu), `chevron-right` (goes somewhere), `chevron-left` (back), `chevron-down` (opens), `check` (done), `search`, `calendar`, `alert-circle` (a problem), `external-link`, `download`, `copy`.
- `react/src/components/tabler.js` is the whole Tabler outline library, loaded in parts when first drawn. It is only for the icon a user picks for a category; `Icon` does not read it.

## Rules

- Takes no `className`, `style` or colour: it takes the ink of its parent.
- A name not in the register logs an error and draws nothing.
- Props of other components that take an icon take it as an element (`<Icon name="lamp" />`); `iconStart`, `iconEnd` and `IconButton`'s `icon` take the name.

## Example

```jsx
<Icon name="receipt" />
<Mark size="medium" fill="solid" swatch="amber-ink" aria-label="Lighting"><Icon name="lamp" /></Mark>
```

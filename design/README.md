# Handoff: Settings passkeys, row heights and stacked pairs

## Overview

Fixes from a review of Settings, plus one system-wide fix it turned up. Nothing new is added; every change is a correction to something that already exists. The Settings section nav divider (static, does not scroll) was handed off separately and is included in `styles/pages/settings.css` again here.

## About the design files

The `.dc.html` files are design references built in HTML, not production code. Recreate the changes in the existing React app with its components. Open the pages in a browser from this folder; they load `support.js` and `styles/`.

## Fidelity

High fidelity. Every value is an existing token. `styles/components.css` is the source of truth for the classes named below.

## Changes

### 1. A title with its second line is `.sp-stacked` (2px) - system-wide

A name with one metadata line under it is one block, `.sp-stacked`, gap `--sp-2` (2px). 16 pairs were still built as `sp-stack sp-gap-6` (6px):

- Settings: Passkeys (2), Previous imports (2), the import result
- Components: file and record specimens (6)
- Order create: Compare with receipt header
- Order editing layouts: Edit order header (2)
- Typography: two specimens

In the app, any title-and-second-line stack that uses a 6px gap should use the `Stacked` component (2px). A card body (a heading over a sentence, a control, several lines) stays 6px.

### 2. Pair names are `.sp-title`, not `.sp-strong`

On Settings, the Passkeys and Previous imports names were the weight utility, which inherited 16px with normal line height, so the pair looked loose even at 2px. They are now `.sp-title` (14px, 600). Second line stays `.sp-meta`.

### 3. A button beside an input is the input's height

A button on the same line as a text field is the default button, 42px (`--control-h`), never the 34px small button (`--btn-h-small`).

- Status rename row (Settings, Statuses): Cancel and Save are default buttons.
- Passkey rename: now drawn, on the 1Password row. The row becomes `[name field, grows] [Cancel] [Save]`, the same as renaming a status. Enter saves, Escape cancels.

Small buttons remain right for actions in card headers and rows next to text (Rename, Remove, Add a passkey).

### 4. Rename does not shift the layout

- **Passkeys card:** each row is 42px (`min-height: var(--control-h)`) at rest and while renaming. At rest the name and date line centre in it; on Rename the field and buttons fill it. Lock the row's height, not its content: a row sized by its text grows 3px when the field appears. Settings only (`.st-pk-row`).
- **Status rows:** `.sp-list-item--editable`, a variant used on Settings only. Fixed height `calc(var(--control-h) + var(--sp-8))` (50px), `padding-block: 0`, `box-sizing: border-box`, content centred. At rest and in edit mode the row is the same height; before, edit mode jumped from 49px to 67px.

### 5. Settings section nav separator

The separator in the Settings section nav uses `--line-3`, the nav divider's colour, via `.sp-menu__sep--divider`. Every other menu keeps `--line-2`. Settings only.

### 6. Menu items truncate - system-wide

Every `.sp-menu__item` label truncates on one line with an ellipsis (`min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the label span). Before, only the record menu did. This matches production.

## Files

- `Settings and import.dc.html` - 11a Settings: Passkeys (rename state, notes), Statuses, Previous imports, section nav
- `Components.dc.html`, `Order create.dc.html`, `Order editing layouts.dc.html`, `Typography.dc.html` - stacked pairs
- `styles/components.css` - `.sp-menu__sep--divider`, `.sp-list-item--editable`, `.sp-menu__item > span` truncation
- `styles/pages/settings.css` - `.st-pk-row`, `.st-subnav` sticky
- `styles/COMPONENT-STATUS.md` - change log, 2026-10-15 entries
- `styles/check.js` - three new assertions: a pair is `.sp-stacked`, a pair starts with `.sp-title`, a button beside an input matches its height
- `support.js`, `icons.js` - needed to open the pages

# Spendly - changes since handoff_2026_10_14_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes and handoff_2026_10_14_changes applied. This answers brief 38: every fade is a named strength, one per meaning, on a four-step scale. The files are design references; the app copies `tokens.css` and `components.css` over and sets its own four fades from the same tokens.

## 1. The fade scale (styles/tokens.css)
- Four steps, named by value like the spacing scale, and nothing between them:
  - `--fade-20: 0.2;`
  - `--fade-40: 0.4;`
  - `--fade-60: 0.6;`
  - `--fade-80: 0.8;`
- A part never reads a step directly. It reads a meaning, and each meaning names one step:
  - `--fade-disabled: var(--fade-40);` - a control that cannot be used
  - `--fade-inactive: var(--fade-60);` - a row or card that no longer counts
  - `--fade-standin: var(--fade-60);` - a picture standing in for a missing one
  - `--fade-icon-tone: var(--fade-40);` - the light part of a two-tone icon
  - `--fade-photo: var(--fade-80);` - an item photo's tone, both themes
  - `--fade-redacted: var(--fade-20);` - the bar that hides an amount
- Why inactive sits one step above disabled: a cancelled order's figures are still read; a disabled control is only passed over.
- `--photo-fallback-opacity` is removed. `--fade-standin` replaces it.
- Not fades, and unchanged: shadow and overlay alphas in the theme tokens, and fades that only switch a part fully on or off (0 and 1).

## 2. Every fade, before and after
- Cannot be used, `--fade-disabled` (0.4):
  - `.sp-switch:disabled`, `.sp-btn:disabled`, `.sp-icon-btn:disabled` - 0.4, unchanged
  - `.sp-menu__item:disabled`, `.sp-combobox__option:disabled` - was 0.45
  - `.sp-input:disabled`, `.sp-textarea:disabled` - was 0.6
- Not active, `--fade-inactive` (0.6):
  - `.sp-table tbody tr[data-void="true"] > td:not(.sp-col-status)`, `.sp-record[data-void="true"]` - 0.6, unchanged
  - `.sp-muted` - was 0.5
  - The open states from brief 37 (`opacity: 1`) are unchanged.
- Stand-in picture, `--fade-standin` (0.6):
  - `.sp-record__photo` (the hatch) - was 0.5
  - `.sp-mark--photo.sp-mark--faded`, `.sp-record__photo--faded` - `filter: opacity(var(--fade-standin))`, was `var(--photo-fallback-opacity)` at 0.6. Still a filter, so it compounds with a cancelled row's fade (0.6 x 0.6).
- Hidden amount, `--fade-redacted` (0.2):
  - `.sp-redacted` - was 0.18

## 3. In the app (same pass)
- `app.css`, the photo uploading under its spinner, `.sp-mark--photo:has(> .sp-spinner) img`: `opacity: var(--fade-disabled);` (was 0.6). It takes the dim a disabled control takes, which now exists as one value.
- `app.css`, item photo and thumbnail tone (`.sp-mark--goods`, `.sp-mark--photo`, `.sp-record__photo`): `opacity: var(--fade-photo);` in both themes (was 0.92 light, 0.9 dark). The light and dark rules become one rule. Full strength on hover and in the viewer, as before.
- `app.css`, the line that sets the hatch stand-in back to 1 when a real picture is there: unchanged.
- `react/src/components/Icon.jsx`, the `~` mark's light part: `opacity: var(--fade-icon-tone)` (was 0.5).
- Nothing else in the app writes an opacity between 0 and 1. If one turns up, it takes the meaning token it belongs to; a new meaning gets a new token pointing at one of the four steps.

## 4. What looks different
- Disabled fields, menu items and options are fainter (0.6 / 0.45 to 0.4) and now match buttons and switches.
- `.sp-muted` rows and the hatch stand-in are slightly stronger (0.5 to 0.6).
- Two-tone icons have a lighter second tone (0.5 to 0.4).
- Photo tone 0.92 / 0.9 to 0.8, and the hidden-amount bar 0.18 to 0.2: compared side by side, no visible difference.

## 5. Notes in the design
- Components c-list: a cancelled record drops to `--fade-inactive`. c-menu: disabled items hold their place at `--fade-disabled`, the same as every disabled control. c2: the faded photo reads `filter: opacity(var(--fade-standin))`.
- Images and files: thumbnails render at `--fade-photo` in both themes; a cancelled row's thumbnail dims at `--fade-inactive`; the vendor image's fade names `--fade-standin` and `--fade-inactive`.
- Dark mode and image viewer 12a: thumbnails render at `--fade-photo` (0.8), the same as on light.
- Order list: a cancelled row renders at `--fade-inactive`.
- `styles/COMPONENT-STATUS.md` records the change.

## 6. Check (styles/check.js)
- No literal opacity between 0 and 1 in any stylesheet, as a property or as `filter: opacity()`.
- The scale is `--fade-NN` at NN/100, its steps at least 0.15 apart; every other `--fade-*` token is `var(--fade-NN)`; no part reads `--fade-NN` directly; `--photo-fallback-opacity` is gone.
- No page note states a fade as a number (`opacity 0.6`, `0.45 opacity`, `90% opacity`).
- Clean: 0 findings across 26 pages.

## Files
- styles/tokens.css
- styles/components.css
- styles/check.js
- styles/COMPONENT-STATUS.md
- Components.dc.html
- Images and files.dc.html
- Dark mode and image viewer.dc.html
- Order list.dc.html

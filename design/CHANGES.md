# Hiding a password runs the other way from showing it

Answers "Brief: hiding a password runs the other way from showing it", and settles one later.md entry.

## 1. Hiding settles right to left

- **The problem:** tapping the eye turned dots into letters from left to right, and tapping it again turned letters back into dots also from left to right, so hiding did not read as showing undone.
- **What changed:** showing stays left to right. Hiding settles right to left: the last letter turns into a dot first, the first letter last. Duration, pace and passing glyphs are unchanged (2 x `--motion-in`, linear). Reduced motion is unchanged: the field turns at once, with no shuffle.
- **Where:** `react_handoff/Inputs.jsx`, `PasswordField`: `const n = target.length` and `const at = next ? (i + 1) / n : (n - i) / n`, with its comment. App: the same lines in the app's `PasswordField`; through it `pages/SignIn.jsx`, `pages/Register.jsx`, `pages/SettingsAccount.jsx`, `pages/SettingsPasskeys.jsx`, `pages/AccountLinks.jsx`, `app/SessionDialog.jsx` and `storybook/stories/Inputs.stories.jsx` all follow with no change of their own.
- **What is still open:** nothing.

## 2. The shuffle comment names both directions

- **The problem:** the comment above `.sp-input--shuffling` did not say which way the letters settle.
- **What changed:** it now reads that showing settles left to right and hiding right to left, so hiding is showing played backwards. Comment only; no rule changed.
- **Where:** `styles/components.css`, the comment above `.sp-input--shuffling`. App: the same comment in the app's copy of components.css.
- **What is still open:** nothing.

## 3. later.md: "A tall shop logo is cut at the bottom of its mark"

- **The problem:** a logo taller than the mark's shape, such as Rema 1000's, showed only its top half on Ask's offer rows. The image's `height: 100%` had nothing to resolve against in the mark's grid.
- **What changed:** the design takes the app's rule into the component: `grid-template: minmax(0, 1fr) / minmax(0, 1fr)` on `.sp-mark--logo:has(> img)`, so every logo is drawn whole and centred.
- **Where:** `styles/components.css`, `.sp-mark--logo:has(> img)` (`Components` c2). App: remove the override from `react/src/styles/app.css` and remove this entry from later.md.
- **What is still open:** nothing.

## later.md entries not settled here

- "A deleted record should not be removed for good at once": the "Recently deleted" place is left for a later task, by the user's choice.
- "Large accounts still make everyone wait on a few pages" and "The status guard does not run in project threads" are not design work.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `react_handoff/Inputs.jsx` - `PasswordField` with the new hiding order.
- `styles/components.css` - the shuffle comment and the logo mark's grid track.
- `Components.dc.html` - owns `.sp-mark--logo` (c2); only its components.css version changed.
- `React components.dc.html` - shows `PasswordField`; only its components.css version changed.
- `support.js`, `components.js`, `icons.js`, `assets/shop-logo.svg`, `styles/tokens.css`, `styles/doc.css` - what those pages load to open from this folder.

## styles/check.js

0 finding(s) across 27 pages.

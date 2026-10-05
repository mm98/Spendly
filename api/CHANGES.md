# Spendly - changes since handoff_2026_10_05h_changes

Copy these files over handoff_2026_10_05h_changes.

## 1. Tab bar over the home bar band (new variant, `.sp-tabbar--band`, brief 28)

- New token `--home-band: env(safe-area-inset-bottom, 0px)` in tokens.css: 34 on an iPhone in portrait, 0 without a home bar.
- `.sp-tabbar--band`, beside `.sp-tabbar`: `padding-top: min(var(--sp-12), var(--home-band))`, `padding-bottom: max(0px, var(--home-band) - var(--sp-12))`. The bar takes the band in, and its items sit 12 lower than centred.
- Without a band both paddings are 0, so the bar is unchanged. Every tab bar now carries the class: Components (1), Mobile screens (11), Navigation shell (1).
- `.sp-tabbar` itself is unchanged.
- Documented in Components beside the tab bar (specimen "Touch - 375px, home bar band (34)"), drawn with `.doc-home-band` (doc.css), which sets `--home-band: 34px` on the frame.
- Mobile screens, shell notes: the brief 28 note beside the tab bar note, pointing to the class.

## 2. Not changed

- The + button keeps its offset. With the band it stands 23 above the tab bar, not 12. To keep 12 on such a phone, change the button's offset, not the bar.

## 3. Check

- `styles/check.js` is unchanged. Clean run: 0 findings across 26 pages.

## Files
- Components.dc.html - band specimen, class on the tab bar
- Mobile screens.dc.html - shell note, class on 11 tab bars
- Navigation shell.dc.html - class on the tab bar
- styles/tokens.css - `--home-band`
- styles/components.css - `.sp-tabbar--band`
- styles/doc.css - `.doc-home-band`
- styles/COMPONENT-STATUS.md - change log entry

# Spendly - fields on touch are 16px

Copy these files over handoff_2026_10_08_full_fixed.

**Fixed: the phone zoomed in when the category picker in a bookmark took focus** (iPhone 15, iOS 27). On touch only `.sp-input` was raised to 16px. The add field of a tokens field, which the category picker types into, took the tokens field's 14px, and iOS zooms the page in on focus for any field under 16px, then leaves it zoomed. The textarea, the palette's search and a cell input had the same gap.

- components.css: one rule, last in the file: on `.sp-touch`, `.sp-input` (including a cell input), `.sp-textarea`, `.sp-tokens__add`, `.sp-palette__term` and `.sp-stepper__value` are `--t-16`, the text and the placeholder. 16px on touch was already the settled field size; this applies it to the fields it missed. Nothing changes on desktop.
- Components, Notes for implementation (the opening section): the rule, and why the viewport must not be used to stop the zoom (`maximum-scale=1` and `user-scalable=no` take pinch zoom away from everyone).
- CLAUDE-CODE-PROMPT.md: rule 10 says the same.
- check.js: the touch rule must exist and name every typed field. checks.html: any typed field inside a touch frame rendered under 16px is a finding.
- check.js: 0 findings across 26 pages.

In the app: make sure the picker field gets the touch class. If a page under 640px does not carry `.sp-touch`, this rule does not reach it, and the zoom stays.

## Files
- styles/components.css
- styles/check.js
- checks.html
- Components.dc.html
- CLAUDE-CODE-PROMPT.md

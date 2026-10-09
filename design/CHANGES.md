# Spendly - known problems: Statistics text, Forgot it?

Copy these files over handoff_2026_10_09e_changes_fixed. Remove the two matching entries from Problems and adjustments.

## Statistics: old text tied cards to a month (Order statistics, Mobile screens)
- 4a and 4g: the note "By category, Top vendors and Monthly limit show the current month" is removed. Two notes now call the card Limits.
- 4c (2026, one category): Against the limit reads "62.400 / 64.000", "2026, under" - the period's spend against the limit (8.000 kr. a month) times the months so far, matching the Spend card.
- 4c: By month, against the limit draws every month up to today, newest first: August to January, eight rows. Its meta reads "limit 8.000 kr. a month". Past months have their marker at the end; August, the current month, at the pace. No "Show all N months" button, since the period has exactly eight months. Spend by month's bars are redrawn to the same values.
- 7a: both "Top vendors, August" headings read "Top vendors".

## Forgot it? put the Password field 2px lower (Auth and first run, 20a)
- New: `.sp-field__head` in components.css. A label row with a small action at its end, as tall as the label's own line (font-size 12, height 1lh). The 22px xsmall button stands centred on it and overhangs it.
- The three Password label rows in 20a use it in place of sp-row-flex sp-baseline. The field is now 24px under the label, as under Email. On a phone nothing changes: the button sits under the field.
- The app's sign-in page needs the same class on its Password label row.

## Not changed
- The order editor's four zero-width loading boxes: the design draws no loading state for the order editor, so the fix is in the app. Each box needs a width from its row.

## Checks
- 0 finding(s) across 26 pages.

## Files
- styles/components.css
- Auth and first run.dc.html
- Order statistics.dc.html
- Mobile screens.dc.html

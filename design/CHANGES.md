# Spendly - changes since handoff_2026_10_07f_changes_fixed

Copy these files over handoff_2026_10_07f_changes_fixed.

## Answer to "phone top bar: Back and title, or search only?"
Yes, a screen one level down on a phone has Back and a title. The drawings were right; the rule text was wrong.

- Places (the four destinations and anything inside them) keep the search-only top bar and the tab bar, at every width.
- On a phone, a screen one level down swaps the search bar for Back and a title:
  - a record's own page (Mobile screens, order and vendor frames)
  - a record in create or edit (Order editing layouts 1c)
  - the scan review (Order create 3a, Mobile screens "Check the reading")
  - the receipt comparison (Order create 3d, specimen 4)
- This is the same list of screens that already drops the tab bar (Navigation shell, tab bar note).
- Search is not offered inside these screens. It is one Back away, and the task ends first, as with the tab bar.
- On 3d, Back is Cancel: the file stays attached and nothing else changes.
- Desktop is unchanged: the search bar on every screen.

## Changes
- Navigation shell: the top bar note now states the rule above.
- Mobile screens: the shell note now states the rule above. The three back buttons were labelled "Action"; they are now labelled "Back".
- Order create 3d: the Top bar note points to the rule.
- styles/check.js: new rule "Back is labelled Back". Run against the previous Mobile screens it flags 3 buttons.

## Check
- 0 findings across 26 pages.

## Files
- Navigation shell.dc.html
- Mobile screens.dc.html
- Order create.dc.html
- styles/check.js

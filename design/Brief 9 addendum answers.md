# Brief 9 addendum answers

1. Filters and Sort in one card: `.sp-list-item--card > .sp-combobox--grow { flex: 1 1 0; min-width: 0; }` takes the spare width; any other combobox in the card is `flex: none` and keeps its content width. Filters carries `sp-combobox--grow`. 7a, 7b and every phone drawing use it.
2. The 880 table comes first. The tables become cards at a list column of 640px or less, the order list's rule (2i). The 5a/5d note is corrected; the edit page's rail still stacks below 900px.
3. "click to narrow down" and "click to narrow further". The crumb row's accessible name is "Showing", the card's own name. 4a, 4b, 19a and Components corrected.
4. `.sp-menu__item > svg { flex: none; }` is in components.css.
5. The account menu row reads "Shortcuts". The sheet it opens keeps the title "Keyboard shortcuts". 9c and Actions inventory updated.
6. `.sp-line-editor .sp-mark` is `--mark-medium`, 42px.
7. The year is the compact control `sp-combobox--bare`: the value and its chevron with no field box, 4px padding and gap. It saves 30px, so the one bar fits 328px. 7a drawn and noted.
8. `a.sp-menu__item { text-decoration: none; }` is in components.css.
9. The phone gets arrows: `sp-window--select`, the 21a window with the period select in its middle, taking the row's width. The arrows step by the period's own length; Later is disabled on the period that holds today; both are disabled on Custom. 7b drawn and noted.

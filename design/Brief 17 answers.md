# Brief 17 answers

1. `.sp-stats` gets a variant, `.sp-stats--fold`: four across while the row is at least 996px wide, two by two below it.
   - 996 is four stats of 240 plus three 12px gaps. On Statistics the row is 998 in a 1280 shell, so it folds as soon as the shell is narrower.
   - It answers to the row's own width, not the window, with a `clamp()` on the column minimum, so no wrapper or container is needed. The row is always four or two, never three over one.
   - Statistics' three stats rows carry the variant. A specimen at 880 is drawn under 4a.
   - On a phone every stats row is two by two: `.sp-touch .sp-stats`. This covers the import figures. The desktop import figures stay four across, as drawn.
   - Both rules are component rules in `styles/components.css`, so the app's rule outside the layer can go.
2. An empty handle column takes no cursor change: `.sp-list-item__handle:empty { cursor: auto; }`. The handle on a closed row keeps `grab`. Budget 21d's note says so.

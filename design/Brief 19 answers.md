# Brief 19 answers

1. Yes: `--card-min-w: 280px` in `tokens.css`. `.sp-cards--fluid` reads it: `repeat(auto-fill, minmax(min(var(--card-min-w), 100%), 1fr))`. The `min(..., 100%)` lets a single card take the full width below 280px instead of overflowing.
2. No maximum. At 280 a card grows to under twice that before another fits, so a cap is not needed.
3. Every card grid in the app is `.sp-cards--fluid`: Order list 2c, Bookmarks 22a (both grids) and the phone Bookmarks frame in Mobile screens now carry it, and Responsive reference shows the token.
   - One column below 572px (two cards and one gap), not 640. Two columns from 572. This is the grid's own behaviour, with no query.
   - The four-across `.sp-cards` base and its two container queries are unchanged; no page in the app draws them now.

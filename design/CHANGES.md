# Spendly - a domain longer than its line

Copy these files over handoff_2026_10_09c_changes.

## .sp-email-line - what gives, in order
1. The part before the @ shortens first, down to its first three characters and the ellipsis (`__local`: flex-shrink 100000, min-width 4ch).
2. Only then does the @domain shorten, from its end (`__domain`: flex 0 1 auto, min-width 0, ellipsis). Example: mik...@a-rather-long-company-na...
3. The line never runs out of its box (`.sp-email-line`: max-width 100%, overflow hidden). Nothing runs under the phone card's chevron or over the page beside the sidebar, and Settings' Email field no longer scrolls the phone page sideways.

This matches what the app already does. An email that fits looks as before.

## Docs
- Navigation shell 9c: the account block note and the truncation table state the order above.

## Checks
- 0 finding(s) across 26 pages.

## Files
- styles/components.css
- Navigation shell.dc.html

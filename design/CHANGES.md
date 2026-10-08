# Spendly - changes since handoff_2026_10_08c_changes

Copy these files over handoff_2026_10_08c_changes. Answers to Brief 32 (drafts of orders made by hand, and two faults on Home) are in Brief 32 answers.md.

## Changes
- Order create 3a: new notes group "An order made by hand is a draft from its first change": when it starts, leaving keeps it with "Kept in Drafts", reopening, Discard. 3b: a copy is a draft from its first change.
- Duplicate and alerts 8a: Duplicate is a draft from its first change, Create creates it.
- Actions inventory: New order, Copy an order and Duplicate follow the draft rule; no leave confirm on a new order.
- Home 10a: Drafts rows put what is left to check before the file name. New state 5: a copy, an empty order and a long file name. Notes for the hand-made row.
- Mobile screens 7a: notes on the hand-made Drafts row and on the card head link.
- components.css: a text link in a card's head keeps its 34px box on touch and below 640px, with a 48px hit area, so the head does not grow.
- check.js: two new assertions, for both faults.

## Check
- 0 findings across 26 pages.

## Files
- Home.dc.html
- Mobile screens.dc.html
- Order create.dc.html
- Duplicate and alerts.dc.html
- Actions inventory.dc.html
- styles/components.css
- styles/check.js
- Brief 32 answers.md

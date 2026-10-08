# Spendly - changes since handoff_2026_10_08c_changes (fixed)

Fixed (Brief 33): on a phone a card's title row was still 34px with a link and 17px without, so the name sat 9.5px lower in Drafts and Recent orders. The head link now carries `margin-block: calc(34px / -2)`, so its 34px box takes no height in the row. Measured under `.sp-touch` at 375px: both heads 16.7px, the name 16.7px below the card's top edge with or without a link. The 48px touch area is unchanged. Answers in Brief 33 answers.md. Replaces handoff_2026_10_08d_changes.

Copy these files over handoff_2026_10_08c_changes. Answers to Brief 32 are in Brief 32 answers.md.

## Changes
- Order create 3a: new notes group "An order made by hand is a draft from its first change": when it starts, leaving keeps it with "Kept in Drafts", reopening, Discard. 3b: a copy is a draft from its first change.
- Duplicate and alerts 8a: Duplicate is a draft from its first change, Create creates it.
- Actions inventory: New order, Copy an order and Duplicate follow the draft rule; no leave confirm on a new order.
- Home 10a: Drafts rows put what is left to check before the file name. New state 5: a copy, an empty order and a long file name. Notes for the hand-made row.
- Mobile screens 7a: notes on the hand-made Drafts row and on the card head link, which takes no height in the row.
- components.css: a text link in a card's head keeps its 34px box on touch and below 640px, with a 48px hit area and a negative block margin of half its box, so the head is as tall as the name.
- check.js: assertions for both Brief 32 faults; the head link check now also requires the margin.

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
- Brief 33 answers.md

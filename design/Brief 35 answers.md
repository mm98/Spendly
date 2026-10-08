# Brief 35 answers - one card head, and a check that measures it

This replaces every earlier card head rule (Briefs 32, 33, 34). There is one head now, and checks.html measures it on every rendered page.

## The rule

- A card's name is always in a head: the row that opens with the name, or the name alone as the card's first child.
- The head is the list toolbar's box: `--card-header-h` (54px) including a 1px bottom border, transparent on a card. The name is centred in it. The card gives up its top padding to the head, so the place does not depend on the card's padding.
- The head is one line and never wraps. What sits beside the name is centred on it and shrinks.
- What grows with the data (a legend, filters) goes below the head, never in it.
- The only button in a head is the small outline button (`sp-btn--outline sp-btn--small`), on every card and list toolbar. The text links ("All 5", "All 248", "All 9", "Statistics") and the extra-small side panel buttons (Edit, Done, Save, Cancel, Clear all) are now that button. On touch it is 48px, inside the 54px head.

## Answers

1. A card head does not wrap. On Spend by month (Order statistics 4a, Dark mode) the legend moved out of the head to its own line between the head and the chart, where it wraps freely. The head holds the name and the Stacked / Total switch. The fixed height no longer has to hold two lines.
2. Yes. A name standing alone takes the same head, so it sits where a card head's name does.
3. Yes. The four Statistics number cards open with their name alone and take the head. Each card is 9px taller.
4. Yes. The card head carries the toolbar's 1px bottom border, transparent, so both boxes are identical and the name sits at the same height in both: 19px from the card's top edge on desktop and on a phone.

## Markup moved to fit the rule

- Budget 21a and 21h: Budget 2026 and Columns had their name inside the card body; they now use the list toolbar, as a card with a table under it does.
- Duplicate and alerts: the August summary had its name stacked over the heading; the name and the close button are the head, the heading and text below it.
- Mobile screens: Spend, August had its name stacked over the figure; the name and the pill are the head, the figure below it.

## How it is checked

checks.html has a new rule, "a card name sits in the head". On every rendered page it measures each card and list toolbar: the head is 54px, the name is centred in it, nothing in the head reaches outside it, no legend or filters are in it, every head button is the small outline button, and no card has its name outside a head. It reports none across 26 pages. styles/check.js asserts the CSS: the head rule, the token, no raw 34px, and that the old text link head rule is gone.

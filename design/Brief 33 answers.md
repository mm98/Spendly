# Brief 33 answers - a card's title row on a phone is still taller with a link

The link keeps its 34px box and its 48px touch area, and the box no longer takes height in the row. It carries a negative block margin of half its height, `margin-block: calc(34px / -2)`, so its outer height is zero and the row is as tall as the name, 17px, with or without a link. The link stays on the name's baseline (the phone card head is `sp-baseline`), so "All 248" reads level with RECENT ORDERS. The box reaches 8.5px into the card's 16px padding above and the 12px gap below, so nothing overlaps; the touch area reaches 24px each way, as before.

The rule is in components.css beside the Brief 32 rule, under `.sp-touch` and below 640px. Mobile screens 7a note updated. styles/check.js now asserts the margin as well, which is what the Brief 32 check missed.

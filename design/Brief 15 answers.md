# Brief 15 answers

1. The first chip keeps its desktop height, with the touch target around it.
   - In the bookmark head on touch, the acting chip is `--field-trail` tall, the same as the "+1" label chip, so the two sit level. Its touch height is an invisible `::before` hit area, `--control-h-touch` tall, centred on the chip.
   - The chip's own `overflow: hidden` is lifted in this case so the hit area is not clipped; the label inside still truncates with an ellipsis.
   - `styles/components.css`, next to the `sp-record__head--chips` rules. `.sp-touch .sp-chip:not(.sp-chip--static)` is unchanged everywhere else.
2. Yes. With both chips at the chip height, the head is the name's height whether the card has categories or not, so every bookmark card on a phone is one height.
3. Drawn in Mobile screens, the Bookmarks frame, now in touch mode: Linen bedding set has two categories (Textiles, +1), Outline Sofa has none.

# This week's grocery offers on an order

## Fixed from handoff_grocery_offers

### On a phone, an alert's action sits under its text

- **The problem:** on the phone's Compare with receipt screen, Jump to first sat beside the alert's text, squeezing the note into a narrow column.
- **What changed:** on a phone the button sits under the note, at its own width, left-aligned with the text. On desktop it stays beside the text as before.
- **Where:** `Order create 3d`, specimen "4 - Phone". `styles/components.css`, new rule `.sp-alert__body > .sp-btn { align-self: flex-start; }` beside the alert's rules: a button placed inside `.sp-alert__body` keeps its width. No existing alert rule changed. App: the alert in the phone layout of the compare-with-receipt screen places its action inside the alert body.
- **What is still open:** nothing.

## The original package

Answers `Brief-grocery-offers-on-orders.md`. No stylesheet changed in the original package: every part is an existing component (`sp-icon-btn--small`, the c25 popover panel, `sp-sum`, `sp-meta`, `sp-btn--small`).

## 1. Where the offer hint sits in a line row

- **The problem:** a line had no place to say a shop has the same item on offer.
- **What changed:** a small tag button sits between the line's name and its amount, on desktop and on the phone. It is shown only on a line whose matched offer is cheaper per unit than what the line paid, one per line (the cheapest match). Tapping it opens the offer in a popover; tapping elsewhere on the row does what the row already does. aria-label "Offer at Netto", tip "On offer at Netto". On touch it keeps its drawn size inside the 48px press area.
- **Where:** `Order editing layouts 1a` (desktop specimen "A grocery order dated inside this week's offers") and `1c` (phone specimen "Grocery order · an offer tapped"). App: `LineText` / `LineAmount` in `react/src/pages/OrderParts.jsx`, the phone and desktop rows in `react/src/pages/Order.jsx`.
- **What is still open:** nothing.

## 2. How the hint says it is a guess

- **The problem:** the match is a server guess on free text; a wrong match has to be easy to spot.
- **What changed:** the popover head reads **Possible match**, then the product as the shop lists it with its size ("Arla Letmælk 1 L"), then "Netto · until 30/10/2026". Sum rows below: Offer as the shop states it ("15,00 kr.", "2 for 80,00 kr.", "12,00 kr. per kg"), the price per litre / kg / piece when the server has one (row absent otherwise), and You paid ("18,95 kr. each"). A members-only offer adds the popover note naming the club ("Lidl Plus members only"). No actions; Escape, a click outside or the tag closes it.
- **Where:** `Order editing layouts 1a`, the open popover and the two static specimens "A multi-buy offer" and "A members-only offer".
- **What is still open:** nothing.

## 3. "At this week's offers" beside "Saved"

- **The problem:** what the lines would have cost at the offers had to sit near the totals without reading as the reader's own saving.
- **What changed:** in the Totals card, under Saved, its own group: one sum row "At this week's offers 122,00 kr." in ordinary ink, never green, then a meta line "3 of 5 lines, 175,80 kr. paid for them. Offers from Tilbudsugen". It counts only lines with a tag, so both amounts cover the same lines. A multi-buy counts only when the line's quantity reaches it; a members-only offer counts. No tag on any line, no row. Saved stays green above it and is the only figure in the item list footer.
- **Where:** `Order editing layouts 1a`, Totals card. App: totals in `react/src/pages/Order.jsx`.
- **What is still open:** nothing.

## 4. While offers are looked up, and when they cannot be

- **The problem:** a missing hint could mean no offer, a failed lookup or a lookup not made.
- **What changed:** offers are looked up only when the reader taps **Check offers**, a small outline button in the Items card head (where Download all sits on Attachments). This keeps what Spendly told Tilbudsugen: only on request, one request for the whole list, kept an hour. The head then shows the result in meta ink: "3 lines on offer this week", "No lines on offer this week", "Offers could not be checked" with Try again, or "Offers can be checked again tomorrow" (or "in 15 minutes" for a wait asked by the site) with no button. While checking, the button is disabled and reads Checking offers; lines show nothing. Within the hour, reopening the order shows the result without asking again.
- **Where:** `Order editing layouts 1a`, the five card-head specimens and the notes "Asked only when the reader asks" and "The head after a check".
- **What is still open:** nothing.

## 5. The new-order page after a scan

- **The problem:** the brief asked whether hints show before the order is saved.
- **What changed:** yes. The unsaved scan screen shows Check offers, the tags and the "At this week's offers" row exactly as the saved order. A line left out with its tick counts in neither the row nor its line count. In edit, a line whose name or quantity changes after a check loses its tag until offers are checked again.
- **Where:** `Order create 3a`, note "Grocery offers before the order is created"; `Order editing layouts 1a`, note "Editing". App: the line list in `react/src/pages/OrderForm.jsx`.
- **What is still open:** nothing.

## 6. Naming the source

- **The problem:** the offers must be credited to Tilbudsugen.
- **What changed:** "Offers from Tilbudsugen" closes every offer popover and the "At this week's offers" meta line, a plain link to `https://tilbudsugen.dk` in a new tab. Nowhere else.
- **Where:** `Order editing layouts 1a`.
- **What is still open:** if Tilbudsugen's reply asks for a different credit or no link, please confirm the new wording.

## When none of it shows

Only an order the server treats as groceries, dated inside this week's offers, shows Check offers, tags or the row. An older order shows none of it, with no empty slot. A single offer is shown only when the order's date lies between that offer's first and last day. Where: `Order editing layouts 1a`, note "When it is there".

## later.md

- **"The design does not say yet that the arrow keys page Statistics"** - already settled: `Order statistics 4a` carries the note "The left and right arrow keys step to the previous or next period, as they step the months on Budget..." with the same exceptions later.md lists. No design change needed; Claude Code can remove the entry.
- **"A deleted record should not be removed for good at once"** - not drawn. The user chose to leave "Recently deleted" open for now; the entry stays.
- **"Large accounts still make everyone wait on a few pages"** - not a design fix; untouched.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order editing layouts.dc.html` - 1a and 1c, the offers specimens and notes.
- `Order create.dc.html` - 3a, the note on offers before an order is created; 3d, the phone alert's action under its text.
- `support.js`, `components.js` - what the pages load to open.
- `styles/components.css` - shared styles, with the one added `.sp-alert__body > .sp-btn` rule.
- `styles/tokens.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/pages/order-editing.css`, `styles/pages/order-create.css` - the two pages' layout rules, unchanged.

## styles/check.js

0 finding(s) across 27 pages.

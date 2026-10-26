# This week's offers in an Ask answer

Answers the request: Ask can be asked "cheapest milk prices for this week" and answers with this week's offers.

## 1. The offers block in an answer

- **The problem:** Ask answered from the reader's own records only. A question about prices this week had no answer shape.
- **What changed:** a price question is answered from this week's grocery offers, the source Check offers uses on an order, across every shop in the offers. The text states the cheapest in one sentence ("The cheapest milk this week is 10,00 kr. a litre, at Netto."), then a block of at most five offers, cheapest per litre, kg or piece first. Each offer is a file row in the file frame (`.sp-chat__files`, `.sp-chat__file`): the product photo as `sp-mark--medium sp-mark--photo`, the product and size as the title, "shop · until dd/mm/yyyy" in `sp-meta` (a members-only offer adds the club: "Lidl · until 29/10/2026 · Lidl Plus members"), and on the right the price column: the offer as the shop states it in `sp-amount`, the unit price under it in plain `sp-amount-secondary`. No comparison with what the reader paid, no saving. A row does nothing. The block closes with "Offers from Tilbudsugen" in `sp-meta`, once per block.
- **Where:** `Ask Spendly 24d`, specimen 11 and the notes "This week's offers in an answer - 11 to 14"; the lede of 24d and the Answers note of 24a name offers as a block. `styles/components.css`: new rule `.sp-chat__file > .sp-chat__price { flex: none; }`, the price column is `sp-stacked sp-cell-amount sp-chat__price`. App: the Ask answer renderer (`react/src/pages/Ask.jsx` and its answer blocks), the assistant's offers tool on the server.
- **What is still open:** nothing.

## 2. Looking up, nothing on offer, lookups used up

- **The problem:** the block needed its waiting and empty states.
- **What changed:** while looking up, the spinner bubble reads "Looking up this week's offers". Nothing found is a text answer naming the product, "No shop has oat milk on offer this week.", with the source link. The daily allowance used up is a text answer, "Today's offer lookups are used up. Ask again tomorrow.", or "Ask again in 15 minutes." for a wait, with no source link. One question is one lookup, cached an hour; a check on an order and a question here share one daily allowance. Offers in an old chat keep the prices they were answered with.
- **Where:** `Ask Spendly 24d`, specimens 12, 13, 14 and their notes.
- **What is still open:** nothing.

## 3. On a phone

- **The problem:** the phone needed the same answer.
- **What changed:** a new phone frame, the Ask chat with the offers answer, at full column width as an answer with files is. The title takes two lines before it is cut; the price column keeps its width.
- **Where:** `Mobile screens 7a`, "Ask - this week's offers", after "Ask - a file and a chart".
- **What is still open:** nothing.

## later.md

- **The design does not say yet that the arrow keys page Statistics:** the sentence is already in `Order statistics 4a`, the note "The left and right arrow keys step to the previous or next period". Nothing changed in this package; the entry can be removed.
- **A deleted record should not be removed for good at once:** left for a later task, by the user's choice.
- **Large accounts still make everyone wait:** not a design entry.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a, 24d changed.
- `Mobile screens.dc.html` - 7a gained the offers frame.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/doc.css` - loaded by the pages.
- `styles/components.css` - the `.sp-chat__price` rule.
- `styles/pages/ask-spendly.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - linked by the two pages.

## Checks

`styles/check.js`: 0 findings across 27 pages.

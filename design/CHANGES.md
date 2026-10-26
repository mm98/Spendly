# The plain-text email of a chat shows its offers

Answers the later.md entry "The plain-text email of a chat leaves its offers out" (branch `feat/offer-source-picks`). The other entries on that branch are skipped: "Large accounts still make everyone wait on a few pages" is server work, and "A deleted record should not be removed for good at once" is left for later, as asked.

## later.md: "The plain-text email of a chat leaves its offers out"

**The problem.** An email program that shows only the text part showed the answer's words but no offers. `emailBlocks` in `api/src/format/offers/index.js` sends a block with offers as `{ offers: true, items, source_name, source_url }`, and the text template had no `{{#offers}}` part, so the rows and their credit were dropped. Only a block with no offers, which is sent as the credit paragraph alone, reached the text part.

**What changed.** The text template has an offers part after the chart, one line an offer, then the credit, in the form the template already uses for links (the address in brackets after the words):

    - Arla Letmælk 1 L, Netto · until 1 Nov · Members only: 12,00 kr., 12,00 kr. per l (https://...)
    - Øko Sødmælk 1 L, Rema 1000 · until 2 Nov: 13,50 kr., 13,50 kr. per l (https://...)
    Offers from Tilbudsugen (https://tilbudsugen.dk)

" · Members only" is left out when `members` is empty, and ", unit price" when `per_unit` is empty. The fields are the ones the HTML part already takes; no new field. The mark fields (`initials`, `mark_bg`, `mark_ink`, `first`) and `goes_to` are not used in text.

**Where.**
- `emails/ask-chat.txt`: `{{#offers}}...{{/offers}}` after `{{/chart}}`.
- `emails/README.md`, Ask conversation: `offers` added to the blocks list, and a bullet for its fields and both parts.
- `Ask Spendly 24d`, note "In the email of a chat": a sentence on the text part.
- App: copy `emails/ask-chat.txt` to `api/src/emails/ask-chat.txt`. `api/src/format/offers/index.js` stays as it is. Remove the entry from `later.md`.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `emails/ask-chat.txt` - the text template with the offers part.
- `emails/README.md` - the emails' field list, with the offers block.
- `Ask Spendly.dc.html` - 24d, the email note.
- `support.js`, `components.js` - what the page loads.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/ask-spendly.css` - the stylesheets the page links; none changed.

## styles/check.js

0 finding(s) across 27 pages.

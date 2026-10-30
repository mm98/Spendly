# Remove the shop offers from Ask

This answers the brief "remove the shop offers from Ask". Pull request #668 removed Tilbudsugen, the only source. Everything the design drew for offers is gone, so a later build does not bring them back.

## later.md

Read on main before the task. Its one entry, Recently deleted, is an idea kept for later and not a design fix, so nothing in it is settled here.

## 1. The offer block in Ask

**The problem.** Ask still drew a block of this week's offers, with four states and their notes. Each row had a shop mark, a product name, an "until" date, the price and the price per unit, with "Offers from Tilbudsugen" under the rows. The app can no longer show it.

**What changed.**
- Removed Ask 24d 11 to 14: the offers, cheapest per litre first; Offers being looked up ("Looking up this week's offers"); Nothing on offer this week; and Today's offer lookups used up.
- Removed their notes, "This week's offers in an answer - 11 to 14". These covered the question, the rows, the link out, the credit line, the daily allowance, old chats, touch and the email.
- Removed offers from what an answer can hold, in three places: the 24a lede ("a file to download, or a chart"), the 24d lede, and the note listing an answer's blocks ("text, a list, a table, files, a chart, and text again").
- An old chat that held offers shows the rest of its answer. The block is not drawn.

**Where.**
- `Ask Spendly.dc.html`, 24a and 24d.
- `Mobile screens.dc.html`: the frame "Ask - this week's offers" (24d) is removed.
- App: `react/src/pages/Ask*`, the offers block renderer, whatever #668 left.

**What is still open.** Nothing.

## 2. The offers block in the Ask chat email

**The problem.** The email template still had an `offers` block.

**What changed.**
- `{{#offers}}...{{/offers}}` is removed from the HTML and the text part.
- In `emails/README.md`, "offers" is removed from the block kinds, and the `offers:` line is removed.
- `emails/ask-chat-sample.json` had no offers, so it is unchanged.

**Where.** `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/README.md`. App: `api/src/emails/ask-chat.html` and `.txt`, which must match these file for file.

**What is still open.** Nothing.

## 3. The style rules for an offer

**The problem.** `components.css` kept the price column on a file row.

**What changed.** `.sp-chat__file > .sp-chat__price` and its comment, "an offer in an answer (Ask 24d 11)", are removed.

**Where.** `styles/components.css`. App: `react/src/styles/components.css`, `.sp-chat__price`.

**What is still open.** Nothing.

## 4. Mark `logo`: removed

**The problem.** The shop's wide mark on an offer was two medium marks wide. Nothing else used it.

**What changed.** Removed, as decided in this chat:
- the `.sp-mark--logo` rules and their comment "the shop's place - c2 variant";
- the Components c2 specimen "The shop's place" and its note;
- the `logo` prop of `Mark`, with its JSDoc `@param` and class line;
- the asset `assets/shop-logo.svg`, which nothing uses now.

**Where.** `styles/components.css`, `Components.dc.html` c2, `react_handoff/Mark.jsx`. App: `react/src/components/Mark.jsx` (`logo` and its JSDoc), `react/src/styles/components.css` (`.sp-mark--logo`), `Mark.stories.jsx` (ShopOnAnOffer).

**What is still open.** Nothing.

## 5. LinkOut: removed

**The problem.** LinkOut was a name that opens another site in a new tab, with the tip "opens in a new tab". It was made for an offer's product, and its examples named Tilbudsugen and "Netto's offer paper".

**What changed.** Removed, as decided in this chat:
- the `.sp-link-out` rules, including `.sp-stacked:has(> a.sp-link-out)` and the comment "link out - DRAFT c28";
- the `.sp-link-out` line in the Components c28 Ink specimen, and its note;
- the `LinkOut` component and its JSDoc.

The `external-link` icon stays in the register.

**Where.** `styles/components.css`, `Components.dc.html` c28, `react_handoff/Utilities.jsx`. App:
- `react/src/components/Utilities.jsx` (`LinkOut`)
- `react/src/styles/components.css`
- `Utilities.stories.jsx` (LinkOut)
- `.design-sync/previews/LinkOut.tsx` and `.design-sync/docs/LinkOut.md`

**What is still open.** Nothing.

## Pages the brief names that needed no change

Order list, Order editing layouts, Order statistics, Dark mode and image viewer, Responsive reference and Type specimen do not name Tilbudsugen. What a search for "tilbud" finds there is the order note "Sommertilbud" ("Sommertilbud 80%"). That is text a reader typed on an order, not the offer source, so it stays.

## Files

- `Ask Spendly.dc.html`: 24a and 24d, offers removed.
- `Mobile screens.dc.html`: the Ask offers frame removed.
- `Components.dc.html`: c2 shop's place and c28 link out removed.
- `emails/ask-chat.html`, `emails/ask-chat.txt`, `emails/README.md`: the offers block removed.
- `react_handoff/Mark.jsx`: `logo` removed. `react_handoff/Utilities.jsx`: `LinkOut` removed.
- `styles/components.css`: `.sp-mark--logo`, `.sp-link-out` and `.sp-chat__price` removed.
- `README.md`: the design's overview, unchanged.
- `support.js`, `components.js`, `view.js`, `icons.js`: what the pages load.
- `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`: shared stylesheets, unchanged.
- `styles/pages/ask-spendly.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css`: the pages' stylesheets, unchanged.
- `styles/check.js`: the checker.

## styles/check.js

0 finding(s) across 28 pages

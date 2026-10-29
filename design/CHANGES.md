# A scanned receipt that looks like an order you already have

## Fixed from handoff_scan_lookalike

**The problem.** That package left one point open. Step 2 said "If you leave, the scan is kept in Drafts on Home." This was untrue when the reading then matched an order, because such a scan makes no draft. The slow-reading card in 6e said the same, and so did the rule "a scan is a draft from upload".

**What changed.** A scan is held as the upload and its reading until the reading ends. It becomes a draft then, unless the reading looks like an order you already have. In that case it becomes a draft at his first change or Create. The words now say what is true in every case:
- Step 2 (desktop and phone): "Usually 5 - 10 seconds. If you leave, the reading carries on, and adding the same file again picks it up."
- 6e, Reading is taking longer than usual: "You can leave this page. The reading carries on, and adding the same file again picks it up."
- Adding the same file again opens 3c. With no match that is the draft's "Open that draft"; with a match it is "Use the reading".

**Where.**
- Order create 3a: the lede, step 2 on desktop and phone with the phone notes, and the note "A scan is a draft until it is created or discarded".
- Order create 3a, the amber row notes.
- States and confirmations 6e.
- Actions inventory: Discard (reading) and Discard.
- App: `react/src/pages/OrderNew.jsx` (`Reading`: the hint under the steps and the slow card), and the server's scan, which makes the draft when the reading ends rather than on upload.

**What is still open.** Nothing.

This answers the brief "a scanned receipt that looks like an order you already have". Two rules run through every point: a match never blocks the reader, and a scan he has not decided on never becomes a draft.

## later.md

Read on main before the task. Its one entry, Recently deleted, is an idea kept for later and not a design fix, so nothing in it is settled here.

## 1. The flow: already scanned, or already an order

**The problem.** The two checks were drawn in different places, or not at all. 3c covered the same file. The fuzzy check on vendor, date and total was described only as something that "runs later". A scan that matched an order went straight to a review that was already a draft.

**What changed.** 3c is renamed "Already scanned, or already an order". It opens with a flow table that sets out every way in: what matches, what the reader sees, his ways on, and when a draft is made.
- Same file, with a saved reading: 3c Scanned before, as now.
- Same file, in a draft: 3c pointing to the draft, as now.
- Same file, on an order, never read: 3c's new state (point 3).
- Reading ends, same vendor, a date up to 3 days away, a total within 10%: the review opens with the amber row (point 2).
- Reading ends, nothing matches: the review, as now.
- An order typed, copied or edited that matches: the amber row.

Only the file check stops the reader, since it is certain and saves a reading. The order check never stops him. Once the file check has been answered, the amber row does not show for the same order on that scan.

**Where.** Order create 3c, "The flow" table and its notes, plus the 3c card "What the hash does and does not catch". New page rule `.oc-flow` in `styles/pages/order-create.css` (in `@layer base`).

**What is still open.** Nothing.

## 2. A scan that looks like an order you have, and the amber row in the order form

**The problem.** The app went to the review, where a draft already existed. It showed one amber line, "You already have an order like this...", with no way to open the order it named. The line was not drawn anywhere in `design/`.

**What changed.**
- The review is not blocked. The amber row, the attention row c23 (`ListItem color="warning" count="!" variant="top"`), reads "You already have an order like this" and "1.234,00 kr. at Bilka on 12 Aug. You can still create this one." The words end "save this one" when an order is being edited. Under them is an outline button, "Open that order", small on desktop and full width on a phone. So the reader can open the order he has, or just press Create.
- **A scan with this row is not a draft yet.** The review opens on the reading held with the upload. It becomes a draft at his first change, as an empty order does, or when he presses Create. Opening that order, or leaving the review unchanged, makes no draft and shows no message. The upload and its reading are held 24 hours, so scanning the same file again opens 3c with "Use the reading". Any other scan is a draft from the upload, as before.
- If he leaves during step 2 and the reading then matches, no draft is made either.
- The row shows in the review of a scan, a new order typed by hand, a copy, and a saved order being edited.
- On desktop it sits in the side column under the Totals card, above the limits notice when both show. On a phone it sits under the totals, above the save bar.
- When "Open that order" is pressed on a saved order with changes, the reader is asked before leaving, as on any page (6d). A new order or a copy that is already a draft is kept, with the "Kept in Drafts." toast.

**Where.** Order create 3a, "The order form, when it looks like an order you have" (side column and phone), with notes. The app files:
- `react/src/pages/OrderForm.jsx`: `lookalikeNotice` gains the button and `variant="top"`, and hides for the order 3c already named.
- `react/src/pages/OrderNew.jsx`: `Scanned`, a matched scan opens the review without a draft.
- The scan on the server: it must not make the draft before the check.

**What is still open.** Nothing. The step 2 words are settled above.

## 3. 3c for a file that is on an order but was never read

**The problem.** A file added to an order by hand was never read. Scanning it opened 3c, whose words assume a scan and a saved reading.

**What changed.** A new state of 3c uses the app's current words, confirmed:
- Heading "This receipt is already on an order"; phone title "Already on an order".
- The matched order, as 3c draws it, with "Open that order" and "Compare the files". The file line shows only the file's name.
- One way on: "New order from this file", "Reads the file and starts a new order, ready for you to check and change.", button "Read the file". It goes to step 2 as a first reading, then the review.
- The footer is 3c's.

**Where.** Order create 3c, "The file is on an order but was never read" and its phone frame. `react/src/pages/OrderNew.jsx`, `SeenBefore`.

**What is still open.** Nothing.

## Also drawn: 3c's heading

The app shows a heading and a line under it on 3c ("This receipt has been scanned before", "The same file is already on this order."). On a phone it shows the line under the top bar. The drawing now shows them too, so both 3c states share one shape. The app does not change.

## Files

- `Order create.dc.html`: the changed page (3a, 3c).
- `Actions inventory.dc.html`, `styles/pages/actions-inventory.css`: Discard rows, with what leaving keeps.
- `States and confirmations.dc.html`, `styles/pages/states.css`: 6e, the slow-reading card.
- `README.md`: the design's overview, unchanged.
- `support.js`, `components.js`, `view.js`: what the page loads.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`: the shared stylesheets, unchanged.
- `styles/pages/order-create.css`: the page's stylesheet, with `.oc-flow` added.
- `styles/check.js`: the checker.

## styles/check.js

0 finding(s) across 28 pages

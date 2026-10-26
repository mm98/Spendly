# An offer shows its shop's mark, and links to where it can be seen

## Fixed from handoff_offer_shop_mark_fixed

**An offer's tag painted over the sheet and the scrim.**
- **The problem:** `.sp-list-item__control` takes `z-index: 1` to sit over the row's open target. The row started no stacking context of its own, so that 1 counted in the page's stacking: on a phone with the offer sheet open, the tags of the lines behind it showed undimmed over the scrim and took the taps meant for it, and they would paint over any sheet or dialog that covered them.
- **What changed:** a row holding a control is its own stacking context, so the raise stays inside the row. Nothing changes in how it looks; the control still sits over the row's open target, and a row with an open panel still lifts over the rows after it on a pointer.
- **Where:** `styles/components.css`, `.sp-list-item:has(> .sp-list-item__control) { position: relative; isolation: isolate; }` beside `.sp-list-item__control`.
- **What is still open:** nothing.

## Fixed from handoff_offer_shop_mark

**On a phone the offer opens in a sheet, not in the panel.**
- **The problem:** on touch the offer panel hung under its row (the rule taken from `app.css`), a small panel floating over the list where every other phone surface of this kind, such as Edit line, is a sheet.
- **What changed:** on touch, tapping an offer's tag opens a sheet (c13): the handle, "Possible match" as its title, then the same head (the shop's place, the linked name, "shop · until"), the members note, the sum rows and "Offers from Tilbudsugen", and Close. Close, the scrim or dragging it down shuts it; the tag keeps `aria-expanded="true"` while it is open. On a pointer the panel is unchanged. The two touch rules that hung the panel from the row are gone from `styles/components.css`.
- **Where:** `Order editing layouts 1c` (Grocery order, an offer tapped) and the note "The offer is a suggestion"; `Components c25` (note "On touch"). App: `OfferTag` in `react/src/pages/orderOffers.jsx` renders its content in `Sheet` (`react_handoff/Touch.jsx`) on touch and in `Popover` otherwise; the three `.sp-touch .sp-list-item ... .sp-popover` rules leave `react/src/styles/app.css` with nothing replacing them.
- **The tag on a row that opens:** the tag sits in `sp-list-item__control`, raised over the row's open target, so a tap on the tag opens the offer sheet and a tap anywhere else on the row opens Edit line. The tag keeps its 48px press area on touch.
- **What is still open:** nothing.

Answers `Brief-offer-shop-mark-and-link.md` (the version with shop logos) and the follow-up that offers are not limited to this week's orders, and settles three entries of `later.md`.

## 1. The shop takes the product picture's place

**The problem.** The offer popover (Order editing layouts 1a, 1c) and the offer rows of an Ask answer (Ask Spendly 24d 11, Mobile screens 7a) showed the product's picture, which Tilbudsugen's picture server refuses, so the reader saw an empty photo box.

**What changed.** The picture's place is now the shop's place: one box, two medium marks wide (84 x 42) and one high, the same on every offer so the names beside it line up.
- A shop with a logo shows the logo whole inside it, on white with a 1px `--line` edge and a 4 by 6 inset. The white stays in the dark theme. The logo wins over the reader's own vendor mark.
- A shop with no logo (Aldi, Coop.dk Mad, Zur Krone) fills the same box as a vendor mark: the reader's vendor colour when the shop is one of their vendors by name or alias (`sp-mark--solid` with its swatch), else the shop's initials on the grey no-colour mark (`sp-mark--none`). Initials as `initialsOf` takes them ("Zur Krone" ZK, "Aldi" AL).
- The logo is decorative (`alt=""`, `aria-hidden`): the shop's name is already in the line beside it.

**Where.**
- `Components c2` (the shop's place specimen and note); `styles/components.css` `.sp-mark--logo`, `.sp-mark--logo:has(> img)`, `.sp-mark--logo > img`.
- `Order editing layouts 1a` and `1c` (popover heads, the note "The offer is a suggestion"); `Ask Spendly 24d` 11 and its notes; `Mobile screens 7a` (Ask - this week's offers).
- `react_handoff/Mark.jsx`: new `logo` prop, which adds `sp-mark--logo`. Pass the logo as `<img src={offer.logo} alt="" />` with `aria-hidden`, or, with no logo, the vendor mark's name or the shop's name with `fill="solid"` / `fill="none"`.
- App: `react/src/pages/orderOffers.jsx` (`OfferTag` head: `LinePhoto` goes), `react/src/app/askAnswer.jsx` (`OfferRow`: `LinePhoto` goes; `useLoadedPicture` is no longer needed for offers), `api/src/offers/tilbudsugen.js` and `api/src/format/offers/index.js` (an offer carries its shop's logo address and `offerUrl`; the vendor match by name or alias is the server's).
- The mockups draw the logo as a hatched stand-in, `assets/shop-logo.svg`.

**What is still open.** Nothing.

## 2. The product's name is a link; the row stays inert

**The problem.** Nothing in an offer led to where it could be seen, and an Ask offer row "does nothing".

**What changed.** The product's name is a link opening in a new tab: the shop's own offer paper when the offer has `offerUrl`, else Tilbudsugen's search page for the item (`https://www.tilbudsugen.dk/dk/ai-basket?q=<item>`). It is a new text role, `sp-link-out`: the name keeps its own role and ink at rest (`sp-title` in the popover, `sp-chat__file-name sp-truncate` in an Ask row), the `external-link` icon at 13 in `--ink-5` follows it 4 apart, and on hover and focus both turn `--green` and the name is underlined. In an Ask row only the name is a link; the row still takes no hover or focus.

**Where.** `Components c28` (specimen and note); `styles/components.css` `a.sp-link-out` and its descendants; `react_handoff/Utilities.jsx` new `LinkOut` (`href`, `label`, `nameClass`, children the name). Order editing layouts 1a, 1c; Ask Spendly 24d 11; Mobile screens 7a. App: `OfferTag`, `OfferRow`.

**What is still open.** Nothing.

## 3. The link says where it goes

**What changed.** Its tip (`data-tip`) and accessible name say where it goes: "Netto's offer paper" (shop name + "'s offer paper") or "Search on Tilbudsugen". The accessible name is "<product>, <where>, opens in a new tab". `LinkOut` builds both from `label`.

**Where.** As in 2.

**What is still open.** Nothing.

## 4. The offers block in the email of an Ask chat

**The problem.** The email listed offers as plain bullet lines.

**What changed.** A new `{{#offers}}` block, in the frame the email's files use, one row per offer: the shop's initials, never its logo (mail apps block images), in a 24px cell on the mark's own colour (the vendor's swatch, or `#f0efe9` with `#686760` initials for a shop that is not a vendor); the name as a link to the same place as in the app, with `title` saying where it goes; "shop · until dd/mm/yyyy" under it, plus the club for a members-only offer; the price on the right, the unit price under it. "Offers from Tilbudsugen" follows the frame. Fields per item: `first`, `mark_bg`, `mark_ink`, `initials`, `url`, `goes_to`, `name`, `shop`, `until`, `members`, `price`, `per_unit`; per block: `source_url`, `source_name`.

**Where.** `emails/ask-chat.html` (`{{#offers}}` after `{{/chart}}`); note in `Ask Spendly 24d` ("In the email of a chat"). App: `api/src/emails/ask-chat.html`, and `api/src/format/offers/index.js`, whose email write stops producing the bullet list.

**What is still open.** Nothing.

## 5. Offers are checked on every grocery order, whatever its date

**The problem.** Check offers, the tags and "At this week's offers" showed only on a grocery order dated inside this week's offers, so an order from last week or last month could not be compared with this week's prices.

**What changed.** They show on every order the server treats as groceries, whatever its date: the reader compares what they paid with what the item costs on offer this week. A single offer is no longer limited to an order dated between its first and last day. On an order older than this week's offers, the popover's You paid row adds the order's date: "59,95 kr. each on 12/09/2026". "At this week's offers" in Totals is on every order that can be checked. The tag rule is unchanged: a line gets one only when the offer's price per unit is below what the line paid.

**Where.** `Order editing layouts 1a` (specimen "An order from before this week"; notes "When it is there", "The offer is a suggestion", "At this week's offers is not a saving"; the main specimen relabelled "A grocery order, offers checked, one opened"); `Order create 3a` (note "Grocery offers before the order is created"). App: `react/src/pages/orderOffers.jsx` (`OfferTag`'s You paid value), the server's rule for when an order may be checked and which offers a line may match.

**What is still open.** Nothing.

## later.md: "An offer's panel on a phone hangs from its row, not its tag"

**What changed.** On a phone the offer no longer hangs anywhere: it opens in a sheet (see the top of this note), so it cannot run past the screen's edge.

**Where.** `Order editing layouts 1c`, `Components c25`. App: remove the three `.sp-touch .sp-list-item ... .sp-popover` rules from `react/src/styles/app.css`, `OfferTag` opens a `Sheet` on touch, and remove the entry from `later.md`.

## later.md: "A phone's line row cannot carry an offer's tag while the row opens the line"

**What changed.** A row that opens has a place for one control beside the part that opens: `sp-list-item__open` holds the mark and the words and stretches over the row, `sp-list-item__control` follows it raised over the stretch (by z-index only, so a panel inside can still hang from the row), and the amount comes last and opens the row like the words. A row with an open panel lifts over the rows after it. The tag sits in this slot everywhere it appears, also on rows that do not open. On a phone's edit page the line row opens the line's sheet from anywhere but the tag; on the order page a line with a photo opens its photo from the whole row.

**Where.** `styles/components.css` `.sp-list-item__control`, `.sp-list-item:has(> .sp-list-item__control .sp-popover)`; `Components c15` (specimen and note "A control beside the part that opens"); `Order editing layouts 1a` and `1c` (every tag wrapped; 1c Grocery order drawn as rows that open), note "The tag on a line". `react_handoff/ListItem.jsx`: new `control` and `end` props; with `onClick` or `to`, `control` makes the row the split shape, handle or not. App: `react/src/pages/OrderForm.jsx` and `react/src/pages/Order.jsx` pass the `OfferTag` as `control` and the amount as `end`; remove the entry from `later.md`.

## later.md: "An offer's picture was never seen loading"

**What changed.** Settled by 1: an offer shows no product picture any more. Remove the entry from `later.md`.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Order editing layouts.dc.html` - popover heads, tags in the control slot, 1c rows that open and the offer sheet, the older-order popover, notes.
- `Order create.dc.html` - 3a note on offers before the order is created.
- `Ask Spendly.dc.html` - 24d 11 rows and notes, the email note.
- `Mobile screens.dc.html` - 7a offer rows.
- `Components.dc.html` - c2 shop's place, c15 control slot, c25 sheet on touch, c28 link out.
- `emails/ask-chat.html` - the offers block.
- `react_handoff/Mark.jsx`, `react_handoff/ListItem.jsx`, `react_handoff/Utilities.jsx` - `logo`, `control` and `end`, `LinkOut`.
- `assets/shop-logo.svg` - the logo stand-in the mockups draw.
- `support.js`, `components.js`, `icons.js` - what the pages load.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets; `components.css` holds every new rule.
- `styles/pages/order-editing.css`, `styles/pages/order-create.css`, `styles/pages/ask-spendly.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - the page stylesheets these pages link.

## styles/check.js

0 finding(s) across 27 pages.

# Ask inside the order list's search (Brief-order-search-ask)

The order list's search can now read a sentence. Normal search picks out the parts it knows while the reader types, and an Ask button in the field hands the whole sentence to Ask when the reader presses Enter. Either way the result is the normal list with its normal filters, shown as the normal chips. This is for the order list only. Every other search keeps its look.

## 1. The Ask button

**The problem.** The order list's search matches the whole text against an order's fields, so a sentence such as "groceries over 500 last month" finds nothing. The field also had no place for a second control.

**What changed.**
- The field ends in two buttons, `--sp-2` apart, each the field's normal 30px trailing button: the clear button (`x`), shown while the field has text, and Ask (`message-circle`).
- Ask off is a ghost button. Ask on is filled `--green` with a white mark (`aria-pressed="true"`), `--green-2` on hover and `--green-press` when pressed.
- Tooltips, placed above the button when there is room: "Ask (Alt+A)" when off, "Back to search (Alt+A)" when on.
- When Ask is turned off on the server, the button is not rendered and the field ends in the clear button only.
- Only `OrderSearch` passes Ask to `SearchInput`. The dozen other searches do not change.

**Where.**
- `Order list 2b`: the toolbar search, the "Ask on" specimen and the notes.
- `Layout rules 15e`: the order list toolbars, at every width.
- `styles/components.css`: `.sp-field__trails`, `.sp-field__trails > .sp-field__trail`, `.sp-field__trail--ask` and its `[aria-pressed]`, `:disabled` and `[aria-busy]` states, and `.sp-input--trail-2` (next to `.sp-input--trail`). These are new rules. No existing rule changed.
- App: `react/src/pages/Orders.jsx` `OrderSearch` (both places it is drawn), `react/src/components/Inputs.jsx` `SearchInput` (an optional Ask control at the end).

**What is still open.** Nothing.

## 2. Ask mode in the field

**The problem.** The reader needs to see that the field is in Ask mode, and that typing does nothing until Enter.

**What changed.**
- The lead icon changes from `search` to `message-circle`, and the placeholder reads "Ask, for example: groceries over 500 last month". The clear button is hidden in Ask mode.
- Nothing runs while the reader types. Enter sends the sentence. The filters Ask returns replace the current filters.
- The sentence stays in the field so it can be changed and sent again. It is never stored, so a saved view or a link holds only the filters.
- Words Ask keeps as search text are shown as a chip, in straight quotes.
- The mode lasts until the button or Alt+A turns it off, and ends when the reader leaves the page. Turning it off empties the field, or puts back the words Ask kept as search text.

**Where.** `Order list 2b`: the specimens "Ask on", "Ask on, typed" and "Ask answered", plus the notes.

**What is still open.** Nothing.

## 3. What the reader sees when normal search reads a part

**The problem.** A reader must be able to see that "over 500" became a filter, and be able to undo it.

**What changed.**
- While the reader types, an amount ("over 500", "under 200", "500-1000") sets the lowest or highest total. "This month" or "this year" sets that Date preset. "Last month", a month name or a year sets the Custom range. A shop's or a category's whole name, in any case, sets that facet.
- Each part appears at once as a chip in the filter row (`sp-crumb`, unchanged) and in the facet rail. The text stays in the field as typed.
- A part and its chip are one: removing the chip removes those words from the field, and deleting the words removes the chip.
- Words that are not read stay search text, matched as today.
- Chip copy follows the existing formats: "Over 500 kr.", "01/09/2026 - 30/09/2026".

**Where.** `Order list 2b`: the specimen "Search reads the parts it knows", plus the notes.

**What is still open.** Nothing.

## 4. While Ask works

**The problem.** Ask takes a few seconds, and the reader needs to see it working and be able to stop it.

**What changed.**
- The field is read-only. The Ask button shows `.sp-spinner` and becomes Stop (`aria-label="Stop"`, tooltip "Stop (Esc)"). On hover or focus the spinner gives way to `x`.
- Esc in the field also stops it.
- The list and its chips stay as they were until the filters arrive. Stopping leaves everything as it was, with the sentence still editable.

**Where.** `Order list 2b`: the specimen "Ask working", plus the notes. `styles/components.css`: `.sp-field__trail--ask[aria-busy="true"]`, `.sp-field__stop`.

**What is still open.** Nothing.

## 5. When Ask cannot help

**The problem.** Two cases had no drawing: Ask did not understand the sentence, and the reader has no questions left today.

**What changed.**
- Not understood: a help line under the toolbar reads "Couldn't turn that into filters. Try naming a shop, a category, an amount or a period." in the warning tone (`.sp-field__help[data-color="warning"]`). The sentence stays, and the list and filters do not change. The line goes when the reader edits the field.
- No questions left: the field returns to search mode and the Ask button is disabled (`--fade-disabled`). Its tooltip reads "No questions left today. Resets at midnight." on hover and focus. The tooltip is held by the field's end, because a disabled button gets no pointer events. The button comes back on its own when the day's questions reset.
- Ask turned off on the server: no button, as planned.

**Where.** `Order list 2b`: the specimens "Ask did not understand" and "No questions left today", plus the notes.

**What is still open.** Nothing.

## 6. Phone

**The problem.** On a phone the search stands alone at full width, and the button needs a touch size.

**What changed.** Ask sits inside the field, as on desktop. Both buttons keep their drawn 30px, and each has a 44px wide press area as tall as the field. On touch the buttons sit `--sp-14` apart, so the two press areas meet and do not overlap. Confirmed: 44px, not the system's 48.

**Where.** `Mobile screens 7a`: the order list's search, plus a note. `Order list 2b`: the specimen "On a phone, Ask on". `styles/components.css`: `.sp-touch .sp-field__trails`, `.sp-touch .sp-field__trails > .sp-field__trail::after`, `.sp-touch .sp-input--trail-2`.

**What is still open.** Nothing.

## 7. The keyboard

**The problem.** There was no key to switch Ask mode from the field.

**What changed.** In the field, Alt+A (Option+A on a Mac) turns Ask mode on and off, Enter sends in Ask mode, and Esc stops a running question. The top bar's search keeps Cmd+K. Confirmed: Alt+A stays, even though Option+A types "å" on some Mac layouts.

**Where.** `Order list 2b` notes. App: `OrderSearch` key handling.

**What is still open.** Nothing.

## later.md: "For Claude Design: What Ask can do keeps Close in a short window"

**The problem.** `.sp-dialog` had no height limit. In a window lower than the dialog, it grew past the window and the page under it scrolled, instead of the list inside it.

**What changed.** A dialog holding `.sp-chat__help` is at most the window's height less the scrim's padding (`100dvh - 2 x --sp-16`). The list scrolls inside it, and the heading and Close stay in view.

**Where.** `styles/components.css`: `.sp-dialog:has(> .sp-chat__help)`, next to `.sp-chat__help`. `Ask Spendly 24c` note. Remove the rule under "What Ask can do scrolls its parts" from `react/src/styles/app.css`, and this entry from `later.md`.

**What is still open.** Nothing.

## later.md: other entries

"Large accounts still make everyone wait on a few pages" and "A deleted record should not be removed for good at once" are app and server entries. Neither is in this brief, so both stay in `later.md`.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Order list.dc.html` - the toolbar search with Ask, the eight states and the notes (2b).
- `Layout rules.dc.html` - the order list toolbars with the Ask button (15e).
- `Mobile screens.dc.html` - the phone's order list search with Ask, plus a note (7a).
- `Ask Spendly.dc.html` - the dialog height note (24c).
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets. `components.css` gains the field-end rules and the dialog height rule.
- `styles/pages/order-list.css`, `layout-rules.css`, `mobile-screens.css`, `budget.css`, `ask-spendly.css` - the page stylesheets these pages link.

## styles/check.js

0 finding(s) across 27 pages.

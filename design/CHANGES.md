# The day's limit in Ask, and five fixes found on the way (Brief-ask-limit-alerts)

This package follows `design_handoff_ask_thread_times`, which stays as presented. It covers the questions-left alert in Ask and the component fixes made while reviewing Ask, Components and Layout rules. `later.md` was read before the work. Its one Claude Design entry, "touch rules found in an iPhone run", is already settled by `design_handoff_ask_thread_times`.

## 1. The questions left today: a bar pinned at the top of the chat

**The problem.** "2 questions left today" sat in small text under the field, at the right, where it was easy to miss. When none were left, an alert closed the thread and scrolled away with it.

**What changed.**
- With 3 or fewer questions left, the amber inline alert (`.sp-alert`) is pinned at the top of the chat, under the top bar, at the column's width. The count is its title ("2 questions left today", "1 question left today") and its note says when the count starts again, from the server's reset time: "The count starts again tomorrow from 00:00."
- With none left, the same pinned alert reads "No questions left today", with the note "You can ask again tomorrow from 00:00. This chat stays on Chats." It no longer sits at the end of the thread. The field stays disabled with the placeholder "No questions left today".
- The thread scrolls under the alert and fades at its edge, so the alert stays in view however far the reader scrolls.
- It cannot be closed. It is absent with more than 3 left, or when there is no limit.
- On a phone it keeps the phone gutter at the sides and above.
- Nothing sits under the field any more: the hint line (`.sp-chat__hint`) is removed, with its rule.

**Where.** `Ask Spendly 24b` 3 and 4 and their notes; `24a` (the field note) and `24c` (the help note); `Components c34`. `styles/components.css`: `.sp-chat > .sp-alert` and `.sp-touch .sp-chat > .sp-alert`, after `.sp-chat__msg--mine + .sp-chat__time`; the `.sp-chat__hint` rule is gone. App: `react/src/components/Chat.jsx`. `Chat` renders the alert as its first child, before `ChatScroll`, when the server's count is 3 or less. `ChatDock` drops the hint row and its `left` prop. The "none left" alert moves out of the thread to the same place.

**What is still open.** Nothing.

## 2. An alert's mark, and a toast's icon, sit on the first line

**The problem.** The inline alert centred its "!" on the middle of its title and note, and a toast whose message wrapped centred its icon between the two lines.

**What changed.** Only these two components change. The alert's mark centres on the title's line. The title and note sit at the top, and the alert takes the title's size so its line height is the title's. A toast with an icon sits at the top, and its icon's box is one line tall, so the icon centres on the first line. A one-line toast looks as before. The compact toast has no icon and does not change.

**Where.** `Components c19` (inline alert) and `c18` (toast). `styles/components.css`: `font-size` in `.sp-alert`; `.sp-alert > .sp-alert__mark` and `.sp-alert > .sp-alert__body` after `.sp-alert__body`; `.sp-toast:has(> .sp-toast__icon)` and `.sp-toast > .sp-toast__icon` after `.sp-toast__icon[data-color="danger"]`. App: the same rules in `react/src/styles/components.css`.

**What is still open.** Nothing.

## 3. A photo's Replace and Remove on a phone

**The problem.** On a phone, a filled image slot was drawn as two stacked text buttons beside the photo (Layout rules 15b). That was its own version of the image slot, beside the component's photo-as-target with the Remove link under it.

**What changed.** On a phone, a filled slot is a row: the image, then two bordered icon buttons on one line beside it (`.sp-slot__actions`). Replace (`upload`) is a `<label>` over the file input. Remove (`trash`) is in `sp-ink-danger`, like a document's remove button. On a phone the image is not the target and has no Remove link under it. On desktop, and for an empty slot, the frame stays the target with Remove under it.

**Where.** `Components c17` (a new note, and a filled slot in the phone example), `c15` (the line editor's sheet); `Layout rules 15b` and its note. `styles/components.css`: `.sp-slot__actions`, its label and file input, and `.sp-touch .sp-slot:has(> .sp-slot__actions)`, after `.sp-slot__remove:focus-visible`. App: the image slot component renders the actions row in place of the frame label and the Remove link when on touch.

**What is still open.** Nothing.

## 4. A stretched dropdown on a phone keeps its chevron at the right

**The problem.** In a phone toolbar, Filters and Sort stretch to share the row, but each chevron sat straight after its label instead of at the right edge.

**What changed.** The chevron sits at the trigger's right edge, as in every full-width dropdown.

**Where.** `Layout rules 15e` (under 440px). `styles/components.css`: `.sp-touch .sp-controls > .sp-combobox .sp-combobox__chevron`, after the touch `.sp-controls` rules. App: picks up the rule.

**What is still open.** Nothing.

## 5. A stepper always shows its digit

**The problem.** A stepper in a narrow column could shrink until its number was hidden. The two steppers on Layout rules were also drawn with a div value of their own, not the stepper's input.

**What changed.** `.sp-stepper__value` is `width: 0` with a minimum of one digit plus its padding, so its column decides its width and it never shrinks below one digit. Both Layout rules steppers now use the component's markup.

**Where.** `Layout rules 15a` and `15b`; `Components c4`. `styles/components.css`: `width` and `min-width` in `.sp-stepper__value`. App: the same rule in `react/src/styles/components.css`.

**What is still open.** Nothing.

## 6. Layout rules: New order uses the bordered icon button

**The problem.** In the phone toolbar on Layout rules, New order was the plain icon button, unlike the bordered one used beside other controls.

**What changed.** It is `sp-icon-btn--outline`.

**Where.** `Layout rules 15e`.

**What is still open.** Nothing.

## styles/check.js

New assertions:
- an alert's mark sits on the title line;
- a toast's icon sits on the first line;
- a stretched dropdown keeps its chevron at the edge;
- a stepper shows its digit: the one-digit minimum exists, and every stepper uses `.sp-stepper__value`.

## later.md: other entries

"Large accounts still make everyone wait on a few pages" and "A deleted record should not be removed for good at once" are app and server entries outside this brief, so both stay.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - the pinned limit alert (24b 3, 4) and notes.
- `Components.dc.html` - c34 with the pinned alert, the phone image slot (c15, c17).
- `Layout rules.dc.html` - 15a and 15b steppers, the 15b image slot and note, and the 15e New order button.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets. `components.css` carries every rule above.
- `styles/pages/ask-spendly.css`, `layout-rules.css` - the page stylesheets these pages link.
- `styles/check.js` - with the new assertions.

## styles/check.js result

0 finding(s) across 27 pages.

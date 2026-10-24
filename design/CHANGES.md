# A long Ask conversation: scrollbar, fades and message times (Brief-ask-long-thread)

This package replaces `design_handoff_ask_long_thread`. It carries everything that package did (points 1 and the later.md section), plus the times on messages, the fades at the thread's edges, the removed keys hint and the long-conversation drawing.

## 1. The scrollbar on a long conversation

**The problem.** `.sp-chat__scroll` was the one scrolling region without the shared bar, so a long thread showed the browser's default bar, with its track and arrows, flush against the reader's mark. The column also narrowed by the bar's width when it appeared.

**What changed.** The thread takes the shared thin bar every other scrolling region has: 8px, no track, no arrows, the thumb in `--scroll-thumb`. The part that scrolls reaches 16px into the body's right inset, so the bar runs down the page edge, clear of the marks, and its space is kept while the thread is short. The column is the same width whether the bar shows or not. A phone shows no bar. Chats and Files (24e, 24f) use the same region and get the same bar.

**Where.** `Ask Spendly 24a`: the note "The conversation takes the full content column". `styles/components.css`: `.sp-chat__scroll` joins the list of regions that "scroll by their own nature" (`scrollbar-width`, `::-webkit-scrollbar`, `-track`, `-thumb`), and `.sp-shell__body .sp-chat__scroll` and `.sp-shell--touch .sp-shell__body .sp-chat__scroll` after `.sp-chat__scroll`. App: `react/src/components/Chat.jsx` (`ChatScroll`) picks the rules up from the stylesheet.

**What is still open.** Nothing.

## 2. The thread fades at an edge while more lies past it

**The problem.** A long thread was cut off hard against the field and the top bar, so a half-shown message read as a layout fault.

**What changed.** The thread fades out over 24px at an edge while more of it lies past that edge. At the bottom, above the field, it fades while there is more below. At the top, under the top bar, it fades once the thread is scrolled down. In the middle of a long thread both edges fade. Scrolled to the latest message of a thread that fits, nothing fades. It is a mask, so it works on the light and dark grounds alike.

**Where.** `Ask Spendly 24a`: the same note, and the new long conversation under the screen (point 5). `styles/components.css`: `.sp-chat__scroll[data-below="true"]`, `[data-above="true"]` and both together, after the touch `.sp-chat__scroll` rule. App: `ChatScroll` in `Chat.jsx` sets `data-above="true"` when `scrollTop > 1` and `data-below="true"` when `scrollTop + clientHeight < scrollHeight - 1`, and removes each otherwise. It measures on mount, again after the first frame, on every scroll, and from a `ResizeObserver` on the scroll element and its thread, so a new message, a font loading or a resize updates it.

**What is still open.** Nothing.

## 3. A time under every message, and a day line where the day changes

**The problem.** A conversation showed no times, so a chat reopened from Chats gave no sense of when each question was asked.

**What changed.**
- Every message has its time under it, 4px below the bubble, lined up with the bubble's edge: at the left past the mark for Spendly's, at the right for the reader's. 11px, `--ink-5`, 24-hour time.
- An answer's time is when it arrived. While an answer is being written it has none.
- A day line, the existing `.sp-divider`, opens the conversation and stands wherever the day changes. It reads Today, Yesterday, then the day and month (`12 Oct`), with the year added when it is not this year (`12 Oct 2025`).
- A message sent today shows the time only (`14:32`). An earlier one puts its day in front of the time, in the day line's words (`Yesterday 20:40`, `12 Oct 20:40`), so a time whose day line has scrolled out of view never reads as today.
- Times and days are in the reader's own time zone.

**Where.** `Ask Spendly 24a` (the note "Every message has its time under it"), 24b, 24d and the long conversation; `Components c34`; `Mobile screens 7a`. `styles/components.css`: `.sp-chat__time` and `.sp-chat__msg--mine + .sp-chat__time`, after `.sp-chat__thread > .sp-alert`. App: `Chat.jsx`. `ChatMessage` renders a `<time className="sp-chat__time" dateTime={iso}>` after itself from a new `sentAt` prop. `ChatThread`'s caller inserts a `.sp-divider` before the first message and before each message whose day differs from the one before. `ChatReply` in the `working` state has no time.

**What is still open.** Nothing.

## 4. The keys hint under the field is removed

**The problem.** "Enter sends, Shift Enter makes a new line" sat under the field on every desktop conversation. It is not wanted.

**What changed.** The hint is gone. Enter and Shift Enter behave as before. The line under the field (`.sp-chat__hint`) shows only the questions left today, and is absent when there is no limit to show, as on a phone today.

**Where.** `Ask Spendly 24a` (the note on the field) and every dock on the page; `Components c34`. App: `ChatDock` in `Chat.jsx`, which renders the hint row only when `left` is set, on desktop as on the bar.

**What is still open.** Nothing.

## 5. A long conversation in 24a

**The problem.** 24a showed only a short conversation, so the bar, the fades and the day in front of a time had nowhere to be seen.

**What changed.** Under the 24a screen, a copy of it holds a three-day conversation (21 Oct, Yesterday, Today) at the screen's own height. It scrolls in the page, with the bar and the fades following the scroll position. The 24a screen above it is the short conversation, scrolled to its latest message, with no fade.

**Where.** `Ask Spendly 24a`, the specimen "A long conversation, scrolled up". `styles/doc.css`: `.doc-h840`, documentation only.

**What is still open.** Nothing.

## later.md: touch rules found in an iPhone run

**The problem.** In Filters a group heading looked 48px tall, but only its line of text opened it. On Budget, an amount beside a long row name broke into "400.", "00", "kr.". On Check a bank statement, "Other amount" was cut in the four-way switch on a phone. The app fixed these in `app.css`.

**What changed.**
- On touch `.sp-field-group__fold` stretches to the head's height, and its press area takes in the legend's padding under it.
- A `.sp-sum__value` beside a label does not shrink, up to 60% of the row; the label wraps.
- `.sp-segmented--facet` columns are `minmax(max-content, 1fr)`.

**Where.** `styles/components.css`: `.sp-touch .sp-field-group__fold` and its `::after` after `.sp-field-group__fold:focus-visible`; `.sp-sum:not(.sp-sum--stacked) > .sp-sum__value` after `.sp-sum__value`; `grid-auto-columns` in `.sp-segmented--facet`. Remove the three rules at the end of `react/src/styles/app.css`, from "on touch a facet group's whole head" to "a facet switch's options", and the entry "For Claude Design: touch rules found in an iPhone run" from `later.md`.

**What is still open.** Nothing.

## later.md: other entries

"Large accounts still make everyone wait on a few pages" and "A deleted record should not be removed for good at once" are app and server entries outside this brief, so both stay.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Ask Spendly.dc.html` - 24a notes, times and day lines on every thread, the hint removed, the long conversation, and the scroll tracking that drives its fades.
- `Components.dc.html` - c34 with times, a day line and no hint.
- `Mobile screens.dc.html` - 7a with times and a day line.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets. `components.css` carries every rule above; `doc.css` adds `.doc-h840`.
- `styles/pages/ask-spendly.css`, `budget.css`, `mobile-screens.css` - the page stylesheets these pages link.
- `styles/check.js` - the checker.

## styles/check.js

0 finding(s) across 27 pages.

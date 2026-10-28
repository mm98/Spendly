# Load more stops short of the first new card, and a disabled combobox

## 1. later.md: Load more stops short of the first new card

**The problem.** After Load more, the page slides towards the first new record but stops before it reaches the top, and on a large screen it may not move at all. `ListMore` starts the slide in the same pass that adds the records, while they are still on their way in (`PRESENCE.row` in `motion.js`), so it aims at where the record is drawn mid-arrival rather than where it settles. The story's test passes only because animations are off under `npm test`.

**What changed.** The slide starts once the first new record has finished arriving, and stops with that record at the top of the window, or just below a pinned bulk bar. The record takes focus at once, as before. With less motion set, the page moves there at once, as before. When the page is not long enough for the record to reach the top, it scrolls as far as it can: that is expected, not the fault.

How: `Rows` takes `onArrived`, called when a row that arrived finishes its way in (Motion's `onAnimationComplete`, set by `useRow` only while the row is present). `List` (table and cards) keeps one pending slide in a context, `Arrival`; `ListMore` leaves its slide there and the first arrival runs it. No timer is used. A `ListMore` outside a `List` has no `Arrival` and slides at once, as now.

**Where.** `Components.dc.html` c8, the Load more note. `react_handoff/motion.js` (`Rows`, `useRow`) and `react_handoff/List.jsx` (`Arrival`, `useArrival`, `ListCards`, `ListTable`, `ListMore`), against `react/src/components/motion.js` and `react/src/components/List.jsx` on main. This settles the later.md entry "Load more stops short of the first new card"; remove it.

**What is still open.** The fix is written against main's files and not run here. Please confirm in Storybook, Lists/List > Cards, with animations on, that the first new card ends at the top of the window; the story's test needs animations on to catch it.

## 2. A disabled combobox looks like a disabled input

**The problem.** `Combobox` passes `disabled` to its trigger, but no rule styled a disabled `.sp-combobox__trigger`, so a disabled combobox looked enabled and still took the hover border.

**What changed.** A disabled combobox has the disabled input's ground, border, ink, fade and not-allowed cursor; the chevron fades with it, and hover leaves its border alone.

**Where.** `Components.dc.html` c5, Combobox mode 1, the Disabled field and its note. `styles/components.css`: `.sp-combobox__trigger:disabled` joins the `.sp-input:disabled, .sp-textarea:disabled` rule, and `.sp-combobox__trigger:disabled:hover` keeps `--line` inside the `hover: hover` block. App: `react/src/styles/app.css`, the same two selectors; `Combobox.jsx` is unchanged.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - c5 with the disabled combobox, c8 with the Load more note.
- `react_handoff/motion.js` - `Rows` with `onArrived`.
- `react_handoff/List.jsx` - `ListMore` slides once the first new record has arrived.
- `support.js`, `components.js`, `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - what the page loads to open from the folder; `styles/components.css` also carries the disabled combobox rules.

## styles/check.js

0 finding(s) across 28 pages.

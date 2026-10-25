# Load more slides to the first new record

Answers "Brief: Load more slides to the first new record" (from Carsten).

## 1. Load more slides instead of jumping

- **The problem:** after Load more, `ListMore` called `row.scrollIntoView({ block: 'start' })` with no `behavior`, so the page jumped at once to the first record it brought.
- **What changed:** the page slides there with the browser's own smooth scroll (`behavior: 'smooth'`). When the shell is set to move less (`useStill()` from `motion.js`, the app's one reduced-motion setting), it moves at once (`behavior: 'auto'`). Focus still goes to the first new record with `focus({ preventScroll: true })`, so focus causes no second jump during the slide; the fallback to the "Showing N of M" line is unchanged. A reader who moved focus elsewhere since the press is still left alone. The slide's speed is the browser's, so it differs a little between Chrome, Firefox and Safari; no fixed pace is set.
- **Where:** `react_handoff/List.jsx`, `ListMore` (and its `motion.js` import). App: `react/src/components/List.jsx`, same change. It reaches every list that uses `ListMore`, directly or through `List` with `total` + `onLoadMore`: Orders (rows, cards, grid), Vendors, Categories (List, and ListMore in the card view), Bookmarks, Statistics (the order table under the chart), Ask (Files and Chats). No page needs its own change.
- **Storybook:** the `ListMore` / paged `List` story gains a play step that presses Load more and checks that the first new record ends at the top of the scroll area and has focus. Run it with reduced motion on, or wait for the scroll to settle, since the slide is not instant.
- **What is still open:** nothing.

## 2. On a phone with records selected, the slide stops below the bulk bar

- **The problem:** with records selected on a phone, the bulk bar (`.sp-bulkbar--head`) is pinned at the top of the list. Scrolling the first new record to the top would leave it under the bar, out of view.
- **What changed:** before scrolling, `ListMore` sets the row's `scroll-margin-top` to the pinned bulk bar's height when one is on the page, so the slide stops just below the bar. With no pinned bar the margin is cleared and the row stops at the top, as before.
- **Where:** `react_handoff/List.jsx`, `ListMore`. App: `react/src/components/List.jsx`. No stylesheet change.
- **What is still open:** nothing.

## 3. The design text now says what the code does

- **The problem:** two notes said Load more keeps the scroll position, while the code moves the reader to the first new record.
- **What changed:** settled as the slide. The notes now say Load more appends the next page and slides to the first record it brought, which takes focus, or moves there at once with less motion set.
- **Where:** `Components.dc.html` c6, Actions note. `Order statistics.dc.html`, the note "The order table loads one page (Rows per page) at a time", which now points to c6.
- **What is still open:** nothing.

## later.md

- "Large accounts still make everyone wait on a few pages": server work, not design. Not changed.
- "A deleted record should not be removed for good at once": kept for later, at the user's decision. "Recently deleted" is not drawn until its open questions are answered.

## Files

- `README.md` - the design's overview, unchanged copy of the project root.
- `CHANGES.md` - this note.
- `Components.dc.html` - the c6 Actions note.
- `Order statistics.dc.html` - the order table note.
- `React components.dc.html` - renders `react_handoff/`, unchanged.
- `react_handoff/` - every component, as the React components page loads them. Changed: `List.jsx`.
- `support.js`, `components.js`, `icons.js` - what the pages load, unchanged.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/order-statistics.css` - what the pages link, unchanged.

## styles/check.js

0 finding(s) across 27 pages.

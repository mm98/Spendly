# Monthly summary rows: medium mark, no gap between title and meta

Brief: the rows in the monthly summary card on Home take the medium mark, and the title and meta sit together with no gap between them.

## 1. Summary rows take the medium mark

**The problem.** Every row in the monthly summary drew a small mark (24px) beside a two-line title and meta. On Home the mark sat small against the two lines, and the meta sat 6px below the title, unlike every other two-line row in the library (`sp-stacked`, no gap).

**What changed.** Every row in the summary, whether over its limit, close to it or with room to spare, takes the medium mark (42px, `--mark-medium`) with an 18px icon, the size the medium solid mark uses in Components c-mark. The title and meta are one `sp-stacked` pair with no gap. All rows in the list change together, so the list keeps one mark size. Nothing else on the card changes: the row gap (12px), the danger fill, the Adjust button and the footer stay as they were.

**Where.**
- Design: `Duplicate and alerts.dc.html`, section 3 Monthly summary. The marks are `sp-mark--medium`, and the text wrapper is `sp-stacked` where it was `sp-stack sp-gap-6`.
- App: `react/src/pages/Home.jsx`, `MonthlySummary`:
  - over rows: `<CategoryMark category={c} size="medium" />` (was `size="small"`)
  - close rows: `<Mark size="medium" ...><Icon name="alert-triangle" size={18} /></Mark>` (was small, 13)
  - room row: `<Mark size="medium" ...><CategoryIcon name={room.icon} size={18} /></Mark>` (was small, 13)
  - the row link: `className="sp-stacked sp-grow hm-link"` (was `sp-stack sp-gap-6 sp-grow hm-link`)
- No stylesheet rule changes. `sp-mark--medium` and `sp-stacked` exist as they are.

**What is still open.**
- `CategoryMark` must draw its icon at 18 when `size="medium"`. If it currently picks the icon size only for small, please confirm and size it in the same change.

## later.md

Read on main before the task. Two entries, Recently deleted and the go-to keys for Budget, Bookmarks and Home. Neither is a design fix for this task, so both stay and nothing here settles them.

## Files

- `CHANGES.md` - this note.
- `README.md` - the design's overview, unchanged from the project root.
- `Duplicate and alerts.dc.html` - the changed page (section 3).
- `support.js`, `components.js` - needed to open the page from this folder.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the shared stylesheets the page links; unchanged.
- `styles/pages/duplicate-and-alerts.css` - the page's own stylesheet; unchanged.

## styles/check.js

0 finding(s) across 27 pages.

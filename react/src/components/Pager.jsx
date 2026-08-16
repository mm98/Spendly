import { Button } from './Button.jsx'
import { sep } from '../api/format.js'

/* The pager, once. All orders grew it first and the two entity lists rendered every row --
   the setting called "Rows per page" was a fact about one list of three, and README:
   Pagination says every long list pages. One component is what keeps the range sentence,
   the honest disabling at each end and the page-of-pages note from drifting apart the way
   the sort control once did. */

/** Slice a full client-side list into the page the URL asks for. Orders page in SQL because
    the server is already filtering them; vendors and categories arrive whole (every combobox
    and overview reads the same list), so their pages are cut here from the answer the page
    already has. The requested page is clamped, not trusted: a search that shrinks the list
    while the URL says page 4 shows the last real page rather than an empty one. */
export function paginate(listed, page, pageSize) {
	const matched = listed.length
	const pages = Math.max(1, Math.ceil(matched / pageSize))
	const at = Math.min(Math.max(1, page), pages)
	return {
		rows: listed.slice((at - 1) * pageSize, at * pageSize),
		matched, page: at, pages,
		from: matched ? (at - 1) * pageSize + 1 : 0,
		to: Math.min(at * pageSize, matched)
	}
}

export function Pager({ from, to, matched, page, pages, onPage }) {
	return (
		<div className="space-between pager-row">
			<span className="field-help">
				{matched
					? `Showing ${from} to ${to} of ${matched}`
					: 'Nothing to show'}
				{pages > 1 ? `${sep}page ${page} of ${pages}` : ''}
			</span>
			<span className="row-inline pager-buttons">
				<Button variant="ghost" icon="chevronLeft" disabled={page <= 1}
					onClick={() => onPage(Math.max(1, page - 1))}>PREVIOUS</Button>
				<Button variant="ghost" iconAfter="chevronRight" disabled={page >= pages}
					onClick={() => onPage(page + 1)}>NEXT</Button>
			</span>
		</div>
	)
}

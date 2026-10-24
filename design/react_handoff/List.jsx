import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Check } from './Choice.jsx'
import { Button } from './Button.jsx'
import { ListFooter } from './Card.jsx'

/* The list of records, written the way a table is written.

     <List data={orders} recordKey={o => o.ref} noun="orders">
       <Caption>18 orders · 41.960,00 kr.</Caption>
       <Selected>{chosen => <>
         <span className="sp-bulkbar__count">{chosen.length} picked</span>
         <Button color="danger">Delete</Button>
       </>}</Selected>

       <ListHead>
         <ListCell cell="checkbox" />
         <ListCell width="title">Order</ListCell>
         <ListCell width="date">Date</ListCell>
       </ListHead>
       <ListRow>{o => (
         <>
           <ListCell cell="checkbox" />
           <ListCell cell="flex"><Mark kind="vendor" name={o.name} /> …</ListCell>
           <ListCell>{o.date}</ListCell>
         </>
       )}</ListRow>

       <Foot>Exported this morning</Foot>
     </List>

   The head is declared once and the row is a template the data runs through, which
   is HTML's thead and tbody - the head owns each column's heading and width, the row
   owns each cell's treatment and content, and the two are read in the same order.
   That order is the one thing this shape asks of a page, so the list checks it: a
   row with a different number of cells from the head is reported, because every
   column after the gap would otherwise sit under the wrong heading in silence.

   Behaviour stays here, because it is the same on every list: the count, the caption
   becoming the bulk bar, the select-all box and its three states, shift-click taking
   the run, Escape clearing, Load more, and loading more keeping a selection where a
   filter change drops it. Selection exists only where a checkbox cell does - one page needs it,
   and the rest get a plain list with no boxes. Selected is what can be done with
   what is picked; without it the bar still shows the count and a way to clear. */

const WIDTH = {
	title: 'sp-col-title',
	flex: 'sp-col-flex',
	date: 'sp-col-date',
	number: 'sp-col-number',
	status: 'sp-col-status',
	amount: 'sp-col-amount',
	menu: 'sp-col-menu'
}

/* An amount cell IS the stacked pair, so it carries both classes the way the library
   draws it - `.sp-cell-amount` states only the two differences from `.sp-stacked`,
   and without the stack under it the pair loses the flex box those differences need
   and falls back to the left of the column. */
const CELL = { default: null, flex: 'sp-cell-flex', amount: 'sp-stacked sp-cell-amount', menu: 'sp-cell-menu' }

/**
 * What the table is, above it. HTML's caption. Content, or a function of the
 * records; omit it and the list states its own count.
 */
export function Caption() { return null }

/**
 * What the caption becomes once records are picked: the bar's own content, as a
 * function of the records picked, so it can count them and name them and offer
 * what can be done to them. Omit it and the list states the count. Either way the
 * list keeps the select-all box first - that is the system's rule, not a page's.
 * Put an `sp-grow` in the content to say where the split falls. The one part HTML has no word for, since a table
 * does not select.
 */
export function Selected() { return null }

/**
 * The header row: one ListCell per column, each carrying the column's width.
 */
export function ListHead() { return null }

/**
 * The row template. Its child is a function of one record, returning that record's
 * cells in the head's order.
 */
export function ListRow() { return null }

/**
 * Anything the foot carries beside the count and Load more, which the list builds itself.
 */
export function Foot() { return null }

/**
 * One cell. In the head it carries the column's `width` and its heading; in a row
 * it carries the cell's treatment and content.
 *
 * @param {object} props
 * @param {keyof typeof WIDTH} [props.width] Head only. The role, never a measurement - each role's width is declared once in the stylesheet. Exactly one column is `title`, the one with no width of its own.
 * @param {keyof typeof CELL | 'checkbox'} [props.cell] The cell's treatment. `checkbox` is the selecting box: in the head it selects the page, in the row it selects that record, and declaring it in both is what turns selection on - a list with no checkbox cell has no boxes. It takes nothing else; the list hands it what it needs when it draws the row, and it sits where the cells sit so the head and the row still read in the same order.
 * @param {boolean} [props.truncate] Row only. The text takes the cut.
 * @param {import('react').ReactNode} [props.children]
 * @param {boolean} [props.head]
 * @param {number} [props.selectedCount]
 * @param {number} [props.total]
 * @param {string} [props.noun]
 * @param {(checked: boolean) => void} [props.onToggleAll]
 * @param {boolean} [props.checked]
 * @param {string} [props.labelledBy]
 * @param {(shift: boolean) => void} [props.onToggle]
 * @param {string} [props.id]
 */
export function ListCell({ width, cell = 'default', truncate = false, children, head, selectedCount, total, noun, onToggleAll, checked, labelledBy, onToggle, id, ...rest }) {
	reject(rest, 'ListCell')
	if (cell === 'checkbox') {
		if (head)
			return (
				<th className="sp-col-box">
					<SelectAllBox selectedCount={selectedCount} total={total} noun={noun} onToggleAll={onToggleAll} />
				</th>
			)
		return (
			/* picking a record and opening it are two intentions, so the box stops the
			   click from reaching the row */
			<td onClick={ev => ev.stopPropagation()}>
				<Check
					checked={!!checked}
					aria-labelledby={labelledBy}
					onChange={ev => onToggle(ev.nativeEvent && ev.nativeEvent.shiftKey)}
				/>
			</td>
		)
	}
	const plain = cell === 'default' && !truncate
	return (
		<td className={join(cell === 'menu' && 'sp-cell-menu-cell')} id={id}>
			{plain
				? children
				: (
					<span className={join(pick(CELL, cell, 'cell', 'ListCell'), truncate && 'sp-truncate')}>
						{children}
					</span>
				)}
		</td>
	)
}

const flat = kids => [].concat(kids ?? []).flat().filter(k => k && typeof k === 'object')

const partsOf = children => {
	const found = { caption: null, selected: null, head: [], row: null, foot: null, check: false }
	for (const child of flat(children)) {
		if (child.type === Caption) found.caption = child.props.children
		else if (child.type === Selected) found.selected = child.props.children
		else if (child.type === ListHead) {
			const cells = flat(child.props.children)
			found.check = cells.some(c => c.type === ListCell && c.props.cell === 'checkbox')
			found.head = cells.filter(c => !(c.type === ListCell && c.props.cell === 'checkbox')).map(c => c.props)
		}
		else if (child.type === ListRow) found.row = child.props.children
		else if (child.type === Foot) found.foot = child.props.children
		else console.error('<List> takes Caption, Selected, ListHead, ListRow and Foot - nothing else')
	}
	return found
}

/** The box that selects every record on the page. It stands in the header row and
    in the bulk bar, so it is written once. */
function SelectAllBox({ selectedCount, total, noun, onToggleAll }) {
	const all = total > 0 && selectedCount === total
	return (
		<Check
			checked={all}
			indeterminate={selectedCount > 0 && !all}
			aria-label={all ? `Clear the ${total} selected ${noun}` : `Select all ${total} ${noun} on this page`}
			onChange={ev => onToggleAll(ev.target.checked)}
		/>
	)
}

/**
 * Takes no `className` and no `style`.
 *
 * @param {object} props
 * @param {object[]} props.data Already filtered and sorted by the page.
 * @param {(record: object) => string | number} props.recordKey What identifies a record.
 * @param {string} [props.noun] The plural, for the two sentences the list speaks for itself - the select-all box's "Select all 5 orders on this page" and the pager's "The orders before these". Nothing on screen uses it: the caption and the bar are the page's. Defaults to "records", which is true of anything.
 * @param {(record: object) => void} [props.onRowClick] Called with the record whose row was clicked. Without it the rows are not clickable - a row that reacts to a click and does nothing is worse than one that does not react.
 * @param {number} [props.pageSize] How many show at first and how many Load more appends. Default 20. It is the user's setting from Settings, not a page's layout choice - so a page passes the setting through or passes nothing, and never picks a number because it looked right. Lists load more rather than paginate: the foot states the filtered count and one Load more, which disappears once everything is loaded rather than going disabled, and appending keeps the scroll position where paging would have thrown it away.
 * @param {string} [props.selectionKey] Change it when the filters, the search or the sort change and the selection drops - it no longer describes anything. Paging does not, which is the one case the two differ.
 * @param {boolean} [props.compact] The denser row a narrow column affords.
 * @param {import('react').ReactNode} props.children The parts above.
 */
export function List({
	data = [],
	recordKey,
	noun = 'records',
	onRowClick,
	pageSize = 20,
	selectionKey,
	compact = false,
	children,
	...rest
}) {
	reject(rest, 'List')
	const ids = useId()
	const { caption, selected, head, row, foot, check } = partsOf(children)
	if (!row) console.error('<List> needs a ListRow: it is the template every record is drawn through')
	if (head.filter(c => c.width === 'title').length !== 1)
		console.error('<List> the head needs exactly one title cell: it is the column that absorbs the slack')

	const [picked, setPicked] = useState([])
	const [shown, setShown] = useState(pageSize)
	const anchor = useRef(null)
	const warned = useRef(false)

	useEffect(() => { setPicked([]); setShown(pageSize) }, [selectionKey, pageSize])

	// everything loaded so far: the list grows downward, it does not turn pages
	const page = data.slice(0, shown)
	const order = page.map(recordKey)
	const onPage = picked.filter(key => order.includes(key))
	const selecting = check
	const allOnPage = selecting && order.length > 0 && onPage.length === order.length
	const toggleAll = on =>
		setPicked(on ? [...new Set([...picked, ...order])] : picked.filter(key => !order.includes(key)))

	const toggle = (key, shift) => {
		if (shift && anchor.current !== null) {
			const a = order.indexOf(anchor.current)
			const b = order.indexOf(key)
			if (a >= 0 && b >= 0)
				return setPicked(p => [...new Set([...p, ...order.slice(Math.min(a, b), Math.max(a, b) + 1)])])
		}
		anchor.current = key
		setPicked(p => (p.includes(key) ? p.filter(k => k !== key) : [...p, key]))
	}

	/* The row template's cells, in order - and the check that they are the head's
	   order. A row and a head that disagree on how many columns there are is the one
	   way this shape fails, and it fails silently: every cell after the gap sits under
	   the wrong heading. So it is said once, the first time it happens. */
	const cellsOf = record => {
		const cells = row ? flat(row(record)) : []
		const all = cells.length === 1 && cells[0].type !== ListCell ? flat(cells[0].props.children) : cells
		const body = all.filter(c => !(c.type === ListCell && c.props.cell === 'checkbox'))
		if (!warned.current && body.length !== head.length) {
			warned.current = true
			console.error(`<List> the row draws ${body.length} cells under a head of ${head.length} - every cell after the gap sits under the wrong heading`)
		}
		if (!warned.current && selecting && !all.some(c => c.type === ListCell && c.props.cell === 'checkbox')) {
			warned.current = true
			console.error('<List> the head has a checkbox cell and the row does not: the page can be selected and no record can')
		}
		const key = recordKey(record)
		const isPicked = picked.includes(key)
		/* The box is labelled by the row's title cell - the name the row already draws -
		   so a screen reader hears "Indbo Møbler, SPENDLY-447, checkbox" without the page
		   supplying the name a second time. The cell under the title heading gets an id
		   and the box points at it. */
		const titleAt = head.findIndex(c => c.width === 'title')
		const titleId = `${ids}-${key}-title`
		let bodyIndex = -1
		return all.map((c, n) => {
			if (c.type === ListCell && c.props.cell === 'checkbox')
				return cloneElement(c, { key: 'check', checked: isPicked, labelledBy: titleId, onToggle: shift => toggle(key, shift) })
			bodyIndex++
			return cloneElement(c, { key: c.key ?? n, ...(bodyIndex === titleAt ? { id: titleId } : {}) })
		})
	}

	const one = noun.replace(/s$/, '')
	const chosen = data.filter(r => picked.includes(recordKey(r)))

	/* Both slots take content or a function, and both have a default: the caption
	   states the count of everything, the selected bar states the count of what is
	   picked. A page writes either only where the default is not what it means. */
	const slot = (given, arg, fallback) =>
		given === null || given === undefined ? fallback : typeof given === 'function' ? given(arg) : given
	const captionContent = slot(caption, data, <strong className="sp-data">{data.length} {noun}</strong>)
	const selectedContent = slot(selected, chosen,
		<span className="sp-bulkbar__count">{chosen.length === 1 ? `1 ${one} picked` : `${chosen.length} ${noun} picked`}</span>)

	return (
		<div className="sp-list" {...rest}>
			{picked.length && selecting
				? (
					<div className="sp-bulkbar">
						<SelectAllBox selectedCount={onPage.length} total={order.length} noun={noun} onToggleAll={toggleAll} />
						{selectedContent}
					</div>
				)
				: (
					<div className="sp-list__toolbar">
						{captionContent}
					</div>
				)}

			<table
				className={join('sp-table', compact && 'sp-table--compact', allOnPage && 'sp-table--all-selected')}
				onKeyDown={ev => { if (ev.key === 'Escape' && picked.length) { ev.stopPropagation(); setPicked([]) } }}
			>
				<thead>
					<tr>
						{selecting ? <ListCell cell="checkbox" head selectedCount={onPage.length} total={order.length} noun={noun} onToggleAll={toggleAll} /> : null}
						{head.map((c, n) => (
							<th scope={c.children ? 'col' : undefined} className={pick(WIDTH, c.width, 'width', 'ListCell')} key={n}>
								{c.children}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{page.map(record => {
						const key = recordKey(record)
						const isPicked = picked.includes(key)
						return (
							<tr
								key={key}
								{...(selecting ? { 'aria-selected': isPicked ? 'true' : 'false' } : {})}
								onClick={onRowClick ? () => onRowClick(record) : undefined}
							>
								{cellsOf(record)}
							</tr>
						)
					})}
				</tbody>
			</table>

			{foot || data.length > pageSize
				? (
					<ListFooter>
						<span className="sp-subtitle">Showing {page.length} of {data.length}</span>
						{foot}
						<span className="sp-grow" />
						{/* gone once everything is loaded, not disabled: a disabled Load more is
						    a promise of more that will not be kept */}
						{page.length < data.length
							? <Button variant="outline" size="small" onClick={() => setShown(s => s + pageSize)}>Load more</Button>
							: null}
					</ListFooter>
				)
				: null}
		</div>
	)
}

const TOOLBAR = { default: null, loose: 'sp-list__toolbar--loose', link: 'sp-list__toolbar--link', toggle: 'sp-list__toolbar--toggle' }


import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { join, pick, reject } from './variants.js'
import { Check } from './Choice.jsx'
import { Button } from './Button.jsx'
import { ListFooter } from './Card.jsx'

const WIDTH = {
	title: 'sp-col-title',
	flex: 'sp-col-flex',
	date: 'sp-col-date',
	number: 'sp-col-number',
	status: 'sp-col-status',
	amount: 'sp-col-amount',
	menu: 'sp-col-menu'
}

const CELL = { default: null, flex: 'sp-cell-flex', amount: 'sp-stacked sp-cell-amount', menu: 'sp-cell-menu' }

/** What the table is, above it. HTML's caption. Content, or a function of the
    records; omit it and the list states its own count. */
export function Caption() { return null }

export function Selected() { return null }

/** The header row: one ListCell per column, each carrying the column's width. */
export function ListHead() { return null }

/** The row template. Its child is a function of one record, returning that record's
    cells in the head's order. */
export function ListRow() { return null }

/** Anything the foot carries beside the count and Load more, which the list builds itself. */
export function Foot() { return null }

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


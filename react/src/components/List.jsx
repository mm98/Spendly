import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { join, pick, reject } from './variants.js'
import { MenuHostOf, useMenuButton, useMenuPlace } from './Overlays.jsx'
import { within } from './Utilities.jsx'
import { Check } from './Choice.jsx'
import { Button } from './Button.jsx'
import { Cards, ListFooter } from './Card.jsx'
import { Icon } from './Icon.jsx'
import { formatNumber, singular } from './format.js'

const WIDTH = {
	title: 'sp-col-title',
	flex: 'sp-col-flex',
	date: 'sp-col-date',
	number: 'sp-col-number',
	status: 'sp-col-status',
	amount: 'sp-col-amount',
	menu: 'sp-col-menu'
}

const CELL = { default: null, flex: 'sp-cell-flex', amount: 'sp-stacked sp-cell-amount', menu: 'sp-cell-menu', number: null }

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

export function ListCell({ width, column, cell = 'default', truncate = false, children, head, selectedCount, total, noun, onToggleAll, checked, labelledBy, onToggle, id, to, ...rest }) {
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
	const plain = (cell === 'default' || cell === 'number') && !truncate
	const classes = join(column && WIDTH[column], cell === 'menu' && 'sp-cell-menu-cell', cell === 'number' && 'sp-col-number')
	// the title of a row that goes somewhere is that row's link: a tab stop, and it opens in a new tab
	if (to) return (
		<td className={classes} id={id}>
			<Link className={join('sp-cell-flex', truncate && 'sp-truncate')} to={to} data-go={to} data-row-link="">{children}</Link>
		</td>
	)
	return (
		<td className={classes} id={id}>
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
	// a record's route: each row is then a link to it, by its title cell
	rowTo,
	pageSize = 20,
	selectionKey,
	// a page that keeps the selection itself (it outlives this list, as across a view toggle):
	// the keys picked, and what to do with the next set
	picked: pickedGiven,
	onPick,
	// a record that does not count (a cancelled order), drawn faded (2b)
	rowVoid,
	// a line under the bulk bar, as Select all N matching (Order list 2h)
	bulkNote,
	compact = false,
	total,
	onLoadMore,
	headless = false,
	// whose way of grouping thousands the counts are written in; the browser's when absent
	locale,
	children,
	...rest
}) {
	reject(rest, 'List')
	const counted = n => formatNumber(n, { locale, decimals: 0 })
	if (rowTo && onRowClick) console.error('<List> a row either goes somewhere (rowTo) or acts (onRowClick), not both')
	const navigate = useNavigate()
	// `total` means the server pages: `data` is everything loaded so far and Load more asks it for the next page
	const served = total !== undefined
	if (served && !onLoadMore) console.error('<List total> needs onLoadMore: the rest of the records are on the server')
	const ids = useId()
	const { caption, selected, head, row, foot, check } = partsOf(children)
	if (!row) console.error('<List> needs a ListRow: it is the template every record is drawn through')
	if (head.filter(c => c.width === 'title').length !== 1)
		console.error('<List> the head needs exactly one title cell: it is the column that absorbs the slack')

	const [pickedOwn, setPickedOwn] = useState([])
	const controlled = pickedGiven !== undefined
	if (controlled && !onPick) console.error('<List picked> needs onPick: the page keeps the selection')
	const picked = controlled ? pickedGiven : pickedOwn
	const latest = useRef(picked)
	latest.current = picked
	const setPicked = next => {
		const value = typeof next === 'function' ? next(latest.current) : next
		latest.current = value
		if (controlled) onPick(value)
		else setPickedOwn(value)
	}
	const [shown, setShown] = useState(pageSize)
	const anchor = useRef(null)
	const warned = useRef(false)

	useEffect(() => { if (!controlled) setPickedOwn([]); setShown(pageSize) }, [selectionKey, pageSize, controlled])

	// everything loaded so far: the list grows downward, it does not turn pages
	const page = served ? data : data.slice(0, shown)
	const count = served ? total : data.length
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
			const title = bodyIndex === titleAt
			// with no head row, each cell carries its column's width itself
			return cloneElement(c, { key: c.key ?? n, ...(title ? { id: titleId } : {}), ...(title && rowTo ? { to: rowTo(record) } : {}), ...(headless ? { column: head[bodyIndex]?.width } : {}) })
		})
	}

	// a press anywhere on a linked row does what a press on its link does; its own controls keep theirs
	const follow = (ev, to) => {
		if (ev.target.closest('a, button, input, label, select, textarea')) return
		if (ev.button !== 0 && ev.button !== 1) return
		if (ev.button === 1 || ev.ctrlKey || ev.metaKey || ev.shiftKey) {
			const href = ev.currentTarget.querySelector('[data-row-link]')?.href
			if (href) window.open(href, '_blank', 'noopener')
			return
		}
		navigate(to)
	}

	const one = singular(noun)
	const chosen = data.filter(r => picked.includes(recordKey(r)))

	const slot = (given, arg, fallback) =>
		given === null || given === undefined ? fallback : typeof given === 'function' ? given(arg) : given
	const captionContent = slot(caption, data, <strong className="sp-data">{counted(count)} {count === 1 ? one : noun}</strong>)
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
			{picked.length && selecting && bulkNote ? <div className="sp-bulkbar sp-bulkbar--note">{bulkNote}</div> : null}

			<table
				className={join('sp-table', compact && 'sp-table--compact', allOnPage && 'sp-table--all-selected')}
				onKeyDown={ev => {
					if (ev.key === 'Escape' && picked.length) { ev.stopPropagation(); setPicked([]) }
					// up and down walk the rows' links (c1)
					if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && ev.target.matches?.('[data-row-link]')) {
						const links = [...ev.currentTarget.querySelectorAll('[data-row-link]')]
						const next = links[links.indexOf(ev.target) + (ev.key === 'ArrowDown' ? 1 : -1)]
						if (next) { ev.preventDefault(); next.focus() }
					}
				}}
			>
				{headless ? null : <thead>
					<tr>
						{selecting ? <ListCell cell="checkbox" head selectedCount={onPage.length} total={order.length} noun={noun} onToggleAll={toggleAll} /> : null}
						{head.map((c, n) => (
							<th scope={c.children ? 'col' : undefined} className={pick(WIDTH, c.width, 'width', 'ListCell')} key={n}>
								{c.children}
							</th>
						))}
					</tr>
				</thead>}
				<tbody>
					{page.map(record => {
						const key = recordKey(record)
						const isPicked = picked.includes(key)
						return (
							<tr
								key={key}
								{...(selecting ? { 'aria-selected': isPicked ? 'true' : 'false' } : {})}
								{...(rowVoid?.(record) ? { 'data-void': 'true' } : {})}
								onClick={rowTo ? ev => follow(ev, rowTo(record)) : onRowClick ? () => onRowClick(record) : undefined}
								onAuxClick={rowTo ? ev => follow(ev, rowTo(record)) : undefined}
							>
								{cellsOf(record)}
							</tr>
						)
					})}
				</tbody>
			</table>

			<ListMore shown={page.length} total={count} pageSize={foot ? 0 : pageSize} locale={locale}
				onMore={served ? onLoadMore : () => setShown(s => s + pageSize)}>{foot}</ListMore>
		</div>
	)
}

/** The foot of a list that grows by pages (c1), once there is more than one: how many of how many, and
    Load more while more remain. `loose` as ListFooter's; `children` sits beside the count. */
export function ListMore({ shown, total, pageSize = 0, onMore, loose = false, locale, children, ...rest }) {
	reject(rest, 'ListMore')
	const line = useRef(null)
	const asked = useRef(null)
	// the last Load more goes with its page: focus moves to the first record it brought, else to this line
	useEffect(() => {
		const from = asked.current
		if (from == null || shown <= from) return
		asked.current = null
		const lost = !document.activeElement || document.activeElement === document.body
		if (!lost || !line.current) return
		const foot = line.current.parentElement
		const kin = [...foot.parentElement.children].filter(c => c !== foot)
		const rows = kin.length >= shown ? kin : [...foot.parentElement.querySelectorAll('tbody > tr')]
		const row = rows.length >= shown ? rows[rows.length - shown + from] : null
		const target = row?.matches('a[href], button') ? row : row?.querySelector('a[href], button')
		;(target ?? line.current).focus()
	}, [shown])
	if (!(total > pageSize)) return null
	const counted = n => formatNumber(n, { locale, decimals: 0 })
	const more = () => { asked.current = shown; onMore?.() }
	return (
		<ListFooter loose={loose} {...rest}>
			<span className="sp-subtitle" ref={line} tabIndex={-1}>Showing {counted(shown)} of {counted(total)}</span>
			{children}
			<span className="sp-grow" />
			{/* gone once everything is loaded, not disabled: a disabled Load more is
			    a promise of more that will not be kept */}
			{shown < total ? <Button variant="outline" size="small" onClick={more}>Load more</Button> : null}
		</ListFooter>
	)
}


/** What can be done to the records picked (c1, c12), standing in for whatever sat there before
    the first pick. `loose` carries its own border, for a set with no list around it. */
export function BulkBar({ loose = false, count, onClear, children, ...rest }) {
	reject(rest, 'BulkBar')
	return (
		<div className={join('sp-bulkbar', loose && 'sp-bulkbar--loose')} {...rest}>
			<Check checked aria-label="Clear the selection" onChange={() => onClear?.()} />
			<span className="sp-bulkbar__count">{count}</span>
			<span className="sp-grow" />
			<div className="sp-row-flex sp-gap-8">{children}</div>
		</div>
	)
}

/** The summary line over a grid of cards (2c), where no list draws one: `loose` carries its own border. */
export function ListToolbar({ loose = false, children, ...rest }) {
	reject(rest, 'ListToolbar')
	return <div className={join('sp-list__toolbar', loose && 'sp-list__toolbar--loose')} {...rest}>{children}</div>
}

/** The bar above a list (c20): search, then pickers and the one button, each at its own width. */
export function Controls({ children, ...rest }) {
	reject(rest, 'Controls')
	return <div className="sp-controls" {...rest}>{children}</div>
}

/** What is filtering the list, one removable crumb each, and Clear all (c12, Order list 2b). */
export function Filters({ onClear, children, ...rest }) {
	reject(rest, 'Filters')
	return (
		<div className="sp-filters" onClickCapture={keepFocus} {...rest}>
			{children}
			{onClear ? <Button variant="outline" size="small" onClick={onClear}>Clear all</Button> : null}
		</div>
	)
}

const CONTROL = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'

/* A crumb or Clear all leaves with its click; focus goes to the next crumb's remove, else the one
   before, else the control after the row, else the one before it. */
function keepFocus(ev) {
	const row = ev.currentTarget
	const hit = ev.target.closest('button')
	if (!hit || !row.contains(hit)) return
	const removes = [...row.querySelectorAll('.sp-crumb__remove')]
	const at = removes.indexOf(hit)
	const all = [...document.querySelectorAll(CONTROL)].filter(c => c.checkVisibility?.() !== false)
	const after = all.find(c => !row.contains(c) && (row.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING))
	const before = all.findLast(c => !row.contains(c) && (row.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING))
	const order = [at >= 0 ? removes[at + 1] : null, at > 0 ? removes[at - 1] : null, after, before].filter(Boolean)
	const settle = () => {
		if (document.activeElement && document.activeElement !== document.body) return
		order.find(c => c.isConnected)?.focus()
	}
	// the list answers later than the row: checked again once it has
	for (const wait of [0, 300, 1000]) setTimeout(settle, wait)
}

/** The facet rail's groups (c12): one `FieldGroup facet` per thing the list can be filtered by. */
export function Facets({ children, ...rest }) {
	reject(rest, 'Facets')
	return <div className="sp-facets" {...rest}>{children}</div>
}

/** One filter or one drill level. `name` is what the remove control says it removes. An earlier
    level of a drill path has no remove; `onOpen` goes back to it instead (4c). */
export function Crumb({ name, onRemove, onOpen, children, ...rest }) {
	reject(rest, 'Crumb')
	if (onOpen) return <button type="button" className="sp-crumb" onClick={onOpen} {...rest}>{children}</button>
	return (
		<span className="sp-crumb" {...rest}>
			{children}
			<button type="button" className="sp-crumb__remove" aria-label={`Remove ${name ?? children}`} onClick={onRemove}>×</button>
		</span>
	)
}

/** The drill path (c8): the root as text, then a Crumb for every level drilled into. */
export function Crumbs({ root, children, ...rest }) {
	reject(rest, 'Crumbs')
	const levels = [].concat(children ?? []).flat().filter(Boolean)
	return (
		<nav aria-label="Drill path" {...rest}>
			<ol className="sp-crumbs">
				{root ? <li><span className="sp-crumbs__root">{root}</span></li> : null}
				{levels.map((level, i) => <li key={level.key ?? i}>{level}</li>)}
			</ol>
		</nav>
	)
}

/** A record as a card (2c, 22a). No `photos` draws the `empty` band, `meta` is one line or two;
    `href` makes the strip a link out, named by `hrefLabel`; `menu.onClose` runs as focus leaves. */
export function Record({ photos = [], empty, more, href, hrefLabel, pick, menu, title, subtitle, status, chips, meta, amount, onClick, void: isVoid = false, ...rest }) {
	reject(rest, 'Record')
	const menuBox = useRef(null)
	const menuKeys = useMenuButton(menuBox, !!menu?.open)
	useMenuPlace(menuBox, !!menu?.open)
	const strip = photos.length
		? photos.map((photo, i) => <span className="sp-record__photo" key={i}>{photo}</span>)
		: <><Icon name="photo" size={22} /><span className="sp-meta">{empty}</span></>
	const stripClass = join('sp-record__photos', !photos.length && 'sp-record__photos--empty')
	const extras = <>{more ? <span className="sp-mark__count">{more}</span> : null}{pick ? <label className="sp-record__pick">{pick}</label> : null}</>
	const lines = [].concat(meta ?? [])
	return (
		<article className="sp-record" onClick={onClick} {...(isVoid ? { 'data-void': 'true' } : {})} {...rest}>
			{href
				? <a className={stripClass} href={href} target="_blank" rel="noopener noreferrer" aria-label={hrefLabel} onClick={ev => ev.stopPropagation()}>{strip}{extras}</a>
				: <div className={stripClass}>{strip}{extras}</div>}
			{menu ? <div className="sp-cell-menu sp-record__menu" data-open={menu.open ? 'true' : 'false'} data-menu-open={menu.open ? 'true' : undefined} ref={menuBox} {...menuKeys} onClick={ev => ev.stopPropagation()}
				onBlur={ev => { if (menu.open && ev.relatedTarget && !within(menuBox.current, ev.relatedTarget)) menu.onClose?.() }}>
				<button type="button" className="sp-record__act" aria-label={menu.label} aria-haspopup="menu" aria-expanded={menu.open ? 'true' : 'false'} onClick={menu.onToggle}>
					<Icon name="dots-vertical" size={12} />
				</button>
				<MenuHostOf open={!!menu.open} box={menuBox}>{menu.children}</MenuHostOf>
			</div> : null}
			<div className="sp-record__body">
				<div className="sp-record__head">
					<span className="sp-stacked sp-grow">
						<span className="sp-title sp-truncate">{title}</span>
						{subtitle ? <span className="sp-subtitle sp-truncate">{subtitle}</span> : null}
					</span>
					{status}
				</div>
				{chips ? <div className="sp-record__chips" onClick={ev => ev.stopPropagation()}>{chips}</div> : null}
				<span className="sp-grow" />
				<div className={join('sp-record__foot', lines.length < 2 && 'sp-record__foot--single')}>
					{lines.length < 2 ? lines[0] : <span className="sp-stack sp-gap-6">{lines}</span>}
					<span className="sp-grow" />
					<span className="sp-amount">{amount}</span>
				</div>
			</div>
		</article>
	)
}

/** The list as a grid of Record cards (c1 cards, Order list 2c, Bookmarks 22a): no ground of its
    own, the grid, then `footer` under it at the grid's width: a `<ListMore loose>`. `head` stands
    above the grid: the summary line or the bulk bar, each `loose` (2c). */
export function Records({ head, footer, children, ...rest }) {
	reject(rest, 'Records')
	return (
		<div className="sp-list sp-list--cards" {...rest}>
			{head}
			<Cards>{children}</Cards>
			{footer}
		</div>
	)
}

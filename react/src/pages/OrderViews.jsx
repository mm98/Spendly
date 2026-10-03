import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { FieldGroup } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { NavItem } from '../components/Shell.jsx'
import { useDismiss } from '../components/Utilities.jsx'
import { addView, changeView, deleteView, failureMessage, orderViewsAs } from '../api/client.js'
import { amount } from '../api/format.js'
import { ALL_ORDERS, ViewMark, canonical, useViews, viewLink } from '../app/views.jsx'

/** Which view the list is showing (2g, 9e): the one it was opened from, else one whose address it
    matches; and whether the filters have moved since that view was saved. */
export function useActiveView(params) {
	const views = useViews().data?.views ?? []
	const savedId = params.get('saved')
	const now = canonical(params)
	const active = views.find(v => v.id === savedId) ?? (savedId || !now ? null : views.find(v => canonical(v.query) === now) ?? null)
	return { views, active, now, edited: Boolean(active) && canonical(active.query) !== now }
}

/** The Views card (2g): All orders and the saved views with live counts, read-only at rest. Its
    header holds one action: Save when the filters differ from the view in force, Edit otherwise,
    Cancel while a name is typed, Done while editing. */
export function ViewsCard({ params, matched, summary, onList = true }) {
	const navigate = useNavigate()
	const toast = useToast()
	const answer = useViews()
	const { views, active, now, edited } = useActiveView(params)
	const [mode, setMode] = useState('rest')
	const [renaming, setRenaming] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [order, setOrder] = useState(null)
	const [drag, setDrag] = useState(null)
	const [said, setSaid] = useState('')
	const rows = useRef(null)
	useEffect(() => setOrder(null), [answer.data])
	const list = order ?? views

	const fail = (e, what) => toast({ message: failureMessage(e, what), color: 'danger' })

	const save = name => addView({ name, query: now })
		.then(out => { setMode('rest'); navigate(viewLink({ id: out.id, query: now })) })
		.catch(e => fail(e, 'The view was not saved. Try again.'))
	const update = () => changeView(active.id, { query: now })
		.then(() => { navigate(viewLink({ id: active.id, query: now }), { replace: true }); toast({ message: `${active.name} now shows these filters.` }) })
		.catch(e => fail(e, 'The view was not changed. Try again.'))
	const revert = () => navigate(viewLink(active), { replace: true })
	const rename = (view, name) => changeView(view.id, { name })
		.then(() => setRenaming(null))
		.catch(e => fail(e, 'The view was not renamed. Try again.'))
	const makeDefault = view => changeView(view.id, { isDefault: !view.isDefault })
		.then(() => toast({ message: view.isDefault ? 'Orders opens on All orders again.' : `Orders now opens on ${view.name}.` }))
		.catch(e => fail(e, 'That was not saved. Try again.'))
	const remove = view => deleteView(view.id)
		.then(() => { setDeleting(null); toast({ message: `The view ${view.name} was deleted.` }); if (active?.id === view.id) navigate(ALL_ORDERS) })
		.catch(e => { setDeleting(null); fail(e, 'The view was not deleted. Try again.') })
	const moveTo = (view, to) => {
		const from = list.findIndex(v => v.id === view.id)
		if (to === from || to < 0 || to >= list.length) return
		const next = [...list]
		next.splice(to, 0, next.splice(from, 1)[0])
		setOrder(next)
		orderViewsAs(next.map(v => v.id)).catch(e => { setOrder(null); fail(e, 'The new order was not saved. Try again.') })
	}
	// a drag in edit mode is let go before the first row whose middle is below the pointer
	const dropAt = y => {
		const all = [...(rows.current?.querySelectorAll('[data-view]') ?? [])]
		const at = all.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2 })
		return at < 0 ? all.length : at
	}
	const handleEvents = view => ({
		onPointerDown: ev => {
			if (!ev.target.closest('.sp-list-item__handle')) return
			ev.preventDefault()
			ev.currentTarget.setPointerCapture(ev.pointerId)
			setDrag({ id: view.id, at: dropAt(ev.clientY) })
		},
		onPointerMove: ev => { if (drag?.id === view.id) setDrag({ id: view.id, at: dropAt(ev.clientY) }) },
		onPointerUp: () => {
			if (drag?.id !== view.id) return
			const from = list.findIndex(v => v.id === view.id)
			setDrag(null)
			moveTo(view, drag.at > from ? drag.at - 1 : drag.at)
		},
		// the arrows move the row whose handle has focus, one place at a time
		onKeyDown: ev => {
			if (!ev.target.closest('.sp-list-item__handle')) return
			const step = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0
			if (!step) return
			ev.preventDefault()
			const at = list.findIndex(v => v.id === view.id)
			if (at + step < 0 || at + step >= list.length) return
			moveTo(view, at + step)
			setSaid(`${view.name}, position ${at + step + 1} of ${list.length}`)
		}
	})

	const slot = mode === 'editing' ? <Button size="small" onClick={() => setMode('rest')}>Done</Button>
		: mode === 'naming' ? <Button variant="outline" size="small" onMouseDown={ev => ev.preventDefault()} onClick={() => setMode('rest')}>Cancel</Button>
			: now && (!active || edited) ? <Button variant="outline" size="small" onClick={() => setMode('naming')}>Save</Button>
				: <Button variant="outline" size="small" onClick={() => setMode('editing')}>Edit</Button>
	const count = n => (n == null ? undefined : amount(n, 0))

	return (
		<Card footerLayout="split" footerCommits
			footer={edited && mode === 'rest'
				? [<Button key="u" variant="outline" fullWidth onClick={update}>Update</Button>, <Button key="r" variant="outline" fullWidth onClick={revert}>Revert</Button>]
				: null}>
			<div className="sp-row-flex">
				<span className="sp-section-label">Views</span>
				<span className="sp-grow" />
				{slot}
			</div>
			{/* at rest the views are links; editing, they are rows to move, rename and delete (9e) */}
			<div className={mode === 'editing' ? 'sp-stack sp-gap-8' : 'sp-nav-list'} ref={rows}>
				<Announce>{said}</Announce>
				{mode === 'naming' ? <ViewName count={matched} onSave={save} onCancel={() => setMode('rest')} /> : null}
				{mode === 'editing'
					? (
						<ListItem mark={<span className="sp-nav-item__icon"><Icon name="receipt" /></span>}>
							<span className="sp-subtitle sp-grow sp-truncate">All orders</span>
							<span className="sp-meta">locked</span>
						</ListItem>
					)
					: <NavItem variant="light" icon="receipt" to={ALL_ORDERS} current={onList && !active && !now} count={count(answer.data?.all)}>All orders</NavItem>}
				{list.map((view, i) => (
					<Fragment key={view.id}>
						{drag && drag.at === i && drag.id !== view.id ? <Insertion /> : null}
						{renaming === view.id
							? <ViewName name={view.name} count={view.count} onSave={name => rename(view, name)} onCancel={() => setRenaming(null)} />
							: mode === 'editing'
								? (
									<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Reorder ${view.name}`} data-view={view.id} {...handleEvents(view)}
										variant={drag?.id === view.id ? 'carried' : 'default'}>
										<span className="sp-data sp-grow sp-truncate">{view.name}</span>
										<ViewMenu view={view} onRename={() => setRenaming(view.id)} onDefault={() => makeDefault(view)} onDelete={() => setDeleting(view)} />
									</ListItem>
								)
								: (
									<NavItem variant={active?.id === view.id && edited ? 'edited' : 'light'} to={viewLink(view)} mark={<ViewMark query={view.query} />}
										current={active?.id === view.id} count={count(view.count)} countColor={view.attention ? 'warning' : undefined}
										title={active?.id === view.id && edited ? 'Changed since it was saved' : undefined}
										>{view.name}</NavItem>
								)}
					</Fragment>
				))}
				{drag && drag.at === list.length ? <Insertion /> : null}
			</div>
			{mode === 'naming' ? <span className="sp-meta">{summary}</span> : null}
			{deleting
				? (
					<Dialog onCancel={() => setDeleting(null)} aria-label={`Delete the view ${deleting.name}?`}>
						<div className="sp-stack sp-gap-12">
							<div className="sp-row-flex sp-gap-12">
								<Mark size="medium" aria-hidden="true" aria-label="Delete"><Icon name="trash" size={17} /></Mark>
								<DialogTitle>Delete the view {deleting.name}?</DialogTitle>
							</div>
							<DialogBody>The orders stay. Only this saved view is deleted, from here and from the menu.</DialogBody>
							<DialogActions>
								<Button variant="outline" fullWidth onClick={() => setDeleting(null)}>Keep it</Button>
								<Button color="danger" fullWidth onClick={() => remove(deleting)}>Delete view</Button>
							</DialogActions>
						</div>
					</Dialog>
				)
				: null}
		</Card>
	)
}

/* A name typed where the view's row will stand (2g): Enter saves, Escape or leaving the field
   cancels, and an empty name is never saved. The count shows how many orders it names. */
function ViewName({ name = '', count, onSave, onCancel }) {
	const [text, setText] = useState(name)
	const field = useRef(null)
	useEffect(() => { field.current?.focus() }, [])
	const done = useRef(false)
	const commit = () => {
		if (done.current) return
		done.current = true
		if (text.trim()) onSave(text.trim())
		else onCancel()
	}
	return (
		<span className="sp-field__wrap">
			<span className="sp-field__lead"><Icon name="bookmark" size={14} /></span>
			<TextField inputRef={field} lead unit value={text} onChange={setText} placeholder="Name this view" aria-label="Name this view" maxLength={60}
				onKeyDown={ev => {
					if (ev.key === 'Enter') { ev.preventDefault(); commit() }
					if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done.current = true; onCancel() }
				}}
				onBlur={() => { if (!done.current) { done.current = true; onCancel() } }} />
			{count != null ? <span className="sp-field__unit">{amount(count, 0)}</span> : null}
		</span>
	)
}

/* A saved view's own menu, in edit mode only (2g). */
function ViewMenu({ view, onRename, onDefault, onDelete }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" size="small" aria-label={`${view.name} actions`} aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'}
				onClick={() => setOpen(!open)} />
			{open
				? (
					<Menu position="floating" aria-label={view.name}>
						<MenuItem icon="pencil" onClick={() => { close(); onRename() }}>Rename</MenuItem>
						<MenuItem icon="star" onClick={() => { close(); onDefault() }}>{view.isDefault ? 'Stop opening with it' : 'Make default'}</MenuItem>
						<MenuSeparator />
						<MenuItem icon="trash" danger onClick={() => { close(); onDelete() }}>Delete view</MenuItem>
					</Menu>
				)
				: null}
		</Anchor>
	)
}

/** The views as the phone reaches them (9e, 9h): More's Saved views opens this card alone, away from
    any list, so nothing in it is the list in force. */
export default function SavedViews() {
	return <ViewsCard params={new URLSearchParams()} onList={false} />
}

/** The views at the top of the phone's filter sheet (9e): a tap opens one at once, as on the rail. */
export function SheetViews({ params, onOpen }) {
	const answer = useViews().data
	const { active, now } = useActiveView(params)
	if (!answer) return null
	return (
		<FieldGroup facet legend="Views">
			<div className="sp-nav-list">
				<NavItem variant="light" icon="receipt" to={ALL_ORDERS} onClick={onOpen} current={!active && !now} count={amount(answer.all, 0)}>All orders</NavItem>
				{answer.views.map(view => (
					<NavItem key={view.id} variant="light" to={viewLink(view)} onClick={onOpen} mark={<ViewMark query={view.query} />} current={active?.id === view.id}
						count={amount(view.count, 0)} countColor={view.attention ? 'warning' : undefined}>{view.name}</NavItem>
				))}
			</div>
		</FieldGroup>
	)
}

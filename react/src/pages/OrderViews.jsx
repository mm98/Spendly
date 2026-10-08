import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { FieldGroup } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { NavItem } from '../components/Shell.jsx'
import { useReorder } from '../components/Reorder.js'
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

/** The Views card (2g), read-only at rest. Its header holds one action: Save when the filters differ
    from the view in force, Edit otherwise, Cancel while a name is typed, Done while editing. */
export function ViewsCard({ params, matched, summary, onList = true }) {
	const navigate = useNavigate()
	const toast = useToast()
	const answer = useViews()
	const { views, active, now, edited } = useActiveView(params)
	const [mode, setMode] = useState('rest')
	const [renaming, setRenaming] = useState(null)
	const [deleting, setDeleting] = useState(null)
	const [order, setOrder] = useState(null)
	useEffect(() => setOrder(null), [answer.data])

	const fail = (e, what) => toast({ message: failureMessage(e, what), color: 'danger' })

	const save = name => addView({ name, query: now })
		.then(out => { setMode('rest'); navigate(viewLink({ id: out.id, query: now })) })
		.catch(e => fail(e, 'The view was not saved. Try again.'))
	// both are reversible, so each is told in a toast with Undo (6d)
	const update = () => {
		const was = active.query
		changeView(active.id, { query: now })
			.then(() => {
				navigate(viewLink({ id: active.id, query: now }), { replace: true })
				toast({ message: `${active.name} now shows these filters.`, undo: { label: 'Undo', onClick: () => changeView(active.id, { query: was }).catch(e => fail(e, 'The view was not changed back. Try again.')) } })
			})
			.catch(e => fail(e, 'The view was not changed. Try again.'))
	}
	const revert = () => navigate(viewLink(active), { replace: true })
	const rename = (view, name) => changeView(view.id, { name })
		.then(() => setRenaming(null))
		.catch(e => fail(e, 'The view was not renamed. Try again.'))
	const makeDefault = view => {
		const before = views.find(v => v.isDefault)
		const back = () => (before ? changeView(before.id, { isDefault: true }) : changeView(view.id, { isDefault: false }))
		changeView(view.id, { isDefault: !view.isDefault })
			.then(() => toast({
				message: view.isDefault ? 'Orders opens on All orders again.' : `Orders now opens on ${view.name}.`,
				undo: { label: 'Undo', onClick: () => back().catch(e => fail(e, 'That was not changed back. Try again.')) }
			}))
			.catch(e => fail(e, 'That was not saved. Try again.'))
	}
	// the dialog closing is the confirmation, so no toast follows it (6d)
	const remove = view => deleteView(view.id)
		.then(() => { setDeleting(null); if (active?.id === view.id) navigate(ALL_ORDERS) })
		.catch(e => { setDeleting(null); fail(e, 'The view was not deleted. Try again.') })
	// reordering saves on drop (9e), and a save that fails puts the views back and says so (c1)
	const reorder = useReorder({
		items: order ?? views,
		keyOf: view => view.id,
		nameOf: view => view.name,
		onMove: next => {
			setOrder(next)
			orderViewsAs(next.map(v => v.id)).catch(e => { setOrder(null); fail(e, 'The new order was not saved. Try again.') })
		}
	})

	const slot = mode === 'editing' ? <Button variant="outline" size="xsmall" onClick={() => setMode('rest')}>Done</Button>
		: mode === 'naming' ? <Button variant="outline" size="xsmall" onMouseDown={ev => ev.preventDefault()} onClick={() => setMode('rest')}>Cancel</Button>
			: now && (!active || edited) ? <Button variant="outline" size="xsmall" onClick={() => setMode('naming')}>Save</Button>
				: <Button variant="outline" size="xsmall" onClick={() => setMode('editing')}>Edit</Button>
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
			<div className="sp-nav-list" {...reorder.list}>
				<Announce>{reorder.said}</Announce>
				{mode === 'editing'
					? <NavItem variant="light" icon="receipt" current={onList && !active && !now} trail={<span className="sp-meta">locked</span>}>All orders</NavItem>
					: <NavItem variant="light" icon="receipt" to={ALL_ORDERS} current={onList && !active && !now} count={count(answer.data?.all)}>All orders</NavItem>}
				{mode === 'naming' ? <ViewName count={matched} onSave={save} onCancel={() => setMode('rest')} /> : null}
				{reorder.items.map(view => (
					<Fragment key={view.id}>
						{reorder.lands(view) ? <Insertion /> : null}
						{renaming === view.id
							? <ViewName name={view.name} count={view.count} onSave={name => rename(view, name)} onCancel={() => setRenaming(null)} />
							: mode === 'editing'
								? (
									<NavItem variant={reorder.variant(view, active?.id === view.id && edited ? 'edited' : 'light')} handle={<Icon name="grip-vertical" size={12} />}
										handleLabel={`Reorder ${view.name}`} current={active?.id === view.id} {...reorder.row(view)}
										trail={<span className="sp-cell-menu"><ViewMenu view={view} onRename={() => setRenaming(view.id)} onDefault={() => makeDefault(view)} onDelete={() => setDeleting(view)} /></span>}>
										{view.name}
									</NavItem>
								)
								: (
									<NavItem variant={active?.id === view.id && edited ? 'edited' : 'light'} to={viewLink(view)} mark={<ViewMark query={view.query} />}
										current={active?.id === view.id} count={count(view.count)} countColor={view.attention ? 'warning' : undefined}
										title={active?.id === view.id && edited ? 'Changed since it was saved' : undefined}
										>{view.name}</NavItem>
								)}
					</Fragment>
				))}
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

/* A name typed where the view's row will stand (2g), beside how many orders it names: Enter saves, Escape
   or leaving cancels, an empty name is never saved. */
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
	const keys = ev => {
		if (ev.key === 'Enter') { ev.preventDefault(); commit() }
		if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done.current = true; onCancel() }
	}
	const leave = () => { if (!done.current) { done.current = true; onCancel() } }
	return (
		<div className="sp-field__wrap" onKeyDown={keys} onBlur={leave}>
			<span className="sp-field__lead"><Icon name="bookmark" size={14} /></span>
			<TextField inputRef={field} lead unit value={text} onChange={setText} placeholder="Name this view" aria-label="Name this view" maxLength={60} />
			{count != null ? <span className="sp-field__unit">{amount(count, 0)}</span> : null}
		</div>
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

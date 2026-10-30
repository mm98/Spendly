import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { FieldGroup } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Dialog, DialogActions, DialogBody, DialogTitle, Menu, MenuItem, MenuSeparator, useToast, Leaving } from '../components/Overlays.jsx'
import { NavItem } from '../components/Shell.jsx'
import { ReorderList } from '../components/Reorder.jsx'
import { useDismiss } from '../components/Utilities.jsx'
import { addView, changeView, deleteView, failureMessage, orderViewsAs } from '../api/client.js'
import { amount } from '../api/format.js'
import { ALL_ORDERS, ViewMark, canonical, useViews, viewCountColor, viewLink } from '../app/views.jsx'
import { usePhrase } from '../language/phrases.js'

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
	const phrase = usePhrase()
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
		.catch(e => fail(e, phrase('views.notSaved')))
	// both are reversible, so each is told in a toast with Undo (6d)
	const update = () => {
		const was = active.query
		changeView(active.id, { query: now })
			.then(() => {
				navigate(viewLink({ id: active.id, query: now }), { replace: true })
				toast({ message: phrase('views.updated', { name: active.name }), undo: { label: phrase('action.undo'), onClick: () => changeView(active.id, { query: was }).catch(e => fail(e, phrase('views.notBack'))) } })
			})
			.catch(e => fail(e, phrase('views.notChanged')))
	}
	const revert = () => navigate(viewLink(active), { replace: true })
	const rename = (view, name) => changeView(view.id, { name })
		.then(() => setRenaming(null))
		.catch(e => fail(e, phrase('views.notRenamed')))
	const makeDefault = view => {
		const before = views.find(v => v.isDefault)
		const back = () => (before ? changeView(before.id, { isDefault: true }) : changeView(view.id, { isDefault: false }))
		changeView(view.id, { isDefault: !view.isDefault })
			.then(() => toast({
				message: view.isDefault ? phrase('views.defaultAll') : phrase('views.defaultOn', { name: view.name }),
				undo: { label: phrase('action.undo'), onClick: () => back().catch(e => fail(e, phrase('views.thatNotBack'))) }
			}))
			.catch(e => fail(e, phrase('views.thatNotSaved')))
	}
	const highlight = view => changeView(view.id, { attention: !view.attention })
		.then(() => toast({
			message: phrase(view.attention ? 'views.unhighlighted' : 'views.highlighted', { name: view.name }),
			undo: { label: phrase('action.undo'), onClick: () => changeView(view.id, { attention: view.attention }).catch(e => fail(e, phrase('views.thatNotBack'))) }
		}))
		.catch(e => fail(e, phrase('views.thatNotSaved')))
	// the dialog closing is the confirmation, so no toast follows it (6d)
	const remove = view => deleteView(view.id)
		.then(() => { setDeleting(null); if (active?.id === view.id) navigate(ALL_ORDERS) })
		.catch(e => { setDeleting(null); fail(e, phrase('views.notDeleted')) })
	// reordering saves on drop (9e), and a save that fails puts the views back and says so (c1)
	const move = next => {
		setOrder(next)
		orderViewsAs(next.map(v => v.id)).catch(e => { setOrder(null); fail(e, phrase('views.orderNotSaved')) })
	}
	const shown = order ?? views

	// a new label is a new button, so a press that ends naming never lands on the Save that replaces Cancel
	const slot = mode === 'editing' ? { label: phrase('action.done'), onClick: () => setMode('rest') }
		: mode === 'naming' ? { label: phrase('action.cancel'), onClick: () => setMode('rest') }
			: now && (!active || edited) ? { label: phrase('action.save'), onClick: () => setMode('naming') }
				: { label: phrase('action.edit'), onClick: () => setMode('editing') }
	const count = n => (n == null ? undefined : amount(n, 0))

	return (
		<Card footerLayout="split" footerCommits
			footer={edited && mode === 'rest'
				? [<Button key="u" variant="outline" fullWidth onClick={update}>{phrase('views.update')}</Button>, <Button key="r" variant="outline" fullWidth onClick={revert}>{phrase('views.revert')}</Button>]
				: null}>
			<CardHeader name={phrase('views.title')} actionSize="xsmall" actions={[slot]} />
			{/* at rest the views are links; editing, they are rows to move, rename and delete (9e) */}
			<div className="sp-nav-list">
				{mode === 'editing'
					? <NavItem variant="light" icon="receipt" current={onList && !active && !now} trail={<span className="sp-meta">{phrase('views.locked')}</span>}>{phrase('views.allOrders')}</NavItem>
					: <NavItem variant="light" icon="receipt" to={ALL_ORDERS} current={onList && !active && !now} count={count(answer.data?.all)}>{phrase('views.allOrders')}</NavItem>}
				{mode === 'naming' ? <ViewName count={matched} onSave={save} onCancel={() => setMode('rest')} /> : null}
				{mode === 'editing'
					? (
						<ReorderList items={shown} keyOf={view => view.id} nameOf={view => view.name} onMove={move}>
							{view => (renaming === view.id
								? <ViewName name={view.name} count={view.count} onSave={name => rename(view, name)} onCancel={() => setRenaming(null)} />
								: (
									<NavItem variant={active?.id === view.id && edited ? 'edited' : 'light'} handle={<Icon name="grip-vertical" size={12} />}
										handleLabel={`Reorder ${view.name}`} current={active?.id === view.id}
										trail={<span className="sp-cell-menu"><ViewMenu view={view} onRename={() => setRenaming(view.id)} onDefault={() => makeDefault(view)} onHighlight={() => highlight(view)} onDelete={() => setDeleting(view)} /></span>}>
										{view.name}
									</NavItem>
								))}
						</ReorderList>
					)
					: shown.map(view => (renaming === view.id
						? <ViewName key={view.id} name={view.name} count={view.count} onSave={name => rename(view, name)} onCancel={() => setRenaming(null)} />
						: (
							<NavItem key={view.id} variant={active?.id === view.id && edited ? 'edited' : 'light'} to={viewLink(view)} mark={<ViewMark query={view.query} />}
								current={active?.id === view.id} count={count(view.count)} countColor={viewCountColor(view)}
								title={active?.id === view.id && edited ? phrase('views.changed') : undefined}
								>{view.name}</NavItem>
						)))}
			</div>
			{mode === 'naming' ? <span className="sp-meta">{summary}</span> : null}
			<Leaving>{deleting
				? (
					<Dialog onCancel={() => setDeleting(null)} aria-label={phrase('views.deleteTitle', { name: deleting.name })}>
						<div className="sp-stack sp-gap-12">
							<div className="sp-row-flex sp-gap-12">
								<Mark size="medium" aria-hidden="true" aria-label={phrase('action.delete')}><Icon name="trash" size={17} /></Mark>
								<DialogTitle>{phrase('views.deleteTitle', { name: deleting.name })}</DialogTitle>
							</div>
							<DialogBody>{phrase('views.deleteBody')}</DialogBody>
							<DialogActions>
								<Button variant="outline" fullWidth onClick={() => setDeleting(null)}>{phrase('action.keepIt')}</Button>
								<Button color="danger" fullWidth onClick={() => remove(deleting)}>{phrase('views.delete')}</Button>
							</DialogActions>
						</div>
					</Dialog>
				)
				: null}</Leaving>
		</Card>
	)
}

/* A name typed where the view's row will stand (2g), beside how many orders it names: Enter saves, Escape
   or moving to another control cancels, an empty name is never saved. */
function ViewName({ name = '', count, onSave, onCancel }) {
	const phrase = usePhrase()
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
	}
	// Escape, a press elsewhere or focus moving to another control cancels; a bare blur does not, since a phone
	// can drop focus from a field it has just opened
	const wrap = useRef(null)
	const leave = useCallback(() => { if (!done.current) { done.current = true; onCancel() } }, [onCancel])
	useDismiss(wrap, true, leave)
	return (
		<div ref={wrap} className="sp-field__wrap" onKeyDown={keys}>
			<span className="sp-field__lead"><Icon name="bookmark" size={14} /></span>
			<TextField inputRef={field} lead unit value={text} onChange={setText} placeholder={phrase('views.name')} aria-label={phrase('views.name')} maxLength={60} />
			{count != null ? <span className="sp-field__unit">{amount(count, 0)}</span> : null}
		</div>
	)
}

/* A saved view's own menu, in edit mode only (2g). */
function ViewMenu({ view, onRename, onDefault, onHighlight, onDelete }) {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" size="small" aria-label={phrase('statuses.actions', { name: view.name })} aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'}
				onClick={() => setOpen(!open)} />
			{open
				? (
					<Menu position="floating" aria-label={view.name}>
						<MenuItem icon="pencil" onClick={() => { close(); onRename() }}>{phrase('action.rename')}</MenuItem>
						<MenuItem icon="star" onClick={() => { close(); onDefault() }}>{phrase(view.isDefault ? 'views.stopDefault' : 'views.makeDefault')}</MenuItem>
						<MenuItem icon="alert-triangle" onClick={() => { close(); onHighlight() }}>{phrase(view.attention ? 'views.stopHighlight' : 'views.highlight')}</MenuItem>
						<MenuSeparator />
						<MenuItem icon="trash" danger onClick={() => { close(); onDelete() }}>{phrase('views.delete')}</MenuItem>
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
	const phrase = usePhrase()
	const answer = useViews().data
	const { active, now } = useActiveView(params)
	if (!answer) return null
	return (
		<FieldGroup facet legend={phrase('views.title')}>
			<div className="sp-nav-list">
				<NavItem variant="light" icon="receipt" to={ALL_ORDERS} onClick={onOpen} current={!active && !now} count={amount(answer.all, 0)}>{phrase('views.allOrders')}</NavItem>
				{answer.views.map(view => (
					<NavItem key={view.id} variant="light" to={viewLink(view)} onClick={onOpen} mark={<ViewMark query={view.query} />} current={active?.id === view.id}
						count={amount(view.count, 0)} countColor={viewCountColor(view)}>{view.name}</NavItem>
				))}
			</div>
		</FieldGroup>
	)
}
